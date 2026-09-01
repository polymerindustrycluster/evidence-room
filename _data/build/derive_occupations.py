"""Build web/occupations/data/viz-data.json — the occupations inside plastics and rubber
manufacturing: what the industry is staffed with, what each occupation pays in the four
Northeast Ohio metros against the nation, and what schooling its workers report.

INPUTS (all in this folder, all re-fetchable)
  occmix.json          BLS National Employment Matrix, industry 326000 -> occupations
  oews.json            BLS OEWS May 2024, four metros, the site's polymer occupation set
  oews_national.json   BLS OEWS May 2024, national, same set
  onet_education.json  O*NET 30.3 title/description, Job Zone, education distribution
  ipeds_cip.json       IPEDS completions by CIP, the three regional institutions
  qcew.json            BLS QCEW county annual averages (for ONE regional estimate)
  odjfs_projections.json  Ohio LMI 2022-32 occupation projections, JobsOhio Northeast

RUN ORDER: fetch_occmix.py, fetch_oews.py, fetch_oews_national.py, fetch_onet_education.py,
fetch_ipeds_cip.py, then this. The wage and O*NET pulls read the occupation set from
oews.json, so the four files describe one list of occupations by construction.

FOUR THINGS THIS FILE REFUSES TO DO, and the page inherits each refusal:
  1. Sum the metros and call it PIC-12. Metros neither nest in nor tile the footprint.
  2. Print a suppressed or absent cell as zero. Absent is absent; the page says so.
  3. Present the regional occupation count as a measurement. It is national staffing
     shares times regional industry employment: an ESTIMATE under a stated assumption.
  4. Present a projection as a forecast, or an O*NET Job Zone as an entry requirement.
"""
import json, os, time
from footprints import PIC12, META

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "occupations", "data", "viz-data.json")


import ipeds_mirror_fix as MF


def load(name):
    return json.load(open(os.path.join(HERE, name), encoding="utf-8"))


occ, oews, nat, onet, ipeds, qcew, odjfs = (load(f) for f in (
    "occmix.json", "oews.json", "oews_national.json", "onet_education.json",
    "ipeds_cip.json", "qcew.json", "odjfs_projections.json"))
# The degree panel is the only IPEDS-fed part of this page, and it inherits the federal
# mirror's year fault: a republished 2020, two more years filed a year late behind it, and
# one collection year served under no label at all (see ipeds_mirror_fix.py). Re-filed and
# backfilled at load, so the ten-year window, the per-programme by_year map and the window
# average all count real years, each under its own name.
ipeds["rows"] = MF.apply_rows(ipeds["rows"])
ipeds.setdefault("meta", {})["source_correction"] = MF.CAPTION

SOC = oews["meta"]["occupations"]                     # the one occupation set
METROS = oews["meta"]["metros"]
SHORT = {"10420": "Akron", "17410": "Cleveland", "15940": "Canton-Massillon",
         "49660": "Youngstown-Warren"}
assert set(SHORT) == set(METROS), METROS

# ------------------------------------------------------------------ 1. staffing mix
# raw = [title, code, type, emp2024(k), %of industry 2024, %of occupation 2024, emp2034(k),
#        %ind 2034, %occ 2034, change(k), change %, ...]. Verified against the total row:
# 725.1 thousand, 100.0 % of industry, 0.4 % of all US employment.
rows326 = [r for r in occ["rows"] if r["industry"] == "326000"]
total = next(r for r in rows326 if r["soc"] == "00-0000")
def f(v):
    try: return float(str(v).replace(",", ""))
    except (TypeError, ValueError): return None
industry_emp_k = f(total["raw"][3])
assert industry_emp_k and 600 < industry_emp_k < 900, industry_emp_k
detailed = [r for r in rows326 if r["occupation_type"] == "Line Item" and r["soc"] != "00-0000"
            and not r["soc"].endswith("0000") and f(r["raw"][4]) is not None]
