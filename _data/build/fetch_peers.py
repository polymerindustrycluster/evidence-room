"""National QCEW: every US area, for the polymer NAICS.

The by-industry endpoint returns all areas for one industry-year, which is what makes a
peer comparison possible at all. The critical field is `disclosure_code` — 227 of 382
metros are withheld for NAICS 326, including Chicago, New York and Atlanta. A ranking
that ignores that is wrong, so suppression is carried through as a first-class value and
the establishment count (disclosed far more often than employment) comes with it.
"""
import csv, io, json, os, time, urllib.request, urllib.error, collections

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
NAICS = {"325": "Chemical manufacturing", "3252": "Resin, synthetic rubber & fibers",
         "3255": "Paint, coating & adhesive", "326": "Plastics & rubber products",
         "3261": "Plastics products", "3262": "Rubber products"}
CROSS_YEAR = 2024                      # latest year with a full national cross-section
TREND = ["326", "3262"]                # the two that carry the regional story
TREND_YEARS = list(range(2015, 2026))


def fetch(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
            return r.read().decode("utf-8", "replace")
    except Exception as e:
        print(f"    {type(e).__name__}: {str(e)[:80]}", flush=True)
        return None


def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def rows_from(txt, year, naics):
    out = []
    for r in csv.DictReader(io.StringIO(txt)):
        if r["own_code"] != "5":          # private sector only, matching the LQ numerator
            continue
        a = r["area_fips"]
        kind = ("metro" if a.startswith("C") else
                "state" if a.endswith("000") and len(a) == 5 else
                "national" if a.startswith("US") else "county")
        out.append({
            "year": year, "naics": naics, "area": a, "kind": kind,
            "emp": num(r["annual_avg_emplvl"]), "estabs": num(r["annual_avg_estabs"]),
            "wage": num(r["annual_avg_wkly_wage"]), "lq": num(r["lq_annual_avg_emplvl"]),
            # 'N' = BLS will not release it. Establishments usually survive; employment often does not.
            "suppressed": (r["disclosure_code"] or "").strip() == "N",
        })
    return out


rows = []
jobs = [(CROSS_YEAR, n) for n in NAICS] + \
       [(y, n) for n in TREND for y in TREND_YEARS if not (y == CROSS_YEAR and n in NAICS)]
for year, naics in jobs:
    txt = fetch(f"https://data.bls.gov/cew/data/api/{year}/a/industry/{naics}.csv")
    if not txt:
        print(f"  {year} {naics}: not published", flush=True); continue
    got = rows_from(txt, year, naics)
    rows += got
    print(f"  {year} {naics}: {len(got)} rows "
          f"({sum(1 for r in got if r['suppressed'])} suppressed)", flush=True)
    time.sleep(0.4)

titles = {}
txt = fetch("https://data.bls.gov/cew/doc/titles/area/area_titles.csv")
if txt:
    titles = {r["area_fips"]: r["area_title"]
              for r in csv.DictReader(io.StringIO(txt))}

out = {"meta": {
    "source": "BLS QCEW open data, by-industry files, annual averages",
    "url": "https://data.bls.gov/cew/data/api/{year}/a/industry/{naics}.csv",
    "row": "one (year, area, NAICS) annual-average cell, private ownership. `emp` counts "
           "JOBS covered by unemployment insurance.",
    "cross_year": CROSS_YEAR, "trend_naics": TREND, "trend_years": TREND_YEARS,
    "suppression": "disclosure_code 'N' → suppressed:true. Employment is withheld far more "
                   "often than establishment counts, so a ranking on employment alone "
                   "systematically omits the largest metros. Any rank stated from this file "
                   "is a rank AMONG DISCLOSED AREAS and must say so.",
    "fetched": "2026-08-14"},
  "titles": titles, "rows": rows}
p = os.path.join(HERE, "peers.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"\nwrote {p}  {round(os.path.getsize(p)/1024)} KB  {len(rows)} rows")
c = collections.Counter((r["kind"], r["suppressed"]) for r in rows if r["year"] == CROSS_YEAR)
for k in ("metro", "county", "state", "national"):
    print(f"  {CROSS_YEAR} {k:9s} disclosed {c[(k, False)]:5d}  suppressed {c[(k, True)]:5d}")
