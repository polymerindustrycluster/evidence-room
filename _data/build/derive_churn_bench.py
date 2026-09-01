# -*- coding: utf-8 -*-
"""Shape the churn comparator and the age structure into the page's own file.

WHAT IT ADDS. `fetch_qwi_bench.py` pulls raw cells; this turns them into the four things
the page prints and nothing else: a ranked comparison of the region against six states on
one window, the same ranking recomputed on four other windows so the position can be shown
to persist rather than asserted, the eight age bands with their shares published as
BRACKETS rather than points, and the retirement arithmetic labelled as the estimate it is.

  python3 _data/build/derive_churn_bench.py

WHAT ONE ROW IS.
  `windows.<name>.rows[]` - one geography over one window: employment summed across that
  window's quarters, hires and separations summed over the same quarters, and the three
  rates that follow, sorted fastest first. The region is the twelve PIC-12 counties summed;
  a state is that state published as one unit. Comparable because `aggregation_check`
  measures the only thing that could make them incomparable, and finds it small. A
  geography that cannot cover every quarter of a window is left OUT of that window rather
  than ranked on fewer quarters, and its absence is in `coverage`.
  `age.<window>.bands[]` - one QWI age band summed over twelve counties and four quarters.
  `share` is of the DISCLOSED band total, never of the all-ages control, and both are
  carried so a reader can see the gap.

TRAPS.
  - **A share of the disclosed bands is not a share of the workforce.** Two to three per
    cent of employment sits in withheld cells, so every band share here is published with
    `share_lo` (none of the residual belongs to this band) and `share_hi` (all of it does).
    The 55-and-older finding survives that bracket at both ends of the period, which is why
    it is publishable; a finding that did not would not be.
  - **The retirement number is an ESTIMATE and is named one in the data.** It assumes the
    55-to-64 band is spread evenly over ten single-year cohorts, so a tenth of it reaches
    65 each year. QWI cannot see retirement; it sees separations, and a separation at 64 is
    the same record as a separation at 34.
  - **A floor is not a total.** Retirement is one of three sources of replacement demand.
    The others - people leaving plastics and rubber for another industry, and net growth -
    are invisible here: industry exits need Census Job-to-Job Flows, a different product.
  - **Michigan is absent from every window, not from some cells.** It is excluded from the
    ranked rows and carried in `coverage` with its last usable quarter, because a state
    drawn on 39 of 55 quarters beside states drawn on all 55 is not a comparison.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
B = json.load(open(os.path.join(HERE, "qwi_bench.json"), encoding="utf-8"))
CH = json.load(open(os.path.join(WEB, "churn", "data", "churn.json"), encoding="utf-8"))

REGION = "This region"
# Five windows, so the region's position can be shown to hold rather than claimed from the
# one window that happens to flatter it. `now` is the window the page already leads with.
WINDOWS = {
    "now":        ("the last four published quarters", [(2024, 4), (2025, 1), (2025, 2), (2025, 3)]),
    "base":       ("2012", [(2012, q) for q in (1, 2, 3, 4)]),
    "since2023":  ("since 2023Q1", [(y, q) for y in (2023, 2024) for q in (1, 2, 3, 4)]
                   + [(2025, q) for q in (1, 2, 3)]),
    "prepandemic": ("2012 through 2019", [(y, q) for y in range(2012, 2020) for q in (1, 2, 3, 4)]),
    "whole":      ("the whole 2012 to 2025 window", [(y, q) for y in range(2012, 2025)
                   for q in (1, 2, 3, 4)] + [(2025, q) for q in (1, 2, 3)]),
}
STATE_Q = {f: {(r["year"], r["q"]): r for r in s["quarters"]}
           for f, s in B["states"].items()}
REGION_Q = {(q["year"], q["q"]): q for q in CH["quarters"]}


def summed(cells, qs):
    """Totals over exactly the requested quarters, or None if any is absent.

    Absent is not zero and a short window is not the same window: a geography that cannot
    cover the span is left out of the ranking rather than ranked on less of it.
    """
    rows = [cells[k] for k in qs if k in cells]
    if len(rows) != len(qs):
        return None
    e = sum(r["emp"] for r in rows)
    h = sum(r["hires"] for r in rows)
    s = sum(r["seps"] for r in rows)
    return {"quarters": len(rows), "emp": e, "hires": h, "seps": s,
            "hire_rate": round(h / e, 5), "sep_rate": round(s / e, 5),
            "churn_rate": round(((h + s) / 2) / e, 5),
            "gap_pts": round((s - h) / e * 100, 3)}


def window(qs):
    rows = []
    for f, s in B["states"].items():
        v = summed(STATE_Q[f], qs)
        if v:
            rows.append({"geo": f, "name": s["name"], "abbr": s["abbr"],
                         "kind": "state", **v})
    v = summed(REGION_Q, qs)
    rows.append({"geo": "pic12", "name": REGION, "abbr": "PIC-12", "kind": "region", **v})
    rows.sort(key=lambda r: -r["churn_rate"])
    return rows


windows = {}
for k, (label, qs) in WINDOWS.items():
    rows = window(qs)
    states = [r for r in rows if r["kind"] == "state"]
    me = next(r for r in rows if r["kind"] == "region")
    rank = rows.index(me) + 1
    med = sorted(r["churn_rate"] for r in states)
    n = len(med)
    median = med[n // 2] if n % 2 else (med[n // 2 - 1] + med[n // 2]) / 2
    gaps = sorted((r["gap_pts"] for r in states))
    gmed = gaps[n // 2] if n % 2 else (gaps[n // 2 - 1] + gaps[n // 2]) / 2
    windows[k] = {
        "label": label, "quarters": [f"{y}Q{q}" for (y, q) in qs], "rows": rows,
        "rank": rank, "of": len(rows), "states": len(states),
        "faster": sum(1 for r in states if r["churn_rate"] > me["churn_rate"]),
        "slower": sum(1 for r in states if r["churn_rate"] < me["churn_rate"]),
        "state_median_churn": round(median, 5), "state_median_gap_pts": round(gmed, 3),
        "gap_rank": sorted(rows, key=lambda r: -r["gap_pts"]).index(me) + 1,
    }

# ------------------------------------------------------------------- AGE BANDS
LAB = B["band_label"]
age = {}
for win, blob in B["age"].items():
    ctl = B["age_control"][win]
    disclosed, resid = blob["disclosed_emp"], blob["residual_emp"]
    bands = []
    for code in sorted(blob["bands"]):
        v = blob["bands"][code]
        bands.append({
            "band": code, "label": LAB[code], "emp": v["emp"],
            "hires": v["hires"], "seps": v["seps"],
            "cells": v["cells"], "cells_expected": v["cells_expected"],
            # Of the disclosed bands. The two brackets below are of the true workforce.
            "share": round(v["emp"] / disclosed, 5),
            "share_lo": round(v["emp"] / ctl["emp"], 5),
            "share_hi": round((v["emp"] + resid) / ctl["emp"], 5),
            "hire_rate": round(v["hires"] / v["emp"], 5),
            "sep_rate": round(v["seps"] / v["emp"], 5)})
    old = [b for b in bands if b["band"] in ("A07", "A08")]
    oe = sum(b["emp"] for b in old)
    age[win] = {
        "bands": bands, "control": ctl, "disclosed_emp": disclosed, "residual_emp": resid,
        "residual_share": round(resid / ctl["emp"], 5),
        "older": {"emp": oe,
                  "share": round(oe / disclosed, 5),
                  "share_lo": round(oe / ctl["emp"], 5),
                  "share_hi": round((oe + resid) / ctl["emp"], 5),
                  "hires": sum(b["hires"] for b in old),
                  "seps": sum(b["seps"] for b in old)}}

# The hire-rate ladder, measured across the bands that are solidly measured. A01 is 11 of
# 48 cells and fewer than a hundred job-quarters; quoting its rate as the top of the range
# would headline the thinnest cell on the page.
now = age["now"]
solid = [b for b in now["bands"] if b["cells"] >= b["cells_expected"] * 0.8]
top = max(solid, key=lambda b: b["hire_rate"])
bot = min(solid, key=lambda b: b["hire_rate"])
ladder = {"top": top["band"], "top_label": top["label"], "top_rate": top["hire_rate"],
          "bottom": bot["band"], "bottom_label": bot["label"], "bottom_rate": bot["hire_rate"],
          "multiple": round(top["hire_rate"] / bot["hire_rate"], 2),
          "thin_bands": [b["band"] for b in now["bands"] if b not in solid],
          "sep_exceeds_hire_from": next(b["band"] for b in now["bands"]
                                        if b["sep_rate"] > b["hire_rate"])}

# ------------------------------------------------------------ RETIREMENT, ESTIMATED
QS = len(WINDOWS["now"][1])
a07 = next(b for b in now["bands"] if b["band"] == "A07")
a08 = next(b for b in now["bands"] if b["band"] == "A08")
jobs = now["control"]["emp"] / QS                    # average jobs in the window
j5564 = a07["emp"] / QS
COHORTS = 10                                          # 55 to 64 inclusive, ten single years
annual = j5564 / COHORTS
hires_yr = now["control"]["hires"]                    # four quarters = one year of hires
PLANT = 150
retirement = {
    "assumption": f"The {a07['label']} band is spread evenly over {COHORTS} single-year "
                  f"cohorts, so about a tenth of it reaches 65 in any year. This is an "
                  f"ESTIMATE, not a measurement: QWI records separations, and a separation "
                  f"at 64 is the same record as one at 34.",
    "avg_jobs": round(jobs), "avg_jobs_5564": round(j5564),
    "annual": round(annual), "annual_share": round(annual / jobs, 5),
    "hires_year": hires_yr,
    "hires_per_retirement": round(hires_yr / annual, 1),
    # Not a confirmation: the 65-and-older stock has tripled since 2012, so inflow and
    # outflow are not required to match. A coherence check, and reported as one.
    "observed_65plus_seps": a08["seps"],
    "plant": {"headcount": PLANT,
              "replacement_hires": round(PLANT * sum(q["churn_rate"] for q in CH["quarters"][-4:]) / QS * 4),
              "from_age": round(PLANT * annual / jobs, 1)},
    "floor": "A FLOOR on replacement demand, not the whole of it. People who leave "
             "plastics and rubber for another industry also have to be replaced, and QWI "
             "cannot see them: that needs Census Job-to-Job Flows, a different product.",
}

out = {"meta": {**B["meta"],
                "row": "compare/windows: one geography summed over one window's quarters. "
                       "age: one QWI age band summed over the twelve counties and the "
                       "window's quarters.",
                "estimate": retirement["assumption"],
                "producer": "_data/build/fetch_qwi_bench.py -> derive_churn_bench.py"},
       "windows": windows, "coverage": B["coverage"],
       "age": age, "ladder": ladder, "retirement": retirement,
       "aggregation_check": B["aggregation_check"]}

p = os.path.join(WEB, "churn", "data", "bench.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"  churn/data/bench.json  {round(os.path.getsize(p) / 1024)} KB")
w = windows["now"]
print(f"  {w['label']}: region ranks {w['rank']} of {w['of']}, "
      f"{w['faster']} states faster, {w['slower']} slower; "
      f"gap rank {w['gap_rank']} of {w['of']}")
for k, v in windows.items():
    print(f"    {k:12s} rank {v['rank']}/{v['of']}  region "
          f"{next(r['churn_rate'] for r in v['rows'] if r['kind'] == 'region') * 100:.2f}%  "
          f"state median {v['state_median_churn'] * 100:.2f}%  gap rank {v['gap_rank']}")
o = age["now"]["older"]
print(f"  55 and older: {o['share'] * 100:.1f}% of the disclosed bands, "
      f"{o['share_lo'] * 100:.1f}% to {o['share_hi'] * 100:.1f}% of all jobs")
ob = age["base"]["older"]
print(f"  in 2012:      {ob['share'] * 100:.1f}% of the disclosed bands, "
      f"{ob['share_lo'] * 100:.1f}% to {ob['share_hi'] * 100:.1f}%")
print(f"  ladder: {ladder['top_label']} {ladder['top_rate'] * 100:.1f}% to "
      f"{ladder['bottom_label']} {ladder['bottom_rate'] * 100:.1f}% = "
      f"{ladder['multiple']}x; thin {ladder['thin_bands']}")
print(f"  retirement estimate: {retirement['annual']} jobs a year "
      f"({retirement['annual_share'] * 100:.2f}% of {retirement['avg_jobs']:,}), "
      f"1 in {retirement['hires_per_retirement']} hires; "
      f"observed 65+ separations {retirement['observed_65plus_seps']}")
print(f"  plant: {retirement['plant']['replacement_hires']} replacement hires a year, "
      f"{retirement['plant']['from_age']} of them age-driven")