detailed.sort(key=lambda r: -f(r["raw"][4]))
TOP_N = 14
mix = []
for r in detailed[:TOP_N]:
    raw = r["raw"]
    mix.append({"soc": r["soc"], "occupation": SOC.get(r["soc"], r["occupation"]),
                "bls_title": r["occupation"], "emp_2024_k": f(raw[3]),
                "pct_of_industry": f(raw[4]), "pct_of_occupation": f(raw[5]),
                "emp_2034_k": f(raw[6]), "change_pct_2024_34": f(raw[10]),
                "in_wage_set": r["soc"] in SOC})
# A SHARE IS COMPUTED FROM COUNTS, NEVER BY ADDING ROUNDED SHARES. BLS publishes
# pct_of_industry to one decimal, so summing fourteen of them accumulates fourteen
# roundings: they netted -0.203pp and published 59.4% where the counts give 59.6%. A
# naive reader added the job counts, divided, and found the page short by two tenths.
# The same mistake was live in all three shares below, so all three now divide.
def share_of_industry(recs):
    emp = sum(f(r["raw"][3]) or 0 for r in recs)
    return round(emp / industry_emp_k * 100, 1)

top_share = share_of_industry(detailed[:TOP_N])
production_share = share_of_industry([r for r in detailed if r["soc"].startswith("51-")])
eng_sci_codes = [r for r in detailed if r["soc"][:4] in ("17-2", "19-2", "19-4", "17-3")]
eng_sci_share = share_of_industry(eng_sci_codes)
setters = next(m for m in mix if m["soc"] == "51-4072")
tire = next((r for r in detailed if r["soc"] == "51-9197"), None)

# ---------------------------------------------------- 2. one regional estimate (QCEW)
Y = 2024
reg = [r for r in qcew if r.get("naics") == "326" and int(r.get("year", 0)) == Y
       and str(r.get("own")) == "5" and r.get("area") in PIC12]
reg_emp = sum(r["emp"] for r in reg if r.get("emp") is not None)
counted = len({r["area"] for r in reg if r.get("emp") is not None})
assert counted == len(PIC12), f"QCEW 326 {Y}: {counted} of {len(PIC12)} counties disclosed"
region = {"year": Y, "naics": "326", "emp": int(reg_emp), "counties_counted": counted,
          "footprint": META["pic12"]["label"], "n_counties": len(PIC12),
          "setters_share_pct": setters["pct_of_industry"],
          "setters_estimate": int(round(reg_emp * setters["pct_of_industry"] / 100, -2)),
          "eng_sci_share_pct": eng_sci_share,
          "eng_sci_estimate": int(round(reg_emp * eng_sci_share / 100, -1))}

# ------------------------------------------------------------------- 3. what it pays
nat_by = {r["soc"]: r for r in nat["rows"]}
met_by = {}
for r in oews["rows"]:
    met_by.setdefault(r["soc"], {})[r["area"]] = r
proj = {r["soc"]: r for r in odjfs["occupations"] if r["geo"] == "jo_northeast"}
proj_meta = odjfs["meta"]
pay = []
for soc, label in SOC.items():
    n = nat_by.get(soc)
    row = {"soc": soc, "occupation": label,
           "national": None if not n else {
               "median": n["a_median"], "mean": n["annual_mean"], "p10": n["a_pct10"],
               "p90": n["a_pct90"], "employment": n["employment"], "mean_rse": n["mean_rse"]},
           "metros": {}}
    for area in METROS:
        m = met_by.get(soc, {}).get(area)
        if m is None:
            row["metros"][area] = {"absent": True}
        else:
            row["metros"][area] = {"absent": False, "median": m["a_median"], "mean": m["annual_mean"],
                                   "employment": m["employment"], "emp_rse": m["emp_rse"],
                                   "mean_rse": m["mean_rse"], "loc_quotient": m["loc_quotient"],
                                   "median_vs_us": (round(m["a_median"] / n["a_median"], 3)
                                                    if m["a_median"] and n and n["a_median"] else None)}
    p = proj.get(soc)
    row["projection"] = None if not p else {
        "emp_2022": p["emp_2022"], "emp_2032": p["emp_2032"], "pct_change": p["pct_change"],
        "openings_annual": p["openings_total"], "median_hourly_2023": p["median_wage"]}
    pay.append(row)
