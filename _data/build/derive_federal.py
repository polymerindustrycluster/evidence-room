"""Build only federal-money from complete private raw pulls, without touching other pages."""
import argparse
import collections
import json
import math
from pathlib import Path
from footprints import META
from fetch_federal_cpi import annual_rows
from federal_categories import validate_receipts
from fetch_fed_contracts import GROUPS

CPI_BASE = 2025
FOOTPRINT = "pic12"


def reconciliation_note(residual):
    if residual == 0:
        return "The separately queried award-type groups equal the unfiltered nominal total."
    comparison = (f"fall ${residual:,.2f} short of the unfiltered nominal total" if residual > 0
                  else f"exceed the unfiltered nominal total by ${abs(residual):,.2f}")
    return (f"The separately queried award-type groups {comparison}. This unresolved difference is not "
            "assigned to an award type.")


def validate_pagination(doc, contracts):
    if contracts:
        totals = doc["award_type_totals"]
        if set(totals) != set(GROUPS) | {"all"}:
            raise ValueError("Missing or unexpected cached award-type total")
        for group, value in totals.items():
            if type(value) not in (int, float) or not math.isfinite(value):
                raise ValueError(f"Invalid cached award-type total: {group}")
    records = doc.get("pagination", [])
    walks, expected_rows = {}, {}
    for record in records:
        fy, category = record["fy"], record["category"]
        codes = record.get("award_type_codes")
        receipts = record.get("receipts", [])
        rows = validate_receipts(category, fy, codes, receipts)
        if (record["pages"] != len(receipts) or record["rows"] != len(rows)
                or record["terminal"] != receipts[-1]["page_metadata"]):
            raise ValueError("Pagination summary disagrees with retained source pages")
        key = (fy, category, tuple(codes or []))
        if key in walks and walks[key] != rows:
            raise ValueError("Repeated query changed its result within the cached pull")
        walks[key] = rows
        if not contracts or codes == GROUPS["contracts"]:
            for row in rows:
                code = str(row["code"] or "")
                if category == "naics" and not code.startswith(("325", "326")):
                    continue
                expected_rows[(fy, category, code)] = {
                    "fy": fy, "kind": category, "code": code,
                    "name": row["name"], "amount": row["amount"]}
    if contracts:
        query_types = [("naics", tuple(GROUPS["contracts"]))] + [
            ("county", tuple(codes)) for codes in GROUPS.values()] + [("county", ())]
    else:
        query_types = [("naics", ()), ("county", ())]
    expected_walks = {(fy, category, codes) for fy in range(2019, 2027)
                      for category, codes in query_types}
    if set(walks) != expected_walks:
        raise ValueError("Missing or unexpected fiscal-year/category/award-type query")
    keys = [(r["fy"], r["kind"], r["code"]) for r in doc["rows"]]
    if len(keys) != len(set(keys)):
        raise ValueError("Duplicate category rows in raw pull")
    if any(type(r.get("amount")) not in (int, float) or not math.isfinite(r["amount"])
           or r["fy"] not in range(2019, 2027) or r["kind"] not in ("naics", "county")
           for r in doc["rows"]):
        raise ValueError("Invalid cached obligation row")
    if {key: row for key, row in zip(keys, doc["rows"])} != expected_rows:
        raise ValueError("Cached category rows do not reproduce retained source pages")
    if contracts:
        for group, codes in list(GROUPS.items()) + [("all", [])]:
            total = sum(r["amount"] for fy in range(2019, 2027)
                        for r in walks[(fy, "county", tuple(codes))])
            if abs(total - doc["award_type_totals"][group]) > 0.01:
                raise ValueError(f"Award-type total does not reproduce source pages: {group}")


