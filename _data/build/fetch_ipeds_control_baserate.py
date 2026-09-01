# -*- coding: utf-8 -*-
"""The base rate's missing control: what share of PEER TRADE programs start tiny and brief.

WHAT IT ADDS. The programs page publishes two different comparisons and only one of them
had a control. The SURVIVAL comparison has had one since 2026-08-26 (six peer technician
CIPs, same rule, same years: 27% polymer against 48% control). The BASE RATE - 57% of all
168 polymer technician programs ever started conferred ten or fewer completions, 45% were
both tiny and brief - stood alone with no denominator but itself, and a reader had no way
to know whether "half of new starts fail" is a fact about polymer or a fact about American
technician programs. It is a fact about polymer: the same six trades, pulled with the same
rule and the same un-thresholded population, run 23% tiny, 34% brief and 19% both. Polymer
technician programs start-and-fail at about 2.5 times the rate of the trades taught in the
same buildings.

  python3 _data/build/fetch_ipeds_control_baserate.py            fetch, verify, write
  python3 _data/build/fetch_ipeds_control_baserate.py --check    verify only, write nothing

WHAT ONE ROW IS. One (CIP-6, institution, canonicalised award level) at associate or
certificate level, with a completions count for every year it conferred, 1991-2023. A
PROGRAM, not a year and not a graduate: it is counted once no matter how long it ran, and
it is enumerated from the union of all years, because a program with no completions in a
given year is invisible in that year. `tiny` is ten or fewer completions across that whole
life; `brief` is a first-to-last span of five years or less; `both` is the conjunction, not
the union. Identical to the definitions the polymer side of the page already uses - that
identity is the entire point, and a change to one without the other kills the comparison.

WHY IT IS UN-THRESHOLDED, WHICH IS THE OPPOSITE OF THE SURVIVAL CONTROL. The survival
comparison counts only substantive programs (more than ten lifetime completions), because
asking whether a program that conferred four people ever "survived" is not a question. The
base rate counts EVERY start with no threshold, because the thing being measured is how
often a start turns into nothing - and thresholding on size would throw away exactly the
population the number is about. Two controls, two populations, one source pull. Do not
quote the 6,685 here against the 6,648 in `layers.control`: see TRAPS.

TRAPS.
  - **The two control figures are pulled the same way and still do not match to the unit.**
    This file reproduces the page's published survival control - 48% - to the point, on
    6,685 substantive programs ever against the page's 6,648, and 3,178 still conferring
    against 3,185 (0.6% and 0.2%). The rule is identical; the pull is not the same pull.
    The shipped figure came from the sibling census's `fetch_control_cips.py` on 2026-08-21
    and this one from the live API in 2026-09-01, and the Urban mirror restates back years.
    The reproduction is what licenses the base-rate numbers here; it is NOT a second
    opinion on 6,648, and the page keeps the census figure for survival so that one number
    has one producer. If this ever drifts past a point of survival rate, the two sides have
    stopped being the same measurement and the comparison must come down.
  - **The C2023_A hole runs one way, and it makes 57% and 45% UPPER bounds.** The mirror
    served three collection years late and then skipped `C2023_A` entirely
    (`ipeds_mirror_fix.py`); the programs page is named there as still carrying it. A
    missing year of completions can only make a lifetime total SMALLER, so it can only push
    programs INTO the "ten or fewer" bucket, never out of it. Every share of tiny programs
    on this page - polymer's 57% and 45%, this control's 23% and 19% - is therefore an
    upper bound on the true share. The hole is in the same mirror on BOTH sides, so the
    RATIO between them is far more robust than either level, which is the reason the page
    now leads with the ratio.
  - **2020 is dropped before anything is counted**, on both sides (`ipeds_quarantine`).
    Leaving it in counts 2019 twice inside every lifetime total and pushes programs back
    across the ten-award line - it moved the polymer both-at-once rate 43% to 45%.
  - **Certificate award levels must be canonicalised across the bureau's 2020 renumbering
    BEFORE programs are keyed**, or one continuous certificate becomes two programs, one
    that "ended" and one that "started". That is what made the control survive at 35%
    instead of 48% until 2026-08-26, and it inflates an un-thresholded base rate worse than
    it inflates a survival rate, because both halves of the split land in the tiny bucket.
  - **`majornum` is NULL before 2000.** Filtering on it in an earlier year returns nothing
    at all rather than everything, which reads as six dead CIP codes.
  - **A per-CIP spread this wide is a finding, not noise.** Welding is 14% tiny and
    Manufacturing Engineering Technology 41%, so the pooled 23% is not a property every
    trade shares. Quote the pooled figure with the range, or someone will pick the trade
    that makes their case.
"""
import collections
import json
import os
import sys
import time
import urllib.request

