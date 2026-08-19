"""Polymer and materials degrees conferred — three named institutions, Ohio, US, 1991–2023.

WHAT IT ADDS. `ipeds.json` (from `fetch_ipeds.py`) is every Ohio institution, ten CIP codes,
2012–2023, award levels UNLABELLED (see `derive_ipeds.py`: "AWARD LEVEL IS DELIBERATELY NOT
USED"). This file goes back to 1991 — the first year the API carries 6-digit CIP detail for
these codes — for the three institutions that ARE the regional polymer pipeline (Akron,
Kent State, Case Western), puts Ohio and US totals beside them from the same endpoint with
the same filters, and LABELS the award levels from the API's own codebook, fetched and
asserted at run time. Bachelor's, master's and doctorate are separable here.

WHAT ONE ROW IS. One (year, institution or geography, CIP-6, award level) count of DEGREES
CONFERRED, race and sex at their totals (race=99, sex=99). Not people: a double major
appears under majornum 1 and 2, so from 2000 on rows are first-major only. Not people who
stayed — IPEDS cannot see where a graduate goes.

THE CIP CODES, VERIFIED 2026-08-18 against the NCES CIP 2020 file
(https://nces.ed.gov/ipeds/cipcode/Files/CIPCode2020.csv), not guessed:
  14.3201  Polymer/Plastics Engineering                        polymer   (CWRU macromolecular)
  40.0507  Polymer Chemistry                                   polymer   (Akron polymer science)
  15.0607  Plastics and Polymer Engineering Technology/Tech.   polymer   (technician pipeline)
  14.1801  Materials Engineering                               materials
  40.1001  Materials Science                                   materials (NEW in CIP 2010)
  40.1002  Materials Chemistry                                 materials (NEW in CIP 2010)
`PIPELINES.md` §4 guessed 40.0507 and 14.3201; both are real. Two things the file corrected:
40.0510 is **Forensic** Chemistry, not materials chemistry (`fetch_ipeds.py` labels it
"Materials chemistry"; the real code is 40.1002), and neither 40.1001 nor 40.1002 existed
before CIP 2010, so their zeros through 2008 are a taxonomy artifact, not an absence of
graduates — before 2010 those programs reported under 14.1801 or a chemistry code.

THE EARLIER PROBE RETURNED NOTHING because it filtered `majornum=1` in a year before 2000, or
used a code that does not exist. `majornum` is NULL for every row before 2000 (IPEDS did not
distinguish first and second majors), so that filter returns zero rows for 1991–1999. This
file drops the filter for those years and applies it from 2000. And 2024 returns HTTP 500 as
of 2026-08-18: not loaded yet, not empty.

TRAPS.
  - **Award-level codes are the Urban API's, not IPEDS's.** 7 is Bachelor's, 9 is Master's,
    4 is Associate's; 20 is Doctor's until 2008 and 22/23/24 are Doctor's from 2007 (both
    appear in 2007–2008 — sum them). `fetch_ipeds.py` maps 7 to Master and 22 to Other,
    which is wrong; `derive_ipeds.py` already refuses to use those labels. The labels here
    come from `api-values/?format_name=award_level` and are re-asserted every run.
  - **Two ways to total, and they differ.** With `majornum=1` (2000+) a double major counts
    once; without it, twice. `meta.second_major_share_us_pct` records how much the filter
    removes nationally — small, but not zero.
  - **The `summaries` endpoint must be pinned to race=99&sex=99.** Its sum over the
    breakdown rows would triple-count. Validated here every run against the per-row sum
    for one (year, CIP), the same check `fetch_ipeds_national.py` runs.
  - **`year` is the API's label.** Urban's IPEDS convention is the fall of the academic year
    (2023 = awards conferred 2023-24); the JS-rendered documentation page could not be read
    headless to confirm, so say "IPEDS year 2023" rather than "the class of 2023".
  - **A code that returns zero everywhere is a bad code, not a finding.** 40.1001 before
    2009 is the live example. Every code here returns non-zero rows in at least one year.
"""
import collections
import json
import os
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "ipeds_cip.json")
BASE = "https://educationdata.urban.org/api/v1/college-university/ipeds"
from contact import UA  # noqa: E402  (one address, see contact.py)

