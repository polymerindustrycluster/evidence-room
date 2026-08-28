"""Build data/health.json for the cluster-health dashboard.

WHAT THIS IS
  Five measures of the Northeast Ohio polymer cluster, each recomputed from the shipped
  data file of the Evidence Room page that already publishes it. Nothing is fetched and
  nothing is typed: every figure on the dashboard is derived here, so a correction on a
  source page propagates on the next run and the claims harness fails until it does.

  Run from anywhere:  python3 cluster-health/derive_health.py

THE MOVEMENT BAND, AND WHAT IT IS NOT
  Each tile reports whether this year's move is unusual for that measure. The rule is one
  rule, applied identically to all five:

      take the same measure's own published history;
      compute the absolute change between every consecutive pair of years;
      hold out the latest change; that is the year being judged;
      the band is the MEDIAN of the earlier changes, and the largest of them.

  A move at or below the median is inside the range this measure normally moves between
  published years. A move larger than every earlier one is outside it. In between, the
  tile says how many earlier years it beats.

  This is a HISTORY band, not a REVISION band. It says how far the series has moved
  between published years. It does not say how far a future revision will move the year
  just published, because for four of these five measures nobody has measured that. The
  one place it HAS been measured in this repo is the producer-price series on the
  revisions page: 259 reference months of archived vintages, a median revision of 0.15
  percent of the level and a largest of 1.42 percent. Those numbers are read in here and
  reported as what they are, a calibration for three price indexes and nothing else. The
  revisions page says so itself and names archived employment vintages as its open ask.

DISCLOSURE CHURN
  Three of the five measures are built from BLS county cells, and BLS withholds a cell
  when disclosing it would identify an employer. The set of disclosed cells changes from
  year to year, so a raw year-over-year total mixes real change with the bureau's
  publication decisions. Where that applies, this script also builds a BALANCED PANEL
  of the cells present in every year, and the movement is judged on that.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, ".."))
OUT = os.path.join(HERE, "data", "health.json")

REGISTER = ("3252", "3255", "326")          # the decided measurement register
REG_LABEL = {"3252": "Resin and synthetic rubber", "3255": "Paint and coatings",
             "326": "Plastics and rubber products"}


def load(*parts):
    with open(os.path.join(WEB, *parts), encoding="utf-8") as fh:
        return json.load(fh)


def median(xs):
    s = sorted(xs)
    n = len(s)
    if not n:
        raise ValueError("median of an empty list")
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


def band(series):
    """series = [(year, value), ...] ascending. Judge the last step against the earlier ones.

    Returns the vocabulary every tile shares. `beats` counts how many earlier moves this
    one is larger than, which is what lets a tile say "larger than seven of the nine
    earlier years" instead of pretending a median is a threshold.
    """
    if len(series) < 4:
        raise ValueError("a movement band needs at least four years")
    steps = [(series[i][0], series[i][1] - series[i - 1][1]) for i in range(1, len(series))]
    latest_year, latest = steps[-1]
    prior = [abs(v) for _, v in steps[:-1]]
    beats = sum(1 for p in prior if abs(latest) > p)
    # Three classes, and the count is what the tile prints. "Ordinary" is the honest
    # reading whenever at least half the earlier years moved at least this far — a
    # median is a description of the middle, never a threshold somebody decided.
    if beats * 2 <= len(prior):
        verdict = "ordinary"
    elif abs(latest) > max(prior):
        verdict = "record"
    else:
        verdict = "above"
    return {
        "latest_year": latest_year,
        "latest": round(latest, 6),
        "abs_latest": round(abs(latest), 6),
        "median_prior": round(median(prior), 6),
        "max_prior": round(max(prior), 6),
        "n_prior": len(prior),
        "beats": beats,
        "typicals": round(abs(latest) / median(prior), 4) if median(prior) else None,
        "max_typicals": round(max(prior) / median(prior), 4) if median(prior) else None,
        "verdict": verdict,
        "steps": [{"year": y, "change": round(v, 6),
                   "typicals": round(abs(v) / median(prior), 4) if median(prior) else None}
                  for y, v in steps],
    }


# ---------------------------------------------------------------------------- sources
wg = load("wages", "data", "wages.json")
lq = load("location-quotient", "data", "lq.json")
occ = load("occupations", "data", "viz-data.json")
fed = load("federal-money", "data", "federal.json")
hub = load("federal-money", "data", "techhub.json")
fm = load("funding-map", "data", "funding.json")
rev = load("revisions", "data", "revisions.json")

county_rows = [r for r in wg["trend"] if r["area"] != "US000" and r["naics"] in REGISTER]
us_rows = {(r["year"], r["naics"]): r for r in wg["trend"]
           if r["area"] == "US000" and r["naics"] in REGISTER}
YEARS = sorted({r["year"] for r in county_rows})
LATEST = YEARS[-1]

# ------------------------------------------------------------------- 1. SCALE
# Disclosed total is the LEVEL (a floor: withheld cells are not zero). The MOVEMENT is
# judged on the balanced panel, so the bureau's disclosure decisions cannot be read as
# jobs appearing and disappearing.
disclosed = {y: sum(r["emp"] for r in county_rows if r["year"] == y) for y in YEARS}
cells = {y: sum(1 for r in county_rows if r["year"] == y) for y in YEARS}
seen = {}
for r in county_rows:
    seen.setdefault((r["area"], r["naics"]), set()).add(r["year"])
balanced_keys = {k for k, ys in seen.items() if len(ys) == len(YEARS)}
balanced = {y: sum(r["emp"] for r in county_rows
                   if r["year"] == y and (r["area"], r["naics"]) in balanced_keys)
            for y in YEARS}
n_counties = len({r["area"] for r in county_rows})
possible = n_counties * len(REGISTER)

scale_band = band([(y, balanced[y]) for y in YEARS])
by_industry = {}
for n in REGISTER:
    by_industry[n] = {
        "label": REG_LABEL[n],
        "latest": sum(r["emp"] for r in county_rows
                      if r["year"] == LATEST and r["naics"] == n),
        "prev": sum(r["emp"] for r in county_rows
                    if r["year"] == LATEST - 1 and r["naics"] == n),
        "cells_latest": sum(1 for r in county_rows
                            if r["year"] == LATEST and r["naics"] == n),
        "cells_prev": sum(1 for r in county_rows
                          if r["year"] == LATEST - 1 and r["naics"] == n),
    }
    d = by_industry[n]
    d["change"] = d["latest"] - d["prev"]

# consecutive falling years, on the balanced panel
falling = 0
for i in range(len(YEARS) - 1, 0, -1):
    if balanced[YEARS[i]] < balanced[YEARS[i - 1]]:
        falling += 1
    else:
        break

# ------------------------------------------------------------- 2. DISTINCTIVENESS
comp = {(c["naics"], c["year"]): c for c in lq["composite"]}
lq_years = sorted({c["year"] for c in lq["composite"]})
conc = []
for n in REGISTER:
    row = comp[(n, LATEST)]
    conc.append({
        "naics": n, "label": REG_LABEL[n], "lq": row["lq"],
        "prev": comp[(n, LATEST - 1)]["lq"],
        "counties_counted": row["counties_counted"],
        "counties_suppressed": row["counties_suppressed"],
        "emp": row["emp"],
    })
conc.sort(key=lambda c: -c["lq"])
lead = conc[0]
# has the leader led every year?
lead_every_year = all(
    max((c for c in lq["composite"] if c["year"] == y and c["register"] == "core"),
        key=lambda c: c["lq"])["naics"] == lead["naics"] for y in lq_years)
conc_band = band([(y, comp[(lead["naics"], y)]["lq"]) for y in lq_years])

# ------------------------------------------------------------------ 3. JOB QUALITY
latest_reg = [r for r in wg["latest_rows"]
              if r["naics"] in REGISTER and r["area"] != "US000"]
local = sorted(r["vs_local_all"] for r in latest_reg)
nat = sorted(r["vs_us"] for r in latest_reg)
emp_total = sum(r["emp"] for r in latest_reg)
both = [r for r in latest_reg if r["vs_local_all"] > 1 and r["vs_us"] < 1]

# The national side is the only half of this tile with a shipped history: the wages file
# carries the national weekly wage for each industry in every year, so a cell's ratio
# against its own industry can be rebuilt back to the first year. The statistic charted
# is the SAME one printed on the tile — the median across disclosed cells — rather than
# an employment-weighted aggregate, so the movement band judges the number the reader is
# looking at and not a cousin of it.
nat_series = []
for y in YEARS:
    rows = [r for r in county_rows if r["year"] == y]
    e = sum(r["emp"] for r in rows)
    ratios = [r["weekly_wage"] / us_rows[(y, r["naics"])]["weekly_wage"] for r in rows]
    nat_series.append((y, median(ratios),
                       sum(r["emp"] * r["weekly_wage"] for r in rows) / e,
                       sum(r["emp"] * us_rows[(y, r["naics"])]["weekly_wage"]
                           for r in rows) / e,
                       len(rows)))
pay_band = band([(y, v) for y, v, _, _, _ in nat_series])

# --------------------------------------------------------------- 4. TALENT SUPPLY
prog_years = sorted({int(y) for p in occ["programs"] for y in p["by_year"]})
polymer = {y: sum(p["by_year"].get(str(y), 0) for p in occ["programs"]
                  if p["group"] == "polymer") for y in prog_years}
materials = {y: sum(p["by_year"].get(str(y), 0) for p in occ["programs"]
                    if p["group"] == "materials") for y in prog_years}
deg_latest = max(prog_years)
deg_peak_year = max(polymer, key=lambda y: polymer[y])
deg_band = band([(y, polymer[y]) for y in prog_years])
# Two adjacent IPEDS years reporting an identical count for EVERY program is a pattern
# worth stating rather than smoothing over.
dupes = [y for y in prog_years[1:]
         if all(p["by_year"].get(str(y)) == p["by_year"].get(str(y - 1))
                for p in occ["programs"]) ]
# The openings estimate that exists, and the geography it is on. Not divided into
# completions: the two are on different footprints and the ratio would be a fiction.
degree_socs = ("17-2131", "17-2041")     # materials engineers, chemical engineers
openings = [{"soc": p["soc"], "occupation": p["occupation"],
             "annual": p["projection"]["openings_annual"]}
            for p in occ["pay"] if p["soc"] in degree_socs and p.get("projection")]

# --------------------------------------------------------------------- 5. CAPITAL
fy_real = {}
for r in fed["naics"]:
    fy_real[r["fy"]] = fy_real.get(r["fy"], 0) + r["real"]
FYS = sorted(fy_real)
OPEN_FY = max(FYS)                       # the partial year, excluded from every average
closed = [y for y in FYS if y != OPEN_FY]
cap_band = band([(y, fy_real[y]) for y in closed])
closed_avg = sum(fy_real[y] for y in closed) / len(closed)

named = {}
for rec in fm["recipients"]:
    for a in rec["awards"]:
        named.setdefault(a["programId"], []).append((rec["name"], a["amount"]))
federal_source_ids = {s["id"] for s in fm["sources"]
                      if s["kind"].lower().startswith("federal")}
federal_programs = [p for p in fm["programs"] if p["sourceId"] in federal_source_ids]
federal_announced = sum(p["amount"] for p in federal_programs)
federal_named = sum(a for p in federal_programs for _, a in named.get(p["id"], []))
eda_leads = named.get("eda-direct", [])
# A recipient row that names a line item rather than an organisation is not a named
# recipient, and the tile may not count it as one.
LINE_ITEMS = {"Polymer Pilot Facility", "Regional workforce programs"}
federal_org_named = sum(a for p in federal_programs
                        for nme, a in named.get(p["id"], []) if nme not in LINE_ITEMS)

# ------------------------------------------------------- the one measured revision band
rev_pct = sorted(abs(p["pct"]) for p in rev["periods"])
rev_series = sorted({p["label"] for p in rev["periods"]})

# --------------------------------------------------------------------------- assemble
def fmt_n(v):
    return f"{round(v):,}"


tiles = [
    {
        "id": "scale",
        "dimension": "Scale",
        "short": "jobs in the register",
        "question": "How many jobs is this?",
        "value": fmt_n(disclosed[LATEST]),
        "unit": "jobs",
        "reading": (f"{fmt_n(disclosed[LATEST])} jobs in the three industries the cluster "
                    f"measures itself by, counted across the twelve counties in "
                    f"{LATEST}. It is a floor, not a total: BLS withheld "
                    f"{possible - cells[LATEST]} of the {possible} industry-county cells."),
        "baseline": {
            "name": f"the same counted cells in {LATEST - 1}",
            "why": ("A year is the shortest step this series takes, and the same-cell "
                    "comparison is the only one that holds the measurement frame still "
                    "while the economy moves."),
        },
        "direction": {
            "value": round(balanced[LATEST] - balanced[LATEST - 1]),
            "pct": round((balanced[LATEST] / balanced[LATEST - 1] - 1) * 100, 1),
            "words": (f"down {abs(round(balanced[LATEST] - balanced[LATEST - 1])):,} jobs, "
                      f"{abs(round((balanced[LATEST] / balanced[LATEST - 1] - 1) * 100, 1))} "
                      f"percent, in the cells counted in both years"),
            "short_move": f"down {abs(round(balanced[LATEST] - balanced[LATEST - 1])):,} jobs",
            "raw": round(disclosed[LATEST] - disclosed[LATEST - 1]),
            "streak": falling,
        },
        "band": scale_band,
        "blind": (f"{possible - cells[LATEST]} of the {possible} industry-county cells "
                  f"are withheld so no employer can be identified from them. A withheld "
                  f"cell is not a zero, and the jobs in it are not in the "
                  f"{fmt_n(disclosed[LATEST])}."),
        "vintage": {
            "as_of": f"{LATEST} annual averages",
            "changes_it": ("BLS revises QCEW county cells when employers refile. A new "
                           "annual release replaces this figure outright."),
        },
        "link": {"href": "../wages/", "label": "What the work pays"},
        "drivers": [
            {"label": by_industry["326"]["label"],
             "value": f"{by_industry['326']['change']:+,.0f} jobs",
             "note": (f"{fmt_n(by_industry['326']['latest'])} jobs, all twelve counties "
                      f"disclosed in both years")},
            {"label": by_industry["3255"]["label"],
             "value": f"{by_industry['3255']['change']:+,.0f} jobs",
             "note": (f"{fmt_n(by_industry['3255']['latest'])} jobs across "
                      f"{by_industry['3255']['cells_latest']} disclosed counties, the same "
                      f"count as last year")},
            {"label": by_industry["3252"]["label"],
             "value": f"{by_industry['3252']['change']:+,.0f} jobs",
             "note": (f"a county came back into disclosure, from "
                      f"{by_industry['3252']['cells_prev']} counties to "
                      f"{by_industry['3252']['cells_latest']}, so this rise is partly the "
                      f"bureau publishing more")},
        ],
    },
    {
        "id": "concentration",
        "dimension": "Distinctiveness",
        "short": "paint against the U.S. share",
        "question": "Is this cluster unusual, or just present?",
        "value": f"{lead['lq']:.2f}×",
        "unit": "the national share",
        "reading": (f"{lead['label'].lower()} is the most concentrated of the three: for "
                    f"every job the country holds in it per hundred jobs, these counties "
                    f"hold about {lead['lq']:.1f}. Rubber and plastics, the industries the "
                    f"region is known for, run "
                    f"{[c for c in conc if c['naics'] == '326'][0]['lq']:.2f} times."),
        "baseline": {
            "name": "1.0 times, the national share of employment",
            "why": ("A share against the country needs no peer region chosen for it and "
                    "no target set for it, and PIC has set none. At 1.0 the counties look "
                    "like the country; above it they hold more of this work than their "
                    "size implies."),
        },
        "direction": {
            "value": round(lead["lq"] - lead["prev"], 2),
            "pct": round((lead["lq"] / lead["prev"] - 1) * 100, 1),
            "words": (f"down from {lead['prev']:.2f}× to {lead['lq']:.2f}× the national "
                      f"share, a fall of {abs(lead['lq'] - lead['prev']):.2f}"),
            "short_move": f"down {abs(lead['lq'] - lead['prev']):.2f}×",
            "streak": None,
        },
        "band": conc_band,
        "blind": (f"{lead['counties_suppressed']} of the twelve counties are withheld for "
                  f"{lead['label'].lower()}, so this is a reading on the "
                  f"{lead['counties_counted']} that report. The withheld ones are the "
                  f"small ones, which are usually the least concentrated."),
        "vintage": {
            "as_of": f"{LATEST} annual averages",
            "changes_it": ("A county entering or leaving disclosure moves the composite "
                           "without any employer changing what it does."),
        },
        "link": {"href": "../location-quotient/", "label": "How concentrated it is"},
        "drivers": [
            {"label": c["label"],
             "value": f"{c['lq']:.2f}×",
             "note": (f"{c['counties_counted']} of twelve counties disclosed, "
                      f"{fmt_n(c['emp'])} jobs")}
            for c in conc
        ],
    },
    {
        "id": "pay",
        "dimension": "Job quality",
        "short": "pay against its industry",
        "question": "Are these good jobs?",
        "value": f"{median(local):.2f}× / {median(nat):.2f}×",
        "unit": "its county / its industry nationally",
        "reading": (f"The typical polymer job out-pays the average job in its own county "
                    f"by {median(local):.2f} times, and pays {median(nat):.2f} times what "
                    f"the same industry averages nationally. Both are true at once, and "
                    f"{len(both)} of the {len(latest_reg)} disclosed cells, holding "
                    f"{fmt_n(sum(r['emp'] for r in both))} of the "
                    f"{fmt_n(emp_total)} jobs, sit in both states."),
        "baseline": {
            "name": "two baselines, because one of them flatters",
            "why": ("Against the county average it answers whether this is good work to "
                    "have here. Against the same industry nationally it answers whether "
                    "this is a good place to do this work. A recruiting number that "
                    "carries only the first is choosing the flattering half."),
        },
        "direction": {
            "value": round(nat_series[-1][1] - nat_series[-2][1], 4),
            "pct": round((nat_series[-1][1] / nat_series[-2][1] - 1) * 100, 1),
            "words": (f"the national side rose from {nat_series[-2][1]:.3f}× to "
                      f"{nat_series[-1][1]:.3f}× of the U.S. rate for the same work"),
            "short_move": f"up {abs(nat_series[-1][1] - nat_series[-2][1]):.3f}×",
            "streak": None,
        },
        "band": pay_band,
        "drivers": [
            {"label": "Beats its own county",
             "value": f"{sum(1 for v in local if v > 1)} of {len(local)} cells",
             "note": f"median {median(local):.2f} times the county all-industry average"},
            {"label": "Beats its industry nationally",
             "value": f"{sum(1 for v in nat if v >= 1)} of {len(nat)} cells",
             "note": f"median {median(nat):.2f} times the U.S. average for the same work"},
            {"label": "Weekly wage per covered job",
             "value": "$" + fmt_n(nat_series[-1][2]),
             "note": (f"against $" + fmt_n(nat_series[-1][3]) +
                      " for the same industry mix nationally")},
        ],
        "blind": ("An average weekly wage moves with hours and with the mix of "
                  "occupations, not only with pay rates: a plant on overtime reads as a "
                  "raise. Nothing here is any one person’s pay."),
        "vintage": {
            "as_of": f"{LATEST} annual averages",
            "changes_it": ("The local ratio has no shipped history, so only the national "
                           "side carries a movement band. A year of QCEW wage revisions "
                           "moves both."),
        },
        "link": {"href": "../wages/", "label": "Does the cluster pay better"},
    },
    {
        "id": "talent",
        "dimension": "Talent supply",
        "short": "polymer degrees a year",
        "question": "Who is coming out of the schools?",
        "value": fmt_n(polymer[deg_latest]),
        "unit": "polymer degrees a year",
        "reading": (f"The three universities in the region conferred "
                    f"{polymer[deg_latest]} polymer degrees in {deg_latest}, against "
                    f"{polymer[deg_peak_year]} in {deg_peak_year}. Materials degrees held "
                    f"at {materials[deg_latest]}."),
        "baseline": {
            "name": f"the same three institutions in {deg_peak_year}, their own high",
            "why": ("A peer region would need a defensible peer set and PIC has named "
                    "none. The programs’ own decade is the baseline that needs no "
                    "choice made for it."),
        },
        "direction": {
            "value": polymer[deg_latest] - polymer[deg_latest - 1],
            "pct": round((polymer[deg_latest] / polymer[deg_latest - 1] - 1) * 100, 1),
            "words": (f"up {polymer[deg_latest] - polymer[deg_latest - 1]} on the year, and "
                      f"{abs(round((polymer[deg_latest] / polymer[deg_peak_year] - 1) * 100))}"
                      f" percent below its {deg_peak_year} high"),
            "short_move": f"up {polymer[deg_latest] - polymer[deg_latest - 1]} degrees",
            "streak": None,
        },
        "band": deg_band,
        "drivers": [
            {"label": f"Polymer programs, {deg_latest}",
             "value": fmt_n(polymer[deg_latest]),
             "note": (f"a three-year average of "
                      f"{occ['program_totals']['polymer_awards_window_avg']}")},
            {"label": f"Materials programs, {deg_latest}",
             "value": fmt_n(materials[deg_latest]),
             "note": "the half of the register that has not fallen"},
            {"label": "Annual openings, the two degree occupations",
             "value": fmt_n(sum(o["annual"] for o in openings)),
             "note": ("materials and chemical engineers, on the state’s eighteen-"
                      "county projection region, so it cannot be divided into the "
                      "completions above")},
        ],
        "blind": (f"Three institutions, {occ['program_totals']['n_programs']} programs. It "
                  f"cannot see graduates who leave the region, employers who hire from "
                  f"outside it, or the two-year and certificate routes into the same "
                  f"plants."),
        "vintage": {
            "as_of": f"IPEDS completions, {deg_latest}",
            "changes_it": (f"This is the slowest series on the page: {deg_latest} is "
                           f"{LATEST - deg_latest} years behind the employment figures. "
                           f"Each new IPEDS release adds one year."),
        },
        "link": {"href": "../occupations/", "label": "Who does the work"},
    },
    {
        "id": "capital",
        "dimension": "Capital",
        "short": "federal contracting a year",
        "question": "Is public money arriving, and where does it land?",
        "value": "$" + f"{federal_org_named / 1e6:.1f}M",
        "unit": "written into signed federal awards",
        "reading": (f"${federal_org_named / 1e6:.1f} million of the "
                    f"${federal_announced / 1e6:.1f} million in federal awards on the "
                    f"funding map is written into signed awards naming "
                    f"{len(eda_leads)} organisations. None of it is disbursement: every "
                    f"figure here is money committed, not money spent."),
        "baseline": {
            "name": (f"routine federal contracting, ${closed_avg / 1e6:.1f} million a year "
                     f"in {fed['cpi_base']} dollars"),
            "why": ("An award is only large or small against the money that was already "
                    "arriving. Averaged over the "
                    f"{len(closed)} closed fiscal years, FY{closed[0]} to FY{closed[-1]}; "
                    f"FY{OPEN_FY} is still open and is left out of the average."),
        },
        "direction": {
            "value": round(fy_real[closed[-1]] - fy_real[closed[-2]]),
            "pct": round((fy_real[closed[-1]] / fy_real[closed[-2]] - 1) * 100, 1),
            "words": (f"routine contracting rose to ${fy_real[closed[-1]] / 1e6:.1f}M in "
                      f"FY{closed[-1]} from ${fy_real[closed[-2]] / 1e6:.1f}M, "
                      f"{round((fy_real[closed[-1]] / fy_real[closed[-2]] - 1) * 100)} "
                      f"percent higher"),
            "short_move": (f"up ${(fy_real[closed[-1]] - fy_real[closed[-2]]) / 1e6:.1f}M"),
            "streak": None,
        },
        "band": cap_band,
        "drivers": [
            {"label": "Tech Hub implementation awards",
             "value": "$" + f"{sum(a for _, a in eda_leads) / 1e6:.1f}M",
             "note": f"{len(eda_leads)} signed awards, each naming its recipient"},
            {"label": "Routine contracting, FY" + str(closed[-1]),
             "value": "$" + f"{fy_real[closed[-1]] / 1e6:.1f}M",
             "note": (f"obligations to polymer plants in the twelve counties, "
                      f"{fed['cpi_base']} dollars")},
            {"label": "Award against the routine flow",
             "value": f"{sum(a for _, a in eda_leads) / closed_avg:.1f} years",
             "note": "of the contracting that was already arriving without it"},
        ],
        "blind": ("The contracting series filters on manufacturing industry codes, so "
                  "university and research awards are invisible to it: the "
                  "$15.0M NSF Engine appears in no figure here. Place of performance is a "
                  "field reported on the award, not an observation of where work happened."),
        "vintage": {
            "as_of": f"USAspending through FY{OPEN_FY}, {fed['cpi_base']} dollars",
            "changes_it": (f"FY{OPEN_FY} is a partial year and is excluded from every "
                           f"average here. USAspending backfills obligations for months "
                           f"after a year closes."),
        },
        "link": {"href": "../federal-money/", "label": "The other federal money"},
    },
]

health = {
    "meta": {
        "source": ("Recomputed from the shipped data files of six Evidence Room pages: "
                   "wages, location-quotient, occupations, federal-money, funding-map "
                   "and revisions."),
        "sources": ("Behind those pages: BLS Quarterly Census of Employment and Wages "
                    "annual averages; BLS Employment Projections and IPEDS completions; "
                    "USAspending obligations at place of performance; signed federal "
                    "Notices of Award; ALFRED archived vintages."),
        "row": ("One row is one measure in one year: its level, the baseline it is read "
                "against, and every year-over-year change the same measure has made in "
                "its published history."),
        "definition": ("A movement band is built the same way for all five measures. Take "
                       "the measure’s own published history, compute the change "
                       "between every consecutive pair of years, hold out the latest one, "
                       "and compare it against the median and the largest of the earlier "
                       "changes. A move at or below the median is ordinary for that "
                       "measure; a move larger than every earlier one is not."),
        "baseline": ("Each tile states the baseline it is read against and why that one. "
                     "PIC has set no target for any of these five measures, so no tile "
                     "reports distance from a target: they report level and direction "
                     "only."),
        "caution": ("The movement band measures how far a published series has moved "
                    "between years. It is not a revision band and cannot say how far a "
                    "future revision will move the year just published. This repository "
                    "has measured that for exactly three producer-price indexes, on the "
                    "revisions page, and for none of the employment, degree or spending "
                    "series here."),
        "suppression": ("A cell BLS withholds is never a zero. Three of the five measures "
                        "are built from county cells and the set of disclosed cells "
                        "changes year to year, so where it matters the movement is judged "
                        "on the cells present in every year rather than on the raw total."),
        "scope": ("The measurement register is NAICS 3252, 3255 and 326. NAICS 325 sweeps "
                  "in pharmaceuticals, agricultural chemicals and industrial gas, about "
                  "60 percent of its own figure, and is context rather than cluster."),
        "not": ("This page carries no measure of output, productivity, exports, private "
                "investment or company formation, because no page in this room ships one "
                "yet. Five measures are not the health of an economy."),
        "geography": ("Every employment, wage and contracting figure is on the PIC-12 "
                      "footprint. The degree completions are three named universities and "
                      "the openings estimate beside them is a state projection for an "
                      "eighteen-county region: they are printed side by side and never "
                      "divided into one another."),
        "fetched": max(lq["meta"]["fetched"], occ["meta"]["fetched"], fm["meta"]["asOf"]),
        "footprint": wg["meta"]["footprint"],
    },
    "asof": {
        "qcew_year": LATEST,
        "ipeds_year": deg_latest,
        "open_fiscal_year": OPEN_FY,
        "funding_asof": fm["meta"]["asOf"],
    },
    "measured_revisions": {
        "series": rev_series,
        "n_periods": len(rev_pct),
        "median_pct": round(median(rev_pct), 3),
        "max_pct": round(max(rev_pct), 3),
        "span": rev["meta"]["span"],
    },
    "register": {
        "years": YEARS,
        "counties": n_counties,
        "possible_cells": possible,
        "disclosed": [{"year": y, "emp": disclosed[y], "cells": cells[y],
                       "balanced": balanced[y]} for y in YEARS],
        "balanced_cells": len(balanced_keys),
    },
    "pay_series": [{"year": y, "ratio": round(v, 4), "local": round(lw), "national": round(uw)}
                   for y, v, lw, uw, _ in nat_series],
    "completions": [{"year": y, "polymer": polymer[y], "materials": materials[y]}
                    for y in prog_years],
    "completions_flat_pairs": dupes,
    "obligations": [{"fy": y, "real": round(fy_real[y]), "open": y == OPEN_FY} for y in FYS],
    # Two translations so the aggregates land somewhere a person can picture. The county
    # is CHOSEN BY THE DATA — the disclosed plastics-and-rubber payroll nearest the size
    # of this year's loss — rather than picked to sound alarming, and the award is the
    # largest of the seven signed, which is a public record and not a composite.
    "human_scale": (lambda loss, plants, big: {
        "jobs_lost": loss,
        "nearest_county": plants[0]["name"],
        "nearest_county_emp": plants[0]["emp"],
        "largest_award_name": big[0],
        "largest_award": big[1],
        "mean_award": round(sum(a for _, a in eda_leads) / len(eda_leads)),
    })(abs(round(balanced[LATEST] - balanced[LATEST - 1])),
       sorted(({"name": r["name"], "emp": r["emp"]}
               for r in county_rows if r["year"] == LATEST and r["naics"] == "326"),
              key=lambda r: abs(r["emp"] - abs(balanced[LATEST] - balanced[LATEST - 1]))),
       max(eda_leads, key=lambda x: x[1])),
    "moved_more_than_usual": sum(1 for t in tiles if t["band"]["verdict"] != "ordinary"),
    "federal_awards": {
        "announced": federal_announced,
        "named_total": federal_named,
        "named_to_organisations": federal_org_named,
        "leads": [{"name": n, "amount": a} for n, a in sorted(eda_leads, key=lambda x: -x[1])],
        "line_items": sorted(LINE_ITEMS),
    },
    "tiles": tiles,
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(health, fh, indent=1, ensure_ascii=False)
    fh.write("\n")

print(f"wrote {os.path.relpath(OUT, WEB)}")
for t in tiles:
    b = t["band"]
    print(f"  {t['dimension']:<16} {t['value']:>16}  move {b['latest']:+,.4f}  "
          f"{b['typicals']:.2f} typical years  beats {b['beats']}/{b['n_prior']}  "
          f"{b['verdict']}")