def derive(raw_dir):
    load = lambda name: json.loads((Path(raw_dir) / name).read_text(encoding="utf-8"))
    cpi_doc = load("federal_cpi.json")
    if cpi_doc["rows"] != annual_rows(load("cpi-bls-response.json")):
        raise ValueError("CPI annual values do not reproduce the monthly source observations")
    research = []
    for award in ("2532460", "2330145"):
        records = load(f"nsf-{award}.json")["response"]["award"]
        if len(records) != 1 or records[0]["id"] != award:
            raise ValueError(f"Unexpected NSF award record: {award}")
        record = records[0]
        research.append({"id": award, "estimated_total": int(record["estimatedTotalAmt"]),
                         "obligated": int(record["fundsObligatedAmt"]),
                         "end_date": record["expDate"],
                         "source_url": f"https://api.nsf.gov/services/v1/awards/{award}.json"})
    CPI = {r["year"]: r["cpi"] for r in cpi_doc["rows"]}
    for year in range(2019, 2026):
        if year not in CPI or CPI[year] <= 0:
            raise ValueError(f"Missing valid CPI for {year}")
    CPI[2026] = CPI[CPI_BASE]
    def real(value, year):
        return value * CPI[CPI_BASE] / CPI[year]

    us = load("usaspending.json")["rows"]
    fc = load("usaspending_contracts.json")
    validate_pagination(load("usaspending.json"), contracts=False)
    validate_pagination(fc, contracts=True)
    by_fy_naics = collections.defaultdict(float)
    by_fy_county = collections.defaultdict(float)
    names = {}
    for r in [r for r in us if r["kind"] == "county"] + [r for r in fc["rows"] if r["kind"] == "naics"]:
        if r["amount"] is None:
            continue
        if r["kind"] == "naics":
            by_fy_naics[(r["fy"], r["code"])] += r["amount"]
            names[r["code"]] = r["name"]
        else:
            by_fy_county[(r["fy"], r["name"])] += r["amount"]

    # THE COMPARATOR, ON ONE BASIS. The county rows above carry no award-type filter, so they
    # are every federal instrument there is; the NAICS rows beside them are procurement. The
    # page divided one by the other and published the quotient as a contracting ratio, which
    # was wrong by a factor of about thirty. fetch_fed_contracts.py pulls both series again
    # with award_type_codes A-D, so the ratio the page prints has a contracting numerator over
    # a contracting denominator. Both series live here; neither replaces the all-type rows,
    # which the page still needs to say what the old denominator was made of.
    ct_county = collections.defaultdict(float)
    ct_naics = collections.defaultdict(float)
    for r in fc["rows"]:
        if r["amount"] is None:
            continue
        (ct_naics if r["kind"] == "naics" else ct_county)[r["fy"]] += r["amount"]
    _num = sum(real(v, fy) for fy, v in ct_naics.items())
    _den = sum(real(v, fy) for fy, v in ct_county.items())
    totals = fc["award_type_totals"]
    residual = totals["all"] - sum(v for k, v in totals.items() if k != "all")
    # Coarse unit/filter tripwire only. fed-contract-scope guards the printed 1-in-29 value.
    if not _num or not _den or not (10 < _den / _num < 100):
        raise SystemExit(f"FATAL: the contracting ratio is {_den / _num if _num else 'n/a'}, "
                         f"outside the 10-to-100 band this page's prose is written against. "
                         f"A comparator that has moved by an order of magnitude needs a human "
                         f"reading it, not a rebuild that publishes it.")
    return {
        "meta": {"source": "USAspending.gov spending_by_category, place of performance",
                 "row": "one (fiscal year, category, code) signed transaction obligation total",
                 "fetched": fc["meta"]["fetched"],
                 "note": "NAICS rows are prime contracts only (award types A-D), exhaustively paginated. Signed obligations retain de-obligations. Calendar-year CPI approximates fiscal-year prices; FY2026 is carried at the 2025 index. The 2025 index averages eleven published months because October was unavailable.",
                 "footprint": META[FOOTPRINT],
                 "scope": f"Obligations at place of performance in the {META[FOOTPRINT]['n']} "
                          f"{META[FOOTPRINT]['label']} counties. NAICS rows are filtered to 325* "
                          "and 326*, chemical and plastics/rubber. County rows are ALL "
                          "industries and are an order of magnitude larger; the two are shown "
                          "separately and never summed.",
                 "caution": "Place of performance is a REPORTED FIELD on the award, not an "
                            "observation of where work happened: a centrally administered "
                            "contract or a prime performing through a subaward can put the code "
                            "somewhere other than the activity. An obligation is not an outlay.",
                 "excludes": "Research grants are excluded by this view’s prime-contract award-type "
                             "filter (A-D). Contract NAICS classifies the supplies or services acquired; "
                             "a university’s identity does not determine that code. The view also filters "
                             "to 325*/326* manufacturing codes and reported PIC-12 place of performance. "
                             "An awardee address does not establish manufacturing activity in PIC-12. "
                             "The NSF NEO-SMART Engine "
                             "($14,999,983 estimated, $7,499,984 obligated) and TARDISS do not "
                             "appear in the NAICS rows. The all-type county view can include "
                             "research grants when their reported performance location is within the footprint.",
                 "comparator": "The county rows carry no award-type filter and are therefore "
                               "every federal instrument: contracts, grants, loans, direct "
                               "payments and other financial assistance. They are not a "
                               "contracting figure and must never be the denominator under a "
                               "contracting numerator. The contracts block does that job."},
        "inflation": "Dollars from different years are not the same dollars. Every row "
                     "carries BOTH the nominal obligation and the same figure restated in "
                     f"{CPI_BASE} dollars using BLS CPI-U annual averages. Any total spanning "
                     "more than one year must use the real column; the nominal one is kept so "
                     "a reader can reconcile against USAspending itself.",
        "cpi_base": CPI_BASE, "cpi": CPI,
        "research_awards": research,
        "cpi_observations": cpi_doc,
        "pagination": {label: [{k: v for k, v in r.items() if k != "receipts"} for r in records]
                       for label, records in (("all", load("usaspending.json")["pagination"]),
                                              ("contracts", fc["pagination"]))},
        "naics": [{"fy": fy, "code": c, "name": names.get(c, c), "amount": round(v),
                   "real": round(real(v, fy))}
                  for (fy, c), v in sorted(by_fy_naics.items())],
        "counties": [{"fy": fy, "county": c, "amount": round(v),
                      "real": round(real(v, fy))}
                     for (fy, c), v in sorted(by_fy_county.items())],
        "contracts": {
            "meta": {**fc["meta"],
                     "why": "PRIME CONTRACTING ONLY, award_type_codes A-D, so the polymer "
                            "numerator and the all-industry denominator are the same kind of "
                            "money. Same CPI-U restatement as every other total on this page.",
                     "vintage": "The NAICS chart and this comparison use the same complete prime-contract pull. All-type county context was acquired separately on the same date.",
                     "note": reconciliation_note(residual)},
            "unallocated_nominal": round(residual, 2),
            "award_type_totals": fc["award_type_totals"],
            "counties": [{"fy": fy, "amount": round(v), "real": round(real(v, fy))}
                         for fy, v in sorted(ct_county.items())],
            "naics": [{"fy": fy, "amount": round(v), "real": round(real(v, fy))}
                      for fy, v in sorted(ct_naics.items())]}}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", required=True)
    parser.add_argument("--output", default=str(Path(__file__).resolve().parents[2] / "federal-money/data/federal.json"))
    args = parser.parse_args()
    result = derive(args.raw_dir)
    Path(args.output).write_text(json.dumps(result, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}: {len(result['naics'])} NAICS-year rows")