# Verified against the NCES CIP 2020 file — see the docstring. Code -> (title, group).
CIP = {
    "143201": ("Polymer/Plastics Engineering", "polymer"),
    "400507": ("Polymer Chemistry", "polymer"),
    "150607": ("Plastics and Polymer Engineering Technology/Technician", "polymer"),
    "141801": ("Materials Engineering", "materials"),
    "401001": ("Materials Science", "materials"),
    "401002": ("Materials Chemistry", "materials"),
}
NEW_IN_CIP2010 = {"401001", "401002"}
INST = {200800: "University of Akron", 203517: "Kent State University",
        201645: "Case Western Reserve University"}
# CIP-6 detail for these codes begins in 1991 (probed 1983–1990: zero rows for every code
# and geography). 2024 is HTTP 500 as of 2026-08-18; probed each run and appended if it
# arrives, so the range does not silently freeze.
YEARS = list(range(1991, 2024))
FIRST_MAJORNUM_YEAR = 2000
# The Urban codebook, pinned. Re-asserted against api-values every run.
AWARD = {1: "Cert <1yr", 2: "Cert <2yr", 3: "Cert 1-2yr", 4: "Associate", 5: "Award 1-4yr",
         6: "Award 2-4yr", 7: "Bachelor", 8: "Post-bacc/post-master cert", 9: "Master",
         20: "Doctorate", 21: "First-professional", 22: "Doctorate", 23: "Doctorate",
         24: "Doctorate", 30: "Cert <12wk", 31: "Cert 12wk-1yr", 32: "Cert 1-2yr",
         33: "Cert 2-4yr"}
ASSERT_LABELS = {4: "Associate's degree", 7: "Bachelor's degree", 9: "Master's degree",
                 20: "Doctor's degree (until 2008)",
                 22: "Doctor's degree, research/scholarship (starting 2007)"}


def get(url, tries=3, quiet=False):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                        timeout=180) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 500 and quiet:
                return None  # a year that is not loaded yet
            if i == tries - 1:
                print(f"    HTTP {e.code} {url}", flush=True)
                return None
            time.sleep(2 + 3 * i)
        except Exception as e:
            if i == tries - 1:
                print(f"    {type(e).__name__}: {str(e)[:70]} {url}", flush=True)
                return None
            time.sleep(2 + 3 * i)


def mn(year):
    """The first-major filter, only where the field exists."""
    return "&majornum=1" if year >= FIRST_MAJORNUM_YEAR else ""


# --------------------------------------------- 0. the codebook, and the institutions
d = get("https://educationdata.urban.org/api/v1/api-values/?format=json&format_name=award_level")
labels = {r["code"]: r["code_label"] for r in (d or {}).get("results", [])}
for code, want in ASSERT_LABELS.items():
    got = labels.get(code, "")
    if not got.endswith(want):
        raise SystemExit(f"FATAL: award_level {code} is {got!r} in the API codebook, expected "
                         f"{want!r}. The AWARD map above is pinned to the 2026-08-18 codebook.")
print(f"codebook: {len(labels)} award_level codes, {len(ASSERT_LABELS)} pinned labels match")

d = get(f"{BASE}/directory/2023/?unitid={','.join(map(str, INST))}")
directory = {r["unitid"]: r for r in (d or {}).get("results", [])}
if set(directory) != set(INST):
    raise SystemExit(f"FATAL: directory returned {sorted(directory)}, wanted {sorted(INST)}")
for u, r in directory.items():
    print(f"  {u} {r['inst_name']} - {r.get('county_name')}")