import ipeds_quarantine as QZ
from contact import UA

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(HERE, "ipeds_control_baserate.json")
PAGE = os.path.join(WEB, "programs", "data", "viz-data.json")
BASE = "https://educationdata.urban.org/api/v1/college-university/ipeds/completions-cip-6"
YEARS = range(1991, 2024)
CHECK = "--check" in sys.argv

# The bureau renumbered certificate award levels in 2020: 30 and 31 are the old 1, 32 the
# old 3, 33 the old 2. Canonicalise BEFORE keying a program or it splits in two.
CANON = {30: 1, 31: 1, 32: 3, 33: 2}
LEVELS = {1: "certificate", 2: "certificate", 3: "certificate", 4: "associate",
          5: "certificate", 6: "certificate", 7: "bachelor", 8: "postgrad certificate",
          9: "master", 20: "doctorate", 21: "doctorate", 22: "doctorate",
          23: "doctorate", 24: "doctorate"}
TECH = {"associate", "certificate"}
SUBSTANTIVE = 10          # strictly greater than, the page's constant
TINY_MAX = 10             # ten or fewer completions over the whole life
BRIEF_MAX = 5             # first-to-last span of five years or less
ACTIVE_YEAR = 2023

# The page's own published control figures, read back and reproduced rather than retyped.
page = json.load(open(PAGE, encoding="utf-8"))
CIPS = dict(page["layers"]["control"]["cips"])
PUB = page["layers"]["control"]
POLY = page["base"]
TOL_PCT_POINTS = 1        # the survival rate must reproduce to the point, not the count


def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                        timeout=180) as r:
                return json.load(r)
        except Exception as e:
            if i == tries - 1:
                print(f"    FAILED {url}: {e}")
                return None
            time.sleep(2 + 3 * i)


# ------------------------------------------------------------------- the pull
programs = collections.defaultdict(dict)     # (cip, unitid, level) -> {year: awards}
for cip in CIPS:
    got = 0
    for y in YEARS:
        mn = "&majornum=1" if y >= 2000 else ""      # NULL before 2000; see TRAPS
        url = f"{BASE}/{y}/?cipcode_6digit={cip}&race=99&sex=99{mn}"
        while url:
            d = get(url)
            if d is None:
                break
            for r in d["results"]:
                a = r.get("awards_6digit") or 0
                if not a:
                    continue
                lvl = CANON.get(r["award_level"], r["award_level"])
                programs[(cip, r["unitid"], lvl)].setdefault(y, 0)
                programs[(cip, r["unitid"], lvl)][y] += a
                got += a
            url = d.get("next")
    print(f"  {cip} {CIPS[cip]:44s} {got:>7,} awards", flush=True)

if not programs:
    sys.exit("no rows returned: the endpoint moved, or the CIP list is wrong. "
             "A silent zero here would publish a control of nothing.")

# --------------------------------------------------------------- the counting
rows = []
for (cip, unitid, lvl), years in programs.items():
    if LEVELS.get(lvl) not in TECH:
        continue
    y = QZ.drop_keys(years)                  # 2020 out before any total is taken
    if not y:
        continue
    rows.append({"cip": cip, "total": sum(y.values()),
                 "span": max(y) - min(y) + 1, "active": max(y) == ACTIVE_YEAR})

pct = lambda n, d: round(100 * n / d)


def summarise(rs):
    tiny = sum(1 for r in rs if r["total"] <= TINY_MAX)
    brief = sum(1 for r in rs if r["span"] <= BRIEF_MAX)
    both = sum(1 for r in rs if r["total"] <= TINY_MAX and r["span"] <= BRIEF_MAX)
    return {"ever": len(rs), "le10_awards": tiny, "le5_years": brief, "both": both,
            "le10_awards_pct": pct(tiny, len(rs)), "le5_years_pct": pct(brief, len(rs)),
            "both_pct": pct(both, len(rs))}


control = summarise(rows)
sub = [r for r in rows if r["total"] > SUBSTANTIVE]
repro = {"substantive_ever": len(sub),
         "substantive_still": sum(1 for r in sub if r["active"]),
         "survive_pct": pct(sum(1 for r in sub if r["active"]), len(sub))}

control["per_cip"] = {CIPS[c]: summarise([r for r in rows if r["cip"] == c])
                      for c in CIPS}
