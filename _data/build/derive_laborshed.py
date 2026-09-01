"""The commute matrix — where the people who work in each PIC-12 county live.

WHAT ONE ROW IS
  One (home county, work county) count of JOBS. Not people: a worker holding two jobs is
  counted twice. Not commuters: both ends are employer-reported addresses, so the home end
  is a residence on file, not evidence that anyone travelled.

THE FORM DECISION
  The instinct for origin-destination data is a flow map or a chord diagram. Twelve
  counties makes both illegible and neither answers the question. The question is "what
  share of each county's jobs are held by its own residents", which is a value per (home,
  work) cell — a matrix. The finding is the WEAK DIAGONAL, and a matrix is the only form
  where a diagonal is a thing you can look at.

THE BENCHMARK
  A self-contained labor market would be a bright diagonal and nothing else. That is the
  comparison every cell is read against, and it is why the diagonal gets its own scale.

WHAT IS UNCERTAIN
  LODES carries NO industry dimension, so this is the whole economy and never the polymer
  cluster. And the imported share is two different things — adjacent counties that are
  plausibly commuting, and distant metros that are residence-of-record — which the 2019
  baseline shows was already true before the pandemic. They are never summed.
"""
import json, os, collections
from footprints import PIC12, META

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
NAME = {k: v for k, v in PIC12.items()}

# Counties close enough that a daily journey is plausible, versus metros where it is not.
# The split is a JUDGMENT on distance, not something LODES encodes — stated as such.
ADJACENT = {"39029": "Columbiana", "39157": "Tuscarawas", "39005": "Ashland",
            "39019": "Carroll", "39139": "Richland", "39077": "Huron",
            "39033": "Crawford", "39043": "Erie", "39075": "Holmes",
            "39067": "Harrison"}
DISTANT = {"39049": "Franklin (Columbus)", "39095": "Lucas (Toledo)",
           "39061": "Hamilton (Cincinnati)", "39113": "Montgomery (Dayton)",
           "39041": "Delaware", "39017": "Butler", "39165": "Warren"}


def load(fn):
    """cells = the PIC-12 interior; ext = external homes by county;
    ext_by_work = external inflow PER WORK COUNTY, which is the part the denominator needs."""
    d = json.load(open(os.path.join(HERE, fn), encoding="utf-8"))
    cells, ext, ext_by_work = {}, collections.Counter(), collections.Counter()
    for r in d["rows"]:
        if r["home_in_footprint"]:
            cells[(r["home"], r["work"])] = r["jobs"]
        else:
            ext[r["home"]] += r["jobs"]
            ext_by_work[r["work"]] += r["jobs"]
    return d["meta"], cells, ext, ext_by_work


meta22, cells, ext22, ext_by_work = load("lodes.json")
_, _, ext19, _ = load("lodes_2019.json")

# DENOMINATOR: every job worked in the county, INCLUDING those held from outside PIC-12.
# Dividing by the interior only would inflate every in-county share — Summit reads 53.9%
# against the interior and 48.4% against all jobs, and only the second supports the claim
# that most people working there live somewhere else.
def total_jobs(c):
    return sum(v for (h, w), v in cells.items() if w == c) + ext_by_work.get(c, 0)

order = sorted(PIC12, key=lambda c: -total_jobs(c))
matrix = []
for w in order:                                   # a row is a WORK county
    jobs = total_jobs(w)
    row = {"work": w, "work_name": NAME[w], "jobs_total": jobs,
           "outside": ext_by_work.get(w, 0),
           "outside_share": round(ext_by_work.get(w, 0) / jobs, 4) if jobs else 0,
           "cells": [{"home": h, "home_name": NAME[h],
                      "jobs": cells.get((h, w), 0),
                      "share": round(cells.get((h, w), 0) / jobs, 4) if jobs else 0,
                      "diagonal": h == w} for h in order]}
    row["in_county"] = row["cells"][order.index(w)]["share"]
    matrix.append(row)

def bucket(ext):
    a = sum(v for k, v in ext.items() if k in ADJACENT)
    d = sum(v for k, v in ext.items() if k in DISTANT)
    return {"adjacent": a, "distant": d, "other": sum(ext.values()) - a - d}

b19, b22 = bucket(ext19), bucket(ext22)
top_ext = sorted(({"fips": k, "name": ADJACENT.get(k) or DISTANT.get(k) or k,
                   "kind": "adjacent" if k in ADJACENT else
                           "distant" if k in DISTANT else "other",
                   "jobs_2022": v, "jobs_2019": ext19.get(k, 0)}
                  for k, v in ext22.items() if v >= 2000), key=lambda r: -r["jobs_2022"])

out = {"meta": dict(
    source=meta22["source"],
    row=meta22["row"],
    footprint=META["pic12"],
    no_industry=meta22["no_industry"],
    not_a_commute="The home end is a residence on file, not evidence of a journey. Nothing "
                  "here counts a trip.",
    baseline="A 2019 pull tests whether the distant-metro share is a pandemic effect. It is "
             "not: Franklin County was already the largest external source in 2019 at "
             "23,506 jobs, and adjacent-county inflow has been flat (+1%) while distant "
             "metros grew 13%. The two categories were always different things and are "
             "never summed.",
    split_is_judgment="Adjacent versus distant is a judgment about distance, not a field "
                      "LODES publishes.",
    year=2022, baseline_year=2019),
  "matrix": matrix,
  "order": [{"fips": c, "name": NAME[c]} for c in order],
  "totals": meta22["totals"],
  "external": {"2019": b19, "2022": b22, "top": top_ext}}

p = os.path.join(WEB, "laborshed", "data", "laborshed.json")
os.makedirs(os.path.dirname(p), exist_ok=True)
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
lo = min(matrix, key=lambda r: r["in_county"])
hi = max(matrix, key=lambda r: r["in_county"])
print(f"wrote {p} {round(os.path.getsize(p)/1024)} KB")
print(f"  weakest diagonal {lo['work_name']} {lo['in_county']:.1%} | "
      f"strongest {hi['work_name']} {hi['in_county']:.1%}")
print(f"  external 2019 adj {b19['adjacent']:,} dist {b19['distant']:,} | "
      f"2022 adj {b22['adjacent']:,} dist {b22['distant']:,}")
assert all(len(r["cells"]) == 12 for r in matrix) and len(matrix) == 12, \
    "matrix must be a complete 12x12 — a missing cell is a hole, not a zero"