# ------------------------------------------------- 1. institution rows, one call a year
cips = ",".join(CIP)
units = ",".join(map(str, INST))
rows = []


def inst_year(year, quiet=False):
    d = get(f"{BASE}/completions-cip-6/{year}/?unitid={units}&cipcode_6digit={cips}"
            f"&race=99&sex=99{mn(year)}", quiet=quiet)
    if d is None:
        return None
    if d.get("next"):
        raise SystemExit(f"FATAL: {year} paginated — the row loop assumes one page.")
    got = []
    for r in d.get("results", []):
        aw = r.get("awards_6digit")
        if not aw:
            continue
        cip = str(r["cipcode_6digit"])
        got.append({"year": year, "unitid": r["unitid"], "inst": INST[r["unitid"]],
                    "cip": cip, "label": CIP[cip][0], "group": CIP[cip][1],
                    "award_level": r["award_level"],
                    "award": AWARD.get(r["award_level"], f"level {r['award_level']}"),
                    "awards": aw})
    return got


print("institutions", flush=True)
for y in YEARS:
    got = inst_year(y)
    if got is None:
        raise SystemExit(f"FATAL: {y} failed for the institution pull.")
    rows.extend(got)
    time.sleep(0.15)
extra = inst_year(YEARS[-1] + 1, quiet=True)
if extra is not None:
    print(f"  NOTE: {YEARS[-1] + 1} is now served ({len(extra)} rows) — extend YEARS.")
    rows.extend(extra)
    YEARS.append(YEARS[-1] + 1)
print(f"  {len(rows)} institution rows")

# ---------------------------------------- 2. Ohio and US totals from the summaries endpoint
def summary(cip, fips=None, majornum=True):
    """awards by (year, award_level), race and sex at total."""
    u = (f"{BASE}/completions-cip-6/summaries?var=awards_6digit&stat=sum&by=year,award_level"
         f"&cipcode_6digit={cip}&race=99&sex=99" + ("&majornum=1" if majornum else "")
         + (f"&fips={fips}" if fips else ""))
    d = get(u)
    if d is None:
        raise SystemExit(f"FATAL: summaries failed for {cip} fips={fips} majornum={majornum}")
    return {(r["year"], r["award_level"]): r["awards_6digit"] or 0 for r in d["results"]}


print("totals", flush=True)
totals = {"ohio": [], "us": []}
second_major = collections.Counter()
for cip, (label, group) in CIP.items():
    for geo, fips in (("ohio", 39), ("us", None)):
        with_mn = summary(cip, fips, True)     # 2000+ only, since majornum is null before
        without = summary(cip, fips, False)    # every year, second majors included from 2000
        for (y, lvl), v in without.items():
            if y >= FIRST_MAJORNUM_YEAR:
                v1 = with_mn.get((y, lvl), 0)
                if geo == "us":
                    second_major["with"] += v1
                    second_major["without"] += v
                v = v1
            if v:
                totals[geo].append({"year": y, "geo": geo, "cip": cip, "label": label,
                                    "group": group, "award_level": lvl,
                                    "award": AWARD.get(lvl, f"level {lvl}"), "awards": v})
        time.sleep(0.15)
    print(f"  {cip} {label}: ohio {sum(t['awards'] for t in totals['ohio'] if t['cip']==cip):,}"
          f"  us {sum(t['awards'] for t in totals['us'] if t['cip']==cip):,}", flush=True)
sm_pct = round((1 - second_major["with"] / second_major["without"]) * 100, 2) \
    if second_major["without"] else None

# ------------------------------------------------------- 3. the checks this rests on
# (a) summaries vs per-row, one (year, CIP), the fetch_ipeds_national.py check re-run.
V_YEAR, V_CIP = 2023, "143201"
d = get(f"{BASE}/completions-cip-6/{V_YEAR}/?cipcode_6digit={V_CIP}&race=99&sex=99&majornum=1")
if d is None or d.get("next"):
    raise SystemExit("FATAL: validation pull failed or paginated.")
