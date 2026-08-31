"""Derive the location-quotient dataset from the QCEW pull.

WHAT A ROW IS
  One (year, area, NAICS) cell of BLS Quarterly Census of Employment and Wages,
  annual average. `emp` counts JOBS covered by unemployment insurance, not people
  and not companies — it never reconciles with the vault's company counts.

THE DEFINITION, VERIFIED NOT ASSUMED
  LQ = (local private employment in NAICS / local TOTAL-all-ownership employment)
     / (national private employment in NAICS / national TOTAL-all-ownership employment)

  The denominator is own_code 0 (all ownerships), NOT own_code 5 (private). That was
  established empirically against BLS's own published `lq_annual_avg_emplvl`:
  own 5/0 reproduces it to MAE 0.0026 (max 0.005) across 348 cells; the intuitive
  5/5 is off by 0.19 on average and by as much as 1.03. Every LQ this file emits is
  checked against the published figure and carries the residual.

SUPPRESSION
  disclosure_code 'N' means BLS will not release the cell. It is carried through as
  suppressed=true with value null — never zero, never interpolated.
"""
import json, os, collections
from footprints import PIC12, META

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "qcew.json")
OUT = os.path.join(HERE, "..", "..", "location-quotient", "data", "lq.json")

rows = json.load(open(SRC, encoding="utf-8"))
idx = {(r["year"], r["area"], r["own"], r["naics"]): r for r in rows}
NAME = {r["area"]: r["area_name"] for r in rows}

# Register per Documents/NAICS work/PIC_NAICS_Crosswalk_ADDENDUM_2026-08-11.md:
#   core    = the decided MEASUREMENT register — 3252 + 3255 + 326. What may be published
#             as the cluster.
#   detail  = a sub-slice of a core code. Real, but do not add it to its own parent.
#   context = outside the measurement register. 325 is an IMPURE parent: it sweeps in
#             pharma, agricultural chemicals, industrial gas and explosives — 9,219 jobs,
#             60% of the 325 figure, in NEO-14 2025. Never read as cluster.
NAICS = [
    ("325",  "Chemical manufacturing",             "context"),
    ("3252", "Resin, synthetic rubber & fibers",   "core"),
    ("3255", "Paint, coating & adhesive",          "core"),
    ("326",  "Plastics & rubber products",         "core"),
    ("3261", "Plastics products",                  "detail"),
    ("3262", "Rubber products",                    "detail"),
]
# FEDERAL-data page: PIC-12, so it reconciles with cluster-health.
FOOTPRINT = "pic12"
COUNTIES = [a for a in PIC12 if a in NAME]
YEARS = sorted({r["year"] for r in rows})


def cell(y, a, own, naics):
    r = idx.get((y, a, own, naics))
    if not r or r["disclosure"] == "N" or r["emp"] is None:
        return None
    return r


out_cells, residuals = [], []
for y in YEARS:
    ut = cell(y, "US000", "0", "10")
    for a in COUNTIES + ["39000"]:
        lt = cell(y, a, "0", "10")
        for naics, label, register in NAICS:
            ln, un = cell(y, a, "5", naics), cell(y, "US000", "5", naics)
            raw = idx.get((y, a, "5", naics))
            suppressed = raw is not None and raw["disclosure"] == "N"
            lq = published = resid = None
            if ln and lt and un and ut:
                lq = (ln["emp"] / lt["emp"]) / (un["emp"] / ut["emp"])
                published = raw["lq_bls"] if raw else None
                if published:
                    resid = lq - published
                    residuals.append(abs(resid))
            out_cells.append({
                "year": y, "area": a, "name": NAME[a], "naics": naics, "label": label,
                "register": register,
                "emp": ln["emp"] if ln else None,
                "estabs": ln["estabs"] if ln else None,
                "weekly_wage": ln["weekly_wage"] if ln else None,
                "local_total": lt["emp"] if lt else None,
                "lq": round(lq, 4) if lq is not None else None,
                "lq_published": published,
                "residual": round(resid, 5) if resid is not None else None,
                "suppressed": bool(suppressed),
            })

# The composite: BLS publishes no LQ for a custom geography, so it is summed
# from county components and flagged as ours, not BLS's.
composite = []
for y in YEARS:
    ut = cell(y, "US000", "0", "10")
    tot = sum(c["emp"] for a in COUNTIES if (c := cell(y, a, "0", "10")))
    for naics, label, register in NAICS:
        un = cell(y, "US000", "5", naics)
        parts = [cell(y, a, "5", naics) for a in COUNTIES]
        known = [p for p in parts if p]
        emp = sum(p["emp"] for p in known)
        missing = len(parts) - len(known)
        composite.append({
            "year": y, "naics": naics, "label": label, "register": register, "emp": emp,
            "estabs": sum(p["estabs"] for p in known if p["estabs"]),
            "counties_counted": len(known), "counties_suppressed": missing,
            "lq": round((emp / tot) / (un["emp"] / ut["emp"]), 4)
                  if (tot and un and ut and emp) else None,
        })

data = {
    "meta": {
        "source": "BLS QCEW open data, annual averages",
        "url": "https://data.bls.gov/cew/data/api/{year}/a/area/{fips}.csv",
        "row": "one (year, area, NAICS) annual-average cell; emp counts JOBS, not people or companies",
        "definition": ("LQ = (local private NAICS employment / local total-all-ownership employment) "
                       "/ (same ratio nationally). Denominator is own_code 0, verified against BLS's "
                       "published lq_annual_avg_emplvl."),
        "years": [YEARS[0], YEARS[-1]],
        "verification": {
            "cells_checked": len(residuals),
            "mean_abs_residual": round(sum(residuals) / len(residuals), 6) if residuals else None,
            "max_abs_residual": round(max(residuals), 6) if residuals else None,
        },
        "suppression": "disclosure_code 'N' → suppressed:true, value null. Never zero.",
        "registers": {"core": "3252 + 3255 + 326, the decided measurement register",
                      "detail": "a sub-slice of a core code; never add it to its parent",
                      "context": "outside the register. 325 sweeps in pharma, ag chemicals, "
                                 "industrial gas and explosives: 60% of its own figure."},
        "composite_note": ("The composite is summed from counties and is OURS, not BLS's. "
                           "Suppressed counties are counted in counties_suppressed and excluded "
                           "from the sum, so the composite is a floor."),
        "fetched": "2026-08-14",
        "footprint": META[FOOTPRINT],
    },
    "naics": [{"code": c, "label": l, "register": r} for c, l, r in NAICS],
    "areas": [{"code": a, "name": NAME[a]} for a in COUNTIES + ["39000", "US000"]],
    "cells": out_cells,
    "composite": composite,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(data, open(OUT, "w", encoding="utf-8"), separators=(",", ":"))
print("wrote", os.path.abspath(OUT), round(os.path.getsize(OUT) / 1024), "KB")
print("cells", len(out_cells), "| composite", len(composite))
v = data["meta"]["verification"]
print(f"verification: {v['cells_checked']} cells, MAE {v['mean_abs_residual']}, max {v['max_abs_residual']}")
print("suppressed cells:", sum(1 for c in out_cells if c["suppressed"]))
print()
print("NEO-14 composite LQ by year:")
for naics, label, register in NAICS:
    s = [c for c in composite if c["naics"] == naics]
    line = "  ".join(f"{c['year']}:{c['lq']:.2f}" for c in s if c["lq"])
    print(f"  {naics:5s} {line}")
