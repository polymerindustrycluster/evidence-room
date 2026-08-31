"""County Business Patterns with employment-size classes — a region of shops or of plants?

WHAT IT ADDS. QCEW gives jobs and establishment counts at county x 326 but no size
distribution. This gives the SHAPE: how many of the region's polymer establishments are
under five employees versus over a hundred. That distinction decides which intervention
works — supplier development aimed at 20 small shops is a different program from workforce
training aimed at three large plants.

`PIPELINES.md` recorded that `EMPSZES` "only returns All establishments." That was the
QUERY, not the source: `EMPSZES` must be requested as a **get variable**, not as a filter.
Requested correctly, 2022 CBP returns the full size breakdown at county x NAICS.

WHAT ONE ROW IS. One (county, NAICS, employment-size class) cell. The class `001` is
"All establishments" and is the TOTAL, not another bin — summing 001 with the classes
double-counts every establishment.

THE SIZE-CLASS ROWS CARRY NO EMPLOYMENT, AND THAT IS DELIBERATE. Every row except `001`
returns `EMP=0` with flag `EMP_F='N'`. Establishment counts by size are publishable;
employment inside each bin is withheld. So this file supports "how many establishments of
each size" and NEVER "how many people work in the small ones." An assertion below fails the
build if a size-class row ever arrives with nonzero employment, because that would mean the
disclosure rule changed and the zeros could no longer be read as suppression.

THE CLASSES DO NOT ALWAYS SUM TO THE TOTAL, MEASURED. Cuyahoga 326 in 2022: six classes
summing to exactly 56 against an All row of 56. Summit 326: seven classes summing to **72
against an All row of 74**. Two establishments sit in a bin Census does not publish for that
cell — almost certainly the largest, since suppression bites hardest where the count is
small. The residual is computed per cell and carried as `unpublished_bin`, so a size chart
cannot silently drop the biggest plants in the county.

REGISTER. `3252 + 3255 + 326`, per `PIPELINES.md` section 6 — not all of 325, which sweeps in
pharma, agricultural chemicals, industrial gas and explosives. Note that CBP discloses this
register at county grain, and even at 6-digit; that is finer than QCEW, where 4-digit is
suppressed somewhere in the footprint. The register still governs what may be summed.
"""
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "cbp.json")
from contact import UA  # noqa: E402  (one address, see contact.py)

PIC12 = {"007": "Ashtabula", "035": "Cuyahoga", "055": "Geauga", "085": "Lake",
         "093": "Lorain", "099": "Mahoning", "103": "Medina", "133": "Portage",
         "151": "Stark", "153": "Summit", "155": "Trumbull", "169": "Wayne"}
REGISTER = ["3252", "3255", "326"]
VARS = "NAME,ESTAB,EMP,PAYANN,EMP_F,ESTAB_F,PAYANN_F,EMPSZES,EMPSZES_LABEL"
ALL_CLASS = "001"

KEY = ""
for line in open(os.path.expanduser("~/.env"), encoding="utf-8", errors="ignore"):
    if line.startswith("CENSUS_API_KEY="):
        KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
if not KEY:
    raise SystemExit("FATAL: CENSUS_API_KEY not in ~/.env")


def get(year, naics, county):
    p = {"get": VARS, "for": f"county:{county}", "in": "state:39",
         "NAICS2017": naics, "key": KEY}
    url = f"https://api.census.gov/data/{year}/cbp?" + urllib.parse.urlencode(p)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                        timeout=90) as r:
                body = r.read()
                if not body.strip():
                    return []                      # 204: cell not published
                d = json.loads(body)
                return [dict(zip(d[0], row)) for row in d[1:]]
        except urllib.error.HTTPError as e:
            if e.code in (204, 404):
                return []
            if attempt == 2:
                raise SystemExit(f"FATAL: {year} {naics} county {county}: HTTP {e.code}")
            time.sleep(2 * (attempt + 1))
        except Exception as e:
            if attempt == 2:
                raise SystemExit(f"FATAL: {year} {naics} county {county}: {e}")
            time.sleep(2 * (attempt + 1))


# BOTH vintages. 2022 is the year the 2026-08-17 source hunt measured (Summit 326 = 74
# establishments), so it doubles as a regression check on the query; 2023 is the latest and is
# what a page should quote. A single "latest" probe silently moved the sentinel and tripped the
# guard on the first run — which is the guard working, but the fix is to pin both, not to
# loosen the assertion.
YEARS = [y for y in (2022, 2023) if get(y, "326", "153")]
if not YEARS:
    raise SystemExit("FATAL: neither 2022 nor 2023 CBP returns Summit NAICS 326.")
print(f"CBP vintages in use: {YEARS}")
VERIFIED = {2022: 74}          # measured by hand 2026-08-17; 2023 has no verified point yet


def num(rec, field):
    flag = (rec.get(field + "_F") or "").strip() or None
    try:
        return int(rec.get(field)), flag
    except (TypeError, ValueError):
        return None, flag or "unparsed"