per_row = collections.Counter()
for r in d["results"]:
    per_row[r["award_level"]] += r.get("awards_6digit") or 0
per_row = {k: v for k, v in per_row.items() if v}  # a level with only zero rows is not a level
summ = {t["award_level"]: t["awards"] for t in totals["us"]
        if t["year"] == V_YEAR and t["cip"] == V_CIP}
if per_row != summ:
    raise SystemExit(f"FATAL: US {V_YEAR} CIP {V_CIP} summaries {summ} != per-row {per_row}. "
                     f"The summaries endpoint is no longer pinned to the total rows.")
print(f"  summaries == per-row for US {V_YEAR} {V_CIP}: {sum(per_row.values())} awards")

# (b) the institution rows agree with ipeds.json where the two overlap, level by level.
ip = os.path.join(HERE, "ipeds.json")
if os.path.exists(ip):
    prev = {(r["unitid"], r["year"], r["cip"], r["award_level"]): r["awards"]
            for r in json.load(open(ip, encoding="utf-8"))["rows"]
            if r["unitid"] in INST and r["cip"] in CIP}
    mine = {(r["unitid"], r["year"], r["cip"], r["award_level"]): r["awards"] for r in rows}
    bad = {k: (prev[k], mine.get(k)) for k in prev if mine.get(k) != prev[k]}
    if bad:
        raise SystemExit(f"FATAL: {len(bad)} points disagree with ipeds.json: "
                         f"{list(bad.items())[:5]}")
    print(f"  {len(prev)} points agree with ipeds.json")

# (c) every code returns something, somewhere. A dead code looks like zero graduates.
for cip in CIP:
    if not any(t["cip"] == cip for t in totals["us"]):
        raise SystemExit(f"FATAL: {cip} returned zero rows nationally in every year — a bad "
                         f"code, not a finding.")

# ---------------------------------------------------------------- 4. rollups and write
def roll(seq, keyf):
    c = collections.Counter()
    for r in seq:
        c[keyf(r)] += r["awards"]
    return c


by_inst_year = roll(rows, lambda r: (r["inst"], r["group"], r["year"]))
by_inst_award = roll(rows, lambda r: (r["inst"], r["group"], r["award"], r["year"]))
by_geo_year = {g: roll(totals[g], lambda r: (r["group"], r["year"])) for g in totals}
by_geo_award = {g: roll(totals[g], lambda r: (r["group"], r["award"], r["year"]))
                for g in totals}


def nest(counter):
    out = {}
    for k, v in counter.items():
        d = out
        for part in k[:-1]:
            d = d.setdefault(str(part), {})
        d[str(k[-1])] = v
    return out


three_polymer = collections.Counter()
for (inst, grp, y), v in by_inst_year.items():
    if grp == "polymer":
        three_polymer[y] += v
share = {str(y): {"three_inst": three_polymer[y],
                  "ohio": by_geo_year["ohio"][("polymer", y)],
                  "us": by_geo_year["us"][("polymer", y)],
                  "three_of_ohio_pct": round(three_polymer[y] / by_geo_year["ohio"][("polymer", y)] * 100, 1)
                  if by_geo_year["ohio"][("polymer", y)] else None,
                  "three_of_us_pct": round(three_polymer[y] / by_geo_year["us"][("polymer", y)] * 100, 1)
                  if by_geo_year["us"][("polymer", y)] else None}
         for y in YEARS}