pay.sort(key=lambda r: -(r["national"]["median"] if r["national"] else 0))
disclosed = {a: sum(1 for r in pay if not r["metros"][a]["absent"]) for a in METROS}
absent_all = [r["soc"] for r in pay if all(r["metros"][a]["absent"] for a in METROS)]
# metro cells that BEAT the national median, per metro
beats = {a: sum(1 for r in pay if not r["metros"][a]["absent"] and r["metros"][a]["median_vs_us"]
                and r["metros"][a]["median_vs_us"] > 1) for a in METROS}
high_rse = [(r["soc"], a, r["metros"][a]["mean_rse"]) for r in pay for a in METROS
            if not r["metros"][a]["absent"] and (r["metros"][a]["mean_rse"] or 0) > 10]

# ------------------------------------------------------ 4. what schooling they report
edu = []
for r in onet["rows"]:
    edu.append({"soc": r["soc"], "occupation": SOC.get(r["soc"], r["occupation"]),
                "onet_title": r["onet_title"], "description": r["description"],
                "job_zone": r["job_zone"], "job_zone_name": r["job_zone_name"],
                "job_zone_education": r["job_zone_education"], "bins": r["education_bins"],
                "modal": r["modal_education"], "join": r["join"]})
order = {r["soc"]: i for i, r in enumerate(pay)}
edu.sort(key=lambda r: (-(r["bins"]["bachelors"] + r["bins"]["graduate"]) if r["bins"] else 0,
                        order.get(r["soc"], 99)))
ba_plus_majority = [r["soc"] for r in edu if r["bins"] and r["bins"]["bachelors"] + r["bins"]["graduate"] > 50]
hs_majority = [r["soc"] for r in edu if r["bins"] and r["bins"]["hs_or_less"] > 50]

# The reading the pay section makes — that the metros pay their floor occupations closer to
# the national rate than their degree occupations — is computed here, per metro, so the
# sentence is an assertion and not an impression. Median of (metro median / US median)
# over the disclosed occupations in each education group.
import statistics
ba_set, hs_set = set(ba_plus_majority), set(hs_majority)
def _ratios(a, group):
    return [r["metros"][a]["median_vs_us"] for r in pay
            if (group is None or r["soc"] in group) and not r["metros"][a]["absent"]
            and r["metros"][a]["median_vs_us"]]
ratio_by_metro = {}
for a in METROS:
    d, h, al = _ratios(a, ba_set), _ratios(a, hs_set), _ratios(a, None)
    ratio_by_metro[a] = {"degree_n": len(d), "degree_median_ratio": round(statistics.median(d), 3),
                         "hs_n": len(h), "hs_median_ratio": round(statistics.median(h), 3),
                         "all_n": len(al), "all_median_ratio": round(statistics.median(al), 3)}

# ---------------------------------------------- 5. where the degrees are conferred here
inst = ipeds["meta"]["institutions"]
LATEST = max(r["year"] for r in ipeds["rows"])
WINDOW = [LATEST - 2, LATEST - 1, LATEST]
progs = {}
for r in ipeds["rows"]:
    if r["group"] not in ("polymer", "materials"):
        continue
    k = (r["inst"], r["cip"], r["award"])
    p = progs.setdefault(k, {"institution": r["inst"], "cip": r["cip"], "program": r["label"],
                             "group": r["group"], "award": r["award"], "award_level": r["award_level"],
                             "by_year": {}})
    p["by_year"][r["year"]] = p["by_year"].get(r["year"], 0) + r["awards"]
