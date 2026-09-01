"""The COMPARATOR the federal-money page needs: contracting against contracting.

WHY THIS FILE EXISTS. federal-money's Band 2 set the size of the polymer flow against
"every industry in these twelve counties", a figure taken from fetch_rest.py's
spending_by_category county pull. That pull carries NO award_type_codes filter, so its
county rows are every federal award type there is: contracts, grants, loans, direct
payments and other financial assistance. The polymer numerator beside it is NAICS
325*/326* work, which in practice is procurement. The page divided a contracting
numerator by an all-instruments denominator and published the quotient as a contracting
ratio. Direct payments and other financial assistance are 85% of that denominator, and
they are Social Security, Medicare and veterans' benefits: not contracting at all, not
comparable to a purchase order, and not something a polymer plant could ever have won.
The published ratio was wrong by a factor of about thirty, in the direction that made the
cluster look smaller.

WHAT THIS PULLS. The same endpoint, the same footprint, the same fiscal years, with the
award-type filter the comparison always needed:
  - county rows, award_type_codes A-D, one row per (fiscal year, county): prime
    contracting of every industry in the twelve counties;
  - NAICS rows, award_type_codes A-D, filtered client-side to 325*/326*: the polymer
    numerator on the SAME basis as its own denominator;
  - and the six award-type groups of the all-types county total, so the page can say what
    the old denominator was actually made of rather than merely warning it was wrong.

TRAPS, learned by probe (2026-09-01):
  - POST api.usaspending.gov/api/v2/search/spending_by_category/{county,naics}/ — keyless.
  - award_type_codes on spending_by_award must come from ONE group and 422s otherwise.
    spending_by_category does NOT enforce that; a mixed list is accepted silently. Each
    group is therefore pulled on its own and summed here, where the arithmetic is visible.
  - This endpoint takes no naics_codes filter at these lengths; ask for the NAICS category
    and filter client-side, the same shape fetch_rest.py uses.
  - THE GROUPS MUST RECONCILE. Six disjoint groups pulled separately have to add back to
    the unfiltered total; if they do not, either a code is missing from the taxonomy or a
    filter is not doing what it says. That check runs on every fetch and is fatal.
"""
import json, os, sys, time, urllib.request
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from contact import UA  # noqa: E402  (one address, see contact.py)
from footprints import PIC12, META  # noqa: E402

OUT = os.path.join(HERE, "usaspending_contracts.json")
URL = "https://api.usaspending.gov/api/v2/search/spending_by_category/%s/"
FY_FIRST, FY_LAST = 2019, 2026

# USAspending's own award-type taxonomy, split into the groups its award search enforces.
# "direct" is direct payments and "other" is other financial assistance; together they are
# the benefit spending that made the old denominator meaningless as a contracting figure.
GROUPS = {
    "contracts": ["A", "B", "C", "D"],
    "idv": ["IDV_A", "IDV_B", "IDV_B_A", "IDV_B_B", "IDV_B_C", "IDV_C", "IDV_D", "IDV_E"],
    "grants": ["02", "03", "04", "05"],
    "loans": ["07", "08"],
    "direct": ["06", "10"],
    "other": ["09", "11"],
}
NEO = {c[2:]: n for c, n in PIC12.items()}


def ask(cat, fy, codes):
    payload = {"filters": {
        "time_period": [{"start_date": f"{fy - 1}-10-01", "end_date": f"{fy}-09-30"}],
        "place_of_performance_locations": [
            {"country": "USA", "state": "OH", "county": c} for c in NEO]},
        "limit": 100}
    if codes:
        payload["filters"]["award_type_codes"] = codes
    req = urllib.request.Request(URL % cat, data=json.dumps(payload).encode(),
                                 headers={**UA, "Content-Type": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read().decode()).get("results", [])
        except Exception as e:
            print(f"  retry {cat} FY{fy}: {type(e).__name__}: {e}", flush=True)
            time.sleep(4)
    raise SystemExit(f"FATAL: {cat} FY{fy} did not answer in four attempts. A pull that "
                     f"gives up quietly publishes a smaller world as if it were the world.")


def main():
    print("--- fed_contracts ---", flush=True)
    rows, totals = [], {}
    for fy in range(FY_FIRST, FY_LAST + 1):
        for o in ask("county", fy, GROUPS["contracts"]):
            rows.append({"fy": fy, "kind": "county", "code": str(o.get("code") or ""),
                         "name": o.get("name"), "amount": o.get("amount")})
        for o in ask("naics", fy, GROUPS["contracts"]):
            code = str(o.get("code") or "")
            if not (code.startswith("325") or code.startswith("326")):
                continue
            rows.append({"fy": fy, "kind": "naics", "code": code,
                         "name": o.get("name"), "amount": o.get("amount")})
        time.sleep(0.5)
        print(f"  FY{fy}: {sum(1 for r in rows if r['fy'] == fy)} rows", flush=True)

    # THE DECOMPOSITION, and the check that it is one. Six disjoint groups plus the
    # unfiltered total: the groups have to add back to it.
    for g, codes in list(GROUPS.items()) + [("all", None)]:
        t = 0.0
        for fy in range(FY_FIRST, FY_LAST + 1):
            t += sum(o.get("amount") or 0 for o in ask("county", fy, codes))
            time.sleep(0.4)
        totals[g] = t
        print(f"  {g:10s} {t:>18,.0f}", flush=True)
    parts = sum(v for g, v in totals.items() if g != "all")
    if totals["all"] <= 0 or abs(parts - totals["all"]) / totals["all"] > 0.005:
        raise SystemExit(f"FATAL: the six award-type groups sum to {parts:,.0f} against an "
                         f"unfiltered total of {totals['all']:,.0f}. Either a type code is "
                         f"missing from the taxonomy above or a filter is not filtering; "
                         f"a decomposition that does not reconcile must not be published.")
    if not rows or not any(r["kind"] == "naics" for r in rows):
        raise SystemExit("FATAL: no NAICS 325*/326* contract rows came back. The "
                         "client-side filter or the category shape has changed.")

    json.dump({"meta": {
        "source": "USAspending.gov spending_by_category, place of performance, "
                  "award_type_codes A-D",
        "row": "one (fiscal year, category, code) PRIME CONTRACT obligation total",
        "footprint": META["pic12"],
        "why": "the contracting denominator for a contracting numerator",
        "filters": {"time_period": f"{FY_FIRST - 1}-10-01 to {FY_LAST}-09-30",
                    "award_type_codes": GROUPS["contracts"],
                    "place_of_performance": "the 12 PIC-12 counties"},
        "fetched": date.today().isoformat()},
        "award_type_totals": {g: round(v) for g, v in totals.items()},
        "rows": rows}, open(OUT, "w", encoding="utf-8"), separators=(",", ":"))
    print(f"  saved usaspending_contracts.json  {round(os.path.getsize(OUT)/1024)} KB  "
          f"{len(rows)} rows", flush=True)


if __name__ == "__main__":
    main()
