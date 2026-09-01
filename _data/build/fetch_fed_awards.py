"""Award-level detail behind the routine federal flow: who gets the money, and for what.

WHAT IT ADDS. federal-money's spending_by_category pull (fetch_rest.py) knows the routine
federal polymer flow by industry code and county but not by party — the page's README
carried "recipient names behind the procurement peaks" as a known gap, and its Band 2
headline is a category "defined by what it is not". This pull closes the gap: one row per
prime CONTRACT award (award_type_codes A-D) with obligation activity in FY2019-FY2026, at
place of performance in the PIC-12 counties, NAICS 3251-3259, 3261, 3262.

WHAT ONE ROW IS. One prime award summary from USAspending spending_by_award: recipient
name, the award's TOTAL obligation ("Award Amount"), awarding agency and sub-agency,
NAICS code, period of performance, and USAspending's own award identifier.

BASIS WARNING — why this file must NEVER be summed with usaspending.json. "Award Amount"
is the award's whole-life obligation, not the slice that falls inside the window: an
award running 2014-2020 that the FY2019-FY2026 window matches carries every dollar since
2014, and an award still running will keep growing. spending_by_category rows are
per-fiscal-year slices of the same ledger. Same money, two bases; adding them, or adding
this file's total to federal.json's, double-counts by construction. derive_fed_awards.py
carries this into the page data's meta and a claim guards it on the page.

TRAPS, learned by probe (2026-09-01, re-verified at fetch time by assertion):
  - POST api.usaspending.gov/api/v2/search/spending_by_award/ — keyless.
  - naics_codes accepts 2-, 4- or 6-digit codes ONLY. The 3-digit "325"/"326" this
    site's category pull filters on client-side returns 422 here ("only supported for
    lengths of 2, 4, and 6"), hence the 4-digit list below.
  - Pagination: limit 100, walk `page` while page_metadata.hasNext. A probe pull stopped
    at 4,000 rows / 40 pages and had NOT exhausted; silent truncation is this repo's
    known failure mode (see SOURCES.json usaspending.filters.paging for the category
    pull's own cap), so this run goes to completion, asserts the probe floor, and
    records the true count in the meta.
"""
import json, os, time, urllib.request
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
from footprints import PIC12, META  # noqa: E402

OUT = os.path.join(HERE, "fed_awards.json")

URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
# Chemical (3251-3259) and plastics/rubber (3261, 3262) manufacturing, at the 4-digit
# level the endpoint accepts. Same industry scope as the category pull's client-side
# 325*/326* filter.
NAICS4 = ["3251", "3252", "3253", "3254", "3255", "3256", "3257", "3258", "3259",
          "3261", "3262"]
FY_FIRST, FY_LAST = 2019, 2026
FIELDS = ["Award ID", "Recipient Name", "Award Amount", "Description",
          "Contract Award Type", "Awarding Agency", "Awarding Sub Agency",
          "Start Date", "End Date", "NAICS", "generated_internal_id"]
# The probe of 2026-09-01 had 4,000 rows in hand at page 40 with hasNext still true.
# A refetch that lands under that floor is a narrowed pull, not a smaller world.
PROBE_FLOOR = 4000