out = {"meta": {
    "source": "IPEDS completions by 6-digit CIP, via the Urban Institute Education Data API",
    "url": f"{BASE}/completions-cip-6/{{year}}/  and  .../completions-cip-6/summaries",
    "row": "one (year, institution or geography, CIP-6, award level) count of DEGREES "
           "CONFERRED, race=99 and sex=99 (totals). First major only from 2000; majornum "
           "is null before 2000 so no filter is possible there.",
    "not": "not people who stayed, not job-seekers, not hires. Production, not supply.",
    "cip_verified_against": "NCES CIP 2020, https://nces.ed.gov/ipeds/cipcode/Files/CIPCode2020.csv",
    "cips": [{"code": c, "title": t, "group": g, "new_in_cip2010": c in NEW_IN_CIP2010}
             for c, (t, g) in CIP.items()],
    "cip_correction": "40.0510 is Forensic Chemistry (fetch_ipeds.py labels it Materials "
                      "chemistry); Materials Chemistry is 40.1002.",
    "institutions": {str(u): {"name": n, "ipeds_name": directory[u]["inst_name"],
                              "county": directory[u].get("county_name")}
                     for u, n in INST.items()},
    "years": [YEARS[0], YEARS[-1]],
    "years_note": "CIP-6 detail for these codes begins 1991; 2024 was HTTP 500 (not loaded) "
                  "on 2026-08-18. `year` is the API's label — Urban's IPEDS convention is the "
                  "fall of the academic year.",
    "award_levels": {str(k): v for k, v in AWARD.items()},
    "award_levels_source": "Urban API codebook, api-values/?format_name=award_level, "
                           "re-asserted each run. 20 (until 2008) and 22/23/24 (from 2007) "
                           "overlap in 2007-2008; both are Doctorate here.",
    "second_major_share_us_pct": sm_pct,
    "checks": {"summaries_equal_per_row": f"US {V_YEAR} CIP {V_CIP}",
               "agrees_with_ipeds_json_points": len(prev) if os.path.exists(ip) else None},
    "counts": {"institution_rows": len(rows), "ohio_rows": len(totals["ohio"]),
               "us_rows": len(totals["us"])},
    "fetched": time.strftime("%Y-%m-%d")},
    "rows": rows,
    "totals": totals,
    "by_institution_year": nest(by_inst_year),
    "by_institution_award_year": nest(by_inst_award),
    "by_geo_year": {g: nest(c) for g, c in by_geo_year.items()},
    "by_geo_award_year": {g: nest(c) for g, c in by_geo_award.items()},
    "polymer_share": share}
json.dump(out, open(OUT, "w", encoding="utf-8"), separators=(",", ":"))

print(f"\nwrote {OUT}  {round(os.path.getsize(OUT)/1024)} KB  "
      f"{len(rows)} institution rows, {len(totals['ohio'])} Ohio, {len(totals['us'])} US")
picks = [y for y in (1991, 1995, 2000, 2005, 2010, 2016, 2020, 2023) if y in YEARS]
print("polymer-group degrees (14.3201 + 40.0507 + 15.0607), all award levels")
for inst in INST.values():
    print(f"  {inst:32s}" + "  ".join(f"{y}:{by_inst_year[(inst, 'polymer', y)]:>3}" for y in picks))
print(f"  {'Ohio':32s}" + "  ".join(f"{y}:{by_geo_year['ohio'][('polymer', y)]:>3}" for y in picks))
print(f"  {'United States':32s}" + "  ".join(f"{y}:{by_geo_year['us'][('polymer', y)]:>3}" for y in picks))
print(f"  three institutions as % of US: " + "  ".join(
    f"{y}:{share[str(y)]['three_of_us_pct']}" for y in picks))
print("materials-group degrees (14.1801 + 40.1001 + 40.1002)")
for inst in INST.values():
    print(f"  {inst:32s}" + "  ".join(f"{y}:{by_inst_year[(inst, 'materials', y)]:>3}" for y in picks))
print(f"  {'United States':32s}" + "  ".join(f"{y}:{by_geo_year['us'][('materials', y)]:>3}" for y in picks))
print(f"  second-major share removed by majornum=1, US 2000+: {sm_pct}%")