control["ratio_le10"] = round(POLY["le10_awards_pct"] / control["le10_awards_pct"], 2)
control["ratio_both"] = round(POLY["both_pct"] / control["both_pct"], 2)
control["rule"] = (f"all associate and certificate programs under the six peer trade CIPs, "
                   f"no size threshold; tiny = {TINY_MAX} or fewer lifetime completions, "
                   f"brief = a run of {BRIEF_MAX} years or less, both = the conjunction; "
                   f"certificate levels canonicalised across the 2020 renumbering and "
                   f"{sorted(QZ.QUARANTINED)[0]} dropped, exactly as on the polymer side")
control["bound"] = ("upper bound on both sides: the mirror never served the C2023_A "
                    "collection year, and a missing year of completions can only push a "
                    "program into the tiny bucket, never out of it")
control["reproduces"] = {
    "published_survive_pct": PUB["survive_pct"], "refetched_survive_pct": repro["survive_pct"],
    "published_ever": PUB["ever"], "refetched_ever": repro["substantive_ever"],
    "published_still": PUB["still"], "refetched_still": repro["substantive_still"],
    "note": "same rule, different pull dates (census 2026-08-21, this file live); the rate "
            "reproduces to the point, the counts to within 0.6%. The page keeps the census "
            "figure for survival so one number has one producer."}

# ------------------------------------- verify the verifier, before anything is written
print(f"\nreproduction of the page's published survival control")
print(f"  survive_pct  published {PUB['survive_pct']}   refetched {repro['survive_pct']}")
print(f"  ever         published {PUB['ever']:,}   refetched {repro['substantive_ever']:,}"
      f"   ({abs(repro['substantive_ever'] - PUB['ever']) / PUB['ever'] * 100:.1f}%)")
print(f"  still        published {PUB['still']:,}   refetched {repro['substantive_still']:,}"
      f"   ({abs(repro['substantive_still'] - PUB['still']) / PUB['still'] * 100:.1f}%)")
if abs(repro["survive_pct"] - PUB["survive_pct"]) > TOL_PCT_POINTS:
    sys.exit(f"\nSTOP. The survival control does not reproduce "
             f"({repro['survive_pct']}% against the published {PUB['survive_pct']}%). "
             f"The two sides of the comparison are no longer the same measurement, and "
             f"nothing derived from this pull should ship until that is understood.")

print(f"\nthe un-thresholded base rate, {control['ever']:,} peer-trade programs since 1991")
for k, lab in (("le10_awards", "ten or fewer completions"), ("le5_years", "five years or less"),
               ("both", "both at once")):
    print(f"  {lab:26s} {control[k]:>6,}  {control[k + '_pct']:>3}%   "
          f"polymer {POLY[k + '_pct']}%")
print(f"  ratio, tiny        polymer {POLY['le10_awards_pct']}% / control "
      f"{control['le10_awards_pct']}% = {control['ratio_le10']}x")
print(f"  ratio, both        polymer {POLY['both_pct']}% / control "
      f"{control['both_pct']}% = {control['ratio_both']}x")
print("  per CIP: " + ", ".join(
    f"{n} {v['le10_awards_pct']}%/{v['both_pct']}%" for n, v in control["per_cip"].items()))

if CHECK:
    print("\n--check: nothing written")
    sys.exit(0)

# ------------------------------------------------------------------- the write
raw = {"meta": {
    "source": "IPEDS completions by 6-digit CIP, via the Urban Institute Education Data API",
    "url": f"{BASE}/{{year}}/?cipcode_6digit={{cip}}&race=99&sex=99&majornum=1",
    "row": "one (CIP-6, institution, canonicalised award level) associate or certificate "
           "program, with a completions count for every year it conferred, 1991-2023",
    "cips": CIPS,
    "rule": control["rule"],
    "bound": control["bound"],
    "quarantined": {str(y): w for y, w in QZ.QUARANTINED.items()},
    "reproduces": control["reproduces"],
    "fetched": time.strftime("%Y-%m-%d")},
    "control_base": {k: v for k, v in control.items()},
    "substantive_reproduction": repro,
    "programs": rows}
json.dump(raw, open(OUT, "w", encoding="utf-8"), separators=(",", ":"))
print(f"\nwrote {OUT}  {round(os.path.getsize(OUT) / 1024)} KB")

# Merged into the page file rather than re-derived through `derive_programs.py`, for the
# reason `quarantine_patch.py` argues at length: that deriver reads a sibling checkout
# (`polymer-programs-db`) which is not in this repository, so a rebuild here would mean
# reverse-engineering the census to add one block. Idempotent: re-running overwrites the
# same key with the same shape and touches nothing else.
page["layers"]["control"]["base"] = control
json.dump(page, open(PAGE, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"wrote layers.control.base into {PAGE}")