def fetch_all():
    payload = {
        "filters": {
            # One spanning window, FY2019-FY2026 (the federal year runs Oct-Sep).
            # Awards are matched on obligation activity IN the window; their Award
            # Amount still counts dollars outside it. See BASIS WARNING above.
            "time_period": [{"start_date": f"{FY_FIRST - 1}-10-01",
                             "end_date": f"{FY_LAST}-09-30"}],
            "place_of_performance_locations": [
                {"country": "USA", "state": "OH", "county": c[2:]} for c in PIC12],
            "naics_codes": NAICS4,
            "award_type_codes": ["A", "B", "C", "D"],
        },
        "fields": FIELDS,
        "sort": "Award Amount", "order": "desc",
        "limit": 100, "page": 1, "subawards": False,
    }
    rows, page = [], 1
    while True:
        payload["page"] = page
        req = urllib.request.Request(URL, data=json.dumps(payload).encode(),
                                     headers={**UA, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=120) as r:
            d = json.loads(r.read().decode())
        got = d.get("results", [])
        meta = d.get("page_metadata", {})
        if not got and meta.get("hasNext"):
            raise SystemExit(f"FATAL: page {page} returned 0 rows with hasNext still "
                             f"true. A pull that goes quiet mid-walk is a failure, not "
                             f"an end.")
        rows.extend(got)
        if page % 10 == 0 or not meta.get("hasNext"):
            print(f"  page {page}: {len(rows)} rows so far", flush=True)
        if not meta.get("hasNext"):
            break
        page += 1
        if page > 500:
            raise SystemExit("FATAL: 500 pages and hasNext still true. Either the "
                             "filter broke open or the walk is looping; refusing to "
                             "write a file that claims to be complete.")
        time.sleep(0.5)
    return rows


def main():
    print("--- fed_awards ---", flush=True)
    rows = fetch_all()

    # THE EXTRACTOR REPORTS ITS OWN YIELD, against checks whose answers are known.
    # Keyset paging under a live ledger can repeat or drop a row at a page boundary;
    # a duplicate silently inflates a recipient total, so it is counted, not assumed.
    seen, dupes, out = set(), 0, []
    for r in rows:
        k = r.get("generated_internal_id") or r.get("internal_id")
        if k in seen:
            dupes += 1
            continue
        seen.add(k)
        naics = (r.get("NAICS") or {})
        out.append({
            "id": r.get("Award ID"),
            "usaspending_id": r.get("generated_internal_id"),
            "recipient": r.get("Recipient Name"),
            "amount": r.get("Award Amount"),
            "type": r.get("Contract Award Type"),
            "agency": r.get("Awarding Agency"),
            "sub_agency": r.get("Awarding Sub Agency"),
            "start": r.get("Start Date"), "end": r.get("End Date"),
            "naics": naics.get("code"), "naics_name": naics.get("description"),
            "description": r.get("Description"),
        })
    if dupes > len(rows) * 0.01:
        raise SystemExit(f"FATAL: {dupes} duplicate award ids across pages — the walk "
                         f"is re-reading, and totals built on it would double-count.")
    if len(out) < PROBE_FLOOR:
        raise SystemExit(f"FATAL: {len(out)} rows is under the probe-verified floor of "
                         f"{PROBE_FLOOR}. A shrunken pull must fail loudly, not publish "
                         f"a register that silently means something else.")
    bad = [r for r in out if not (r["naics"] or "").startswith(("325", "326"))]
    if bad:
        raise SystemExit(f"FATAL: {len(bad)} rows outside NAICS 325/326 — the server-side "
                         f"naics_codes filter did not do what the docstring says it does.")
    nulls = sum(1 for r in out if r["amount"] is None)
    if nulls:
        raise SystemExit(f"FATAL: {nulls} rows carry no Award Amount.")

    obj = {
        "meta": {
            "source": "USAspending.gov spending_by_award, place of performance",
            "row": "one prime contract award (award_type_codes A-D) with obligation "
                   "activity in FY2019-FY2026; Award Amount is the award’s WHOLE-LIFE "
                   "obligation, not the slice inside the window",
            "footprint": META["pic12"],
            "basis": "Award amounts are award-lifetime obligations and are NEVER summed "
                     "with the per-fiscal-year spending_by_category figures in "
                     "usaspending.json/federal.json. Same ledger, two bases.",
            "filters": {
                "time_period": f"{FY_FIRST - 1}-10-01 to {FY_LAST}-09-30",
                "naics_codes": NAICS4,
                "award_type_codes": ["A", "B", "C", "D"],
                "place_of_performance": "the 12 PIC-12 counties",
            },
            "fetched": date.today().isoformat(),
            "count": len(out), "pages_walked": True, "duplicates_dropped": dupes,
        },
        "rows": out,
    }
    json.dump(obj, open(OUT, "w", encoding="utf-8"), separators=(",", ":"))
    print(f"  saved fed_awards.json  {round(os.path.getsize(OUT)/1024)} KB  "
          f"{len(out)} awards  ({dupes} boundary duplicates dropped)", flush=True)


if __name__ == "__main__":
    main()