programs = []
for p in progs.values():
    yrs = [p["by_year"].get(y, 0) for y in WINDOW]
    if sum(yrs) == 0:
        continue                                # a program with no completions in the window
    p["latest"] = p["by_year"].get(LATEST, 0)
    p["window_avg"] = round(sum(yrs) / len(WINDOW), 1)
    p["by_year"] = {str(y): v for y, v in sorted(p["by_year"].items()) if y >= LATEST - 9}
    programs.append(p)
programs.sort(key=lambda p: (p["institution"], p["group"] != "polymer", p["cip"], p["award_level"]))
insts = sorted({p["institution"] for p in programs})
polymer_latest = sum(p["latest"] for p in programs if p["group"] == "polymer")
# FROM THE COUNTS, NEVER BY ADDING ROUNDED AVERAGES, the same rule the staffing shares
# above follow. Summing the thirteen rounded per-programme window averages published 80.4
# where the three years themselves average 80.3: thirteen roundings, netting a tenth.
polymer_window = round(sum(sum(p["by_year"].get(str(y), 0) for p in programs
                               if p["group"] == "polymer") for y in WINDOW) / len(WINDOW), 1)

# ------------------------------------------------------------------------ meta + write
today = time.strftime("%Y-%m-%d")
out = {
    "meta": {
        "title": "The occupations inside plastics and rubber manufacturing",
        "source": "BLS Employment Projections National Employment Matrix (2024-34); BLS "
                  "Occupational Employment and Wage Statistics, May 2024, metropolitan and "
                  "national files; O*NET 30.3 (U.S. Department of Labor, CC BY 4.0); IPEDS "
                  "completions by CIP via the Urban Institute; BLS QCEW 2024 annual averages "
                  "for one regional estimate; Ohio Department of Job and Family Services "
                  "2022-2032 long-term occupation projections",
        "row": "one detailed occupation (a six-digit federal occupation code): its share of "
               "national plastics-and-rubber employment, its annual median wage in each of four "
               "Northeast Ohio metros and nationally, and the education its workers report",
        "fetched": today,
        "geography": "The wage figures are METROPOLITAN. Akron, Cleveland, Canton-Massillon and "
                     "Youngstown-Warren neither nest inside nor tile the twelve counties PIC "
                     "measures against; each includes territory the footprint excludes. They "
                     "are shown side by side and never summed.",
        "not": "The metro and national wages are ALL-INDUSTRY: what a metro pays a chemist "
               "across every industry that employs one, not what a plastics plant pays. The "
               "staffing shares are NATIONAL: what the industry looks like across the country, "
               "not in Ohio.",
        "caution": "The wage source is a survey. Every cell carries a relative standard error, "
                   "shown in the table; a small occupation in one metro is a small sample that "
                   "moves between years for reasons that are not the labor market.",
        "suppression": "A wage the survey did not release, or an occupation absent from a "
                       "metro's file, is shown as withheld and never as zero. Tire builders — "
                       "the industry's ninth-largest occupation — are published for none of "
                       "the four metros.",
        "uncertain": "The regional occupation counts are ESTIMATES: national staffing shares "
                     "multiplied by the twelve counties' 2024 plastics-and-rubber employment, "
                     "under the assumption that the region's plants have the national "
                     "occupational structure. A region with unusual research intensity may not. "
                     "The 2022-2032 openings are a state projection — a modelled path with no "
                     "confidence band — for the eighteen-county JobsOhio Northeast region, a "
                     "superset of the footprint.",
        "scope": "The occupation set is the fourteen largest detailed occupations in plastics and "
                 "rubber manufacturing by national staffing share, plus the engineering, science "
                 "and technician occupations a polymer cluster is distinctive for. It is not every "
                 "occupation the industry employs.",
        "definition": "The Job Zone is O*NET's rating of how much overall preparation an "
                      "occupation typically needs, from 'little or none' to 'extensive'; release "
                      "30.3 reports the two lowest steps as one band. The education distribution "
                      "is the share of surveyed workers and occupational experts reporting each "
                      "level of education as required, binned here to four: high school or less; "
                      "some college or an associate degree; bachelor's; graduate. Neither is a "
                      "hiring requirement.",
        "derived_note": "'Share of the occupation' is the plastics-and-rubber industry's share of "
                        "that occupation's national employment — how polymer-specific the job is. "
                        "'Metro median against the nation' divides the metro annual median by the "
                        "national annual median for the same occupation.",
        "metros": {a: {"name": METROS[a], "short": SHORT[a], "disclosed": disclosed[a],
                       "beats_national": beats[a]} for a in METROS},
        "occupation_set": SOC,
        "years": {"oews": "May 2024", "matrix": "2024-2034", "onet": "30.3", "ipeds_latest": LATEST,
                  "ipeds_window": WINDOW, "qcew": Y, "projection": "2022-2032"},
    },
    "mix": mix,
    "mix_totals": {"industry_emp_2024_k": industry_emp_k, "top_n": TOP_N, "top_n_share_pct": top_share,
                   "production_share_pct": production_share, "eng_sci_share_pct": eng_sci_share,
                   "n_detailed": len(detailed),
                   "tire_builders_pct_of_occupation": f(tire["raw"][5]) if tire else None,
                   "setters_pct_of_occupation": setters["pct_of_occupation"]},
    "region": region,
    "pay": pay,
    "pay_totals": {"occupations": len(pay), "disclosed": disclosed, "beats_national": beats,
                   "absent_everywhere": absent_all, "high_rse_cells": len(high_rse),
                   "high_rse_threshold_pct": 10, "ratio_by_metro": ratio_by_metro},
    "education": edu,
    "education_totals": {"ba_plus_majority": ba_plus_majority, "hs_majority": hs_majority,
                         "n": len(edu)},
    "source_correction": {"why": MF.CAPTION,
                          "years_refiled": {str(k): v for k, v in MF.LAG.items()},
                          "year_backfilled": MF.BACKFILL_YEAR},
    "gaps": {"kind": "correction+sparse",
             "reason": MF.CAPTION + "; a programme with no completions in a year has no row"},
    "programs": programs,
    "program_totals": {"institutions": insts, "latest_year": LATEST, "window": WINDOW,
                       "polymer_awards_latest": polymer_latest,
                       "polymer_awards_window_avg": polymer_window,
                       "n_programs": len(programs)},
    "job_zone_reference": onet["meta"]["job_zone_reference"],
    # Top level, not meta: meta prose keys must be classified in picviz.js (fail-loud), and
    # this is neither a limitation nor a method — it is a license condition the page prints
    # verbatim in the education source line.
    "onet_attribution": onet["meta"]["attribution"],
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
print(f"wrote {os.path.relpath(OUT, HERE)} {round(os.path.getsize(OUT)/1024)} KB")
print(f"  mix: {len(mix)} occupations = {top_share}% of {industry_emp_k}k; production {production_share}%, "
      f"eng/sci {eng_sci_share}%; setters {setters['pct_of_industry']}% / {setters['pct_of_occupation']}% of occupation")
print(f"  region {Y}: {int(reg_emp):,} jobs in {counted} counties -> ~{region['setters_estimate']:,} setters, "
      f"~{region['eng_sci_estimate']:,} engineers/scientists/technicians (ESTIMATES)")
print(f"  pay: {len(pay)} occupations; disclosed {disclosed}; beat US {beats}; absent everywhere {absent_all}; "
      f"{len(high_rse)} cells with mean RSE > 10%")
print(f"  education: {len(edu)}; BA+ majority {len(ba_plus_majority)}; HS majority {len(hs_majority)}")
print(f"  programs: {len(programs)} at {insts}; polymer awards {LATEST}: {polymer_latest}, "
      f"{WINDOW[0]}-{WINDOW[-1]} avg {polymer_window}")
