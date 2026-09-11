"""Known missing-after-page-one regression, plus fail-closed pagination checks."""
import copy
import json
import unittest
from federal_categories import fetch_categories, validate_receipts
from fetch_federal_cpi import annual_rows
from derive_federal import validate_pagination, reconciliation_note
from fetch_fed_contracts import GROUPS


def response(page, rows, more=False):
    return {"category": "naics", "spending_level": "transactions", "limit": 100,
        "page_metadata": {"page": page, "next": page + 1 if more else None, "hasNext": more},
        "results": rows}


class CategoriesTest(unittest.TestCase):
    def test_residual_note_distinguishes_shortfall_overage_and_equality(self):
        self.assertIn("fall $1.25 short of", reconciliation_note(1.25))
        self.assertIn("exceed the unfiltered nominal total by $1.25", reconciliation_note(-1.25))
        self.assertNotIn("$-", reconciliation_note(-1.25))
        self.assertEqual(reconciliation_note(0),
                         "The separately queried award-type groups equal the unfiltered nominal total.")

    def setUp(self):
        self.pages = [response(1, [{"code": str(400000+i), "name": "Other", "amount": 10}
                                  for i in range(100)], True),
            response(2, [{"code": "326211", "name": "Tires", "amount": 1175828.84},
                         {"code": "325520", "name": "Adhesives", "amount": -100}])]

    def fetch(self, pages):
        return fetch_categories("naics", 2023,
            request=lambda url, payload: json.dumps(pages[payload["page"]-1]).encode())

    def test_old_page_one_misses_tires_and_new_walk_preserves_signed_obligations(self):
        old = [r for r in self.pages[0]["results"] if r["code"].startswith(("325", "326"))]
        self.assertEqual(old, [])  # The old extraction cannot satisfy the known case.
        rows, receipts = self.fetch(self.pages)
        polymer = [r for r in rows if r["code"].startswith(("325", "326"))]
        self.assertEqual(sum(r["amount"] for r in polymer), 1175728.84)
        self.assertEqual(len(receipts), 2)
        self.assertFalse(receipts[-1]["page_metadata"]["hasNext"])

    def test_malformed_pagination_and_rows_fail(self):
        mutations = [lambda d: d.pop("page_metadata"),
            lambda d: d["page_metadata"].update(hasNext="false"),
            lambda d: d["page_metadata"].update(next=1),
            lambda d: d["page_metadata"].update(page=2),
            lambda d: d["results"].pop(),
            lambda d: d["results"][0].update(amount=None),
            lambda d: d.update(spending_level="awards")]
        for mutate in mutations:
            pages = copy.deepcopy(self.pages)
            mutate(pages[0])
            with self.subTest(mutation=mutate), self.assertRaises(ValueError):
                self.fetch(pages)

    def test_duplicate_page_and_missing_terminal_pointer_fail(self):
        for mutate in [lambda d: d["results"][0].update(code="400000"),
                       lambda d: d["page_metadata"].pop("next")]:
            pages = copy.deepcopy(self.pages)
            mutate(pages[1])
            with self.assertRaises(ValueError):
                self.fetch(pages)

    def test_cached_walk_rejects_missing_pages_counts_filters_and_changed_bytes(self):
        rows, receipts = self.fetch(self.pages)
        self.assertEqual(validate_receipts("naics", 2023, None, receipts), rows)
        mutations = [lambda rs: rs.pop(0),
                     lambda rs: rs[0].update(row_count=99),
                     lambda rs: rs[0]["request"]["filters"].update(award_type_codes=["02"]),
                     lambda rs: rs[0]["request"]["filters"]["time_period"][0].update(end_date="2024-09-30"),
                     lambda rs: rs[0]["request"]["filters"]["place_of_performance_locations"].pop(),
                     lambda rs: rs[0].update(response_text=rs[0]["response_text"] + " ")]
        for mutate in mutations:
            damaged = copy.deepcopy(receipts)
            mutate(damaged)
            with self.subTest(mutation=mutate), self.assertRaises(ValueError):
                validate_receipts("naics", 2023, None, damaged)

    def test_production_derivation_rejects_inconsistent_pagination_summary(self):
        rows, receipts = self.fetch(self.pages)
        record = {"fy": 2023, "category": "naics", "pages": 2, "rows": len(rows),
                  "terminal": receipts[-1]["page_metadata"], "receipts": receipts}
        for field, wrong in (("pages", 1), ("rows", 100)):
            damaged = copy.deepcopy(record)
            damaged[field] = wrong
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "summary"):
                validate_pagination({"pagination": [damaged], "rows": []}, contracts=False)

    def test_cached_award_totals_reject_nonfinite_and_nonnumeric_values(self):
        for group in [*GROUPS, "all"]:
            for invalid in (float("nan"), float("inf"), -float("inf"), True, False, None, "1"):
                totals = dict.fromkeys([*GROUPS, "all"], 0)
                totals[group] = invalid
                with self.subTest(group=group, value=invalid):
                    with self.assertRaisesRegex(ValueError, "Invalid cached award-type total"):
                        validate_pagination({"award_type_totals": totals}, contracts=True)

    def test_cpi_omitted_month_is_not_a_zero_or_a_twelfth_observation(self):
        observations = [{"year": str(y), "period": f"M{m:02}",
                         "value": "-" if y == 2025 and m == 10 else "120"}
                        for y in range(2019, 2026) for m in range(1, 13)]
        data = {"status": "REQUEST_SUCCEEDED", "Results": {"series": [
            {"seriesID": "CUUR0000SA0", "data": observations}]}}
        last = annual_rows(data)[-1]
        self.assertEqual((last["months"], last["cpi"]), (11, 120))
        self.assertNotIn("M10", last["periods"])
        observations.pop()
        with self.assertRaises(ValueError):
            annual_rows(data)


if __name__ == "__main__":
    unittest.main()
