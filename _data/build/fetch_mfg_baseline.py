"""The manufacturing baseline: is the polymer premium a polymer story or a factory story?

THE GAP, found by four independent reviewers on three different pages: this site compares
polymer pay to the ALL-JOBS county average, retail and food service included, so a reader
cannot tell whether polymer pays a premium or whether every factory in town does. The
comparator that answers it is manufacturing as a whole, NAICS 31-33, from the same census
on the same basis: own_code 5, annual averages, same counties, same year.

Also fetched here: the national NAICS 326 employment trend, because cluster-health reports
three falling years without saying whether the national industry fell too (the same
place-vs-industry gap, fourth page).

Same-source discipline: every number in this file is QCEW, data.bls.gov, keyless. The
sector rung is agglvl 74 in a county file; whatever the US000 file uses for the same rung
is DERIVED from the file rather than assumed, for the reason the sources page teaches:
the state file taught us the rungs are numbered per geography.
"""
import csv
import io
import json
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
from footprints import PIC12  # noqa: E402

YEAR = 2025
TREND_YEARS = [2022, 2023, 2024, 2025]


def rows(area, year):
    url = f"https://data.bls.gov/cew/data/api/{year}/a/area/{area}.csv"
    with urllib.request.urlopen(url, timeout=60) as r:
        return list(csv.DictReader(io.StringIO(r.read().decode("utf-8"))))


def pick(rs, industry, own="5"):
    hit = [r for r in rs if r["industry_code"] == industry and r["own_code"] == own
           and r.get("disclosure_code") != "N"]
    if len(hit) > 1:  # same industry can appear at more than one agglvl in theory
        hit = sorted(hit, key=lambda r: r["agglvl_code"])[:1]
    return hit[0] if hit else None


mfg = {}
for fips, name in sorted(PIC12.items(), key=lambda kv: kv[1]):
    rs = rows(fips, YEAR)
    m = pick(rs, "31-33")
    a = pick(rs, "10", own="0")
    mfg[name] = {
        "fips": fips,
        "mfg_weekly_wage": int(m["annual_avg_wkly_wage"]) if m else None,
        "mfg_emp": int(m["annual_avg_emplvl"]) if m else None,
        "all_weekly_wage": int(a["annual_avg_wkly_wage"]) if a else None,
    }
    print(f"  {name:10} mfg ${mfg[name]['mfg_weekly_wage'] or '?'}/wk on "
          f"{mfg[name]['mfg_emp'] or '?'} jobs, all-industry "
          f"${mfg[name]['all_weekly_wage'] or '?'}/wk")

# National 326 employment, per year, for the tide question. The sector/3-digit rung code
# in US000 is not assumed: filter on industry and ownership only, then verify exactly one
# row came back, which also catches a rung renumbering loudly.
tide = []
us_mfg_wage = None
for y in TREND_YEARS:
    rs = rows("US000", y)
    r326 = [r for r in rs if r["industry_code"] == "326" and r["own_code"] == "5"
            and r.get("disclosure_code") != "N"]
    if len(r326) != 1:
        raise SystemExit(f"US000 {y}: expected one NAICS 326 private row, got {len(r326)}")
    tide.append({"year": y, "us_326_emp": int(r326[0]["annual_avg_emplvl"])})
    if y == YEAR:
        rm = [r for r in rs if r["industry_code"] == "31-33" and r["own_code"] == "5"]
        us_mfg_wage = int(rm[0]["annual_avg_wkly_wage"]) if rm else None
    print(f"  US 326 {y}: {tide[-1]['us_326_emp']:,}")

out = {
    "meta": {
        "source": "BLS QCEW annual averages, data.bls.gov, fetched live; own_code 5 for "
                  "industries, own_code 0 for the all-industry county totals",
        "year": YEAR,
        "row": "one county: private manufacturing (NAICS 31-33) average weekly wage and "
               "employment, beside the county all-ownership all-industry average wage.",
        "why": "The pay pages compare polymer to the ALL-JOBS average, which cannot "
               "separate a polymer premium from a factory premium. Manufacturing as a "
               "whole is the comparator that separates them.",
    },
    "counties": mfg,
    "us_mfg_weekly_wage": us_mfg_wage,
    "national_326_trend": tide,
}
p = os.path.join(WEB, "wages", "data", "mfg.json")
json.dump(out, open(p, "w", encoding="utf-8"), indent=1)
print(f"\nwrote {p}")