cells, residuals, suppressed = [], [], []
for YEAR in YEARS:
  for naics in REGISTER:
    for fips, county in PIC12.items():
        rows = get(YEAR, naics, fips)
        time.sleep(0.12)
        if not rows:
            continue
        allrow = next((r for r in rows if r.get("EMPSZES") == ALL_CLASS), None)
        classes = [r for r in rows if r.get("EMPSZES") != ALL_CLASS]

        # If a size-class row ever carries employment, the disclosure rule changed and the
        # zeros elsewhere can no longer be read as suppression. Fail rather than average it in.
        for c in classes:
            emp, flag = num(c, "EMP")
            if emp not in (0, None) and flag != "N":
                raise SystemExit(
                    f"FATAL: {county} {naics} size class {c['EMPSZES']} reports EMP={emp} "
                    f"with flag {flag!r}. Size-class employment has always been withheld "
                    f"(EMP=0, EMP_F='N'); if it is now published, this file's central "
                    f"assumption is void and every 'shape only' caveat must be revisited.")

        tot_estab, tot_flag = num(allrow, "ESTAB") if allrow else (None, "missing")
        tot_emp, emp_flag = num(allrow, "EMP") if allrow else (None, "missing")
        cls_sum = sum(num(c, "ESTAB")[0] or 0 for c in classes)
        resid = (tot_estab - cls_sum) if tot_estab is not None else None
        if resid:
            residuals.append({"year": YEAR, "county": county, "naics": naics, "all": tot_estab,
                              "classes_sum": cls_sum, "unpublished_bin": resid})
        if emp_flag and emp_flag != "N":
            suppressed.append(f"{county} {naics} EMP flag {emp_flag}")

        cells.append({
            "year": YEAR,
            "county": county, "fips": "39" + fips, "naics": naics,
            "estab_total": tot_estab, "estab_total_flag": tot_flag,
            "emp_total": tot_emp, "emp_total_flag": emp_flag,
            "payann_total": num(allrow, "PAYANN")[0] if allrow else None,
            "unpublished_bin": resid,
            "classes": [{"szes": c["EMPSZES"], "label": c["EMPSZES_LABEL"],
                         "estab": num(c, "ESTAB")[0]} for c in classes],
        })
    print(f"  {YEAR} NAICS {naics}: "
          f"{sum(1 for c in cells if c['naics']==naics and c['year']==YEAR)} counties", flush=True)

if not cells:
    raise SystemExit("FATAL: zero cells. EMPSZES must be a GET variable, not a filter.")
for y in YEARS:
    sm = next((c for c in cells if c["county"] == "Summit" and c["naics"] == "326"
               and c["year"] == y), None)
    if not sm or not sm["estab_total"]:
        raise SystemExit(f"FATAL: no Summit NAICS 326 establishment count for {y}.")
    if y in VERIFIED and sm["estab_total"] != VERIFIED[y]:
        raise SystemExit(f"FATAL: Summit 326 {y} = {sm['estab_total']}, verified {VERIFIED[y]} "
                         f"by hand on 2026-08-17. The query or the vintage changed.")
    if not 40 <= sm["estab_total"] <= 120:
        raise SystemExit(f"FATAL: Summit 326 {y} = {sm['estab_total']}, outside a plausible "
                         f"band for the largest polymer county in the footprint.")

# Region shape: only bins Census publishes for every county can be summed across counties.
region = {}
LATEST = max(YEARS)
for c in cells:
    if c["naics"] != "326" or c["year"] != LATEST:
        continue
    for k in c["classes"]:
        e = region.setdefault(k["szes"], {"label": k["label"], "estab": 0, "counties": 0})
        e["estab"] += k["estab"] or 0
        e["counties"] += 1

out = {"meta": {
    "source": f"Census County Business Patterns {YEAR}, county x NAICS x employment-size class",
    "row": "one (county, NAICS, size class) cell. Class 001 is the TOTAL, not a bin — "
           "summing it with the classes double-counts every establishment.",
    "size_classes_carry_no_employment":
        "Every class except 001 returns EMP=0 with flag 'N'. Establishment counts by size are "
        "publishable; employment inside each bin is withheld. This file supports 'how many "
        "establishments of each size' and never 'how many people work in the small ones'.",
    "classes_do_not_always_sum":
        "Measured: Cuyahoga 326 classes sum to 56 against an All row of 56; Summit 326 sum to "
        "72 against 74. The residual is carried per cell as unpublished_bin so a size chart "
        "cannot silently drop the largest plants.",
    "register": "3252 + 3255 + 326 per PIPELINES.md section 6, not all of 325. CBP discloses "
                "this register at county grain and even at 6-digit, which is finer than QCEW.",
    "empszes_is_a_get_variable": "requesting it as a filter returns only the All row, which is "
                                 "what PIPELINES.md recorded as a property of the source",
    "footprint": {"key": "pic12", "n": 12, "label": "PIC-12",
                  "counties": sorted(PIC12.values())},
    "vintages": YEARS, "latest": LATEST,
    "verified_points": VERIFIED,
    "cells": len(cells),
    "residuals": residuals,
    "other_suppression": suppressed,
    "fetched": time.strftime("%Y-%m-%d")},
    "region_326_shape": dict(sorted(region.items())),
    "cells": cells}
json.dump(out, open(OUT, "w", encoding="utf-8"), indent=1)

print(f"\nPIC-12 NAICS 326 establishment shape, {YEAR}:")
tot = sum(v["estab"] for v in region.values())
for k, v in sorted(region.items()):
    print(f"   {v['estab']:>4}  ({v['estab']/tot*100:>4.1f}%)  {v['label'][:52]}")
print(f"   {tot:>4}          published in a size bin")
print(f"   {sum(r['unpublished_bin'] for r in residuals if r['naics']=='326' and r['year']==LATEST):>4}"
      f"          in a bin Census does NOT publish for that county")
print(f"\n{len(residuals)} cells have an unpublished bin; {len(cells)} cells written")
print(f"wrote {OUT}")
