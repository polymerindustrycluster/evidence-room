"""Build data/health.json for the cluster-health dashboard.

WHAT THIS IS
  Five measures of the Northeast Ohio polymer cluster, each recomputed from the shipped
  data file of the Evidence Room page that already publishes it. Nothing is fetched and
  nothing is typed: every figure on the dashboard is derived here, so a correction on a
  source page propagates on the next run and the claims harness fails until it does.

  Run from anywhere:  python3 cluster-health/derive_health.py

HOW FAR A MEASURE USUALLY MOVES, AND WHAT THAT IS NOT
  Each tile reports whether this year's move is unusual for that measure. The rule is one
  rule, applied identically to all five:

      take the same measure's own published history;
      compute the absolute change between every consecutive pair of years;
      hold out the latest change; that is the year being judged;
      the yardstick is the MEDIAN of the earlier changes, and the largest of them.

  The page draws the median as a reference line at 1.0 and the largest as a single upright
  mark per row. It used to draw the largest as a filled band from zero, which every bar
  sat inside by construction, so the caption said "nothing unusual here" while the labels
  beside it said the opposite.

  A move at or below the median is inside the range this measure normally moves between
  published years. A move larger than every earlier one is outside it. In between, the
  tile says how many earlier years it beats.

  This is a HISTORY yardstick, not a REVISION one. It says how far the series has moved
  between published years. It does not say how far a future revision will move the year
  just published, because for none of these five measures has anybody measured that. The
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


def standing(series, better_end):
    """WHERE A MEASURE SITS IN ITS OWN PUBLISHED RANGE.

    series = [(year, value), ...] ascending, every point on ONE basis.

    `band()` above answers "was this year's STEP unusual". It says nothing about whether
    the level is good or bad, and a reader who arrives asking how the cluster is doing
    gets a volatility reading out of it and nothing else. This is the other half: the
    level against the only reference this repository can use without inventing a goal —
    the same measure's own published years.

    `better_end` names which END of that range is the better one for the region, or None
    where the measure genuinely has no better end. Concentration is the None: the page's
    own text says a high share is the region's distinction and its exposure at once.

    THIS IS NOT A GRADE AND THE PAGE HAS TO SAY SO. Job quality sits at the TOP of its own
    range and is still below the national rate for the same work in every year of that
    range. A range position answers "against its own history"; it cannot answer "against
    where it ought to be", because nobody here has said where that is.

    Rank counts YEARS and the position uses VALUES, so the two can read differently when
    the years above a measure are bunched together. Both are reported rather than one
    being picked as the tidier of the two.
    """
    if len(series) < 4:
        raise ValueError("a standing range needs at least four years")
    vals = [v for _, v in series]
    lo, hi = min(vals), max(vals)
    if hi == lo:
        raise ValueError("a standing range needs a range")
    cur_year, cur = series[-1]
    rank = sum(1 for v in vals if v < cur) + 1        # 1 = the lowest published year
    n = len(series)
    if rank == 1:
        rank_words = f"lowest of {WORDS[n]} years"
    elif rank == n:
        rank_words = f"highest of {WORDS[n]} years"
    elif rank * 2 - 1 == n:
        rank_words = f"middle of {WORDS[n]} years"
    elif rank * 2 <= n:
        rank_words = f"{ORDINAL[rank].lower()} lowest of {WORDS[n]}"
    else:
        rank_words = f"{ORDINAL[n - rank + 1].lower()} highest of {WORDS[n]}"
    return {
        "value": round(cur, 6),
        "year": cur_year,
        "n_years": n,
        "span": [series[0][0], series[-1][0]],
        # The first year attaining the extreme. Every one of the five is unique today;
        # if a tie ever appears, the earlier year is named and the values still agree.
        "low": {"year": next(y for y, v in series if v == lo), "value": round(lo, 6)},
        "high": {"year": next(y for y, v in series if v == hi), "value": round(hi, 6)},
        "position": round((cur - lo) / (hi - lo), 4),
        "rank_from_low": rank,
        "rank_words": rank_words,
        "better_end": better_end,
        "series": [{"year": y, "value": round(v, 6)} for y, v in series],
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

# The three industry moves are read on EVERY county published this year; the headline 802
# is read on the smaller set published in every year. The two therefore do not agree, and
# a reader who adds the three finds this number instead of the headline, so the page has
# to print it rather than leave the subtraction to fail silently.
drivers_sum = sum(by_industry[n]["change"] for n in REGISTER)

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

# THE FIXED-SET COMPOSITE, and why this tile now reads its MOVEMENT off one.
#
# The Scale tile above refuses to read a movement off a moving county set. This tile did
# exactly that until 2026-09-01, and published a disclosure artefact as the largest move
# on the page. lq.json's composite sums whichever counties BLS disclosed that year over a
# denominator that always carries all twelve, because a county's TOTAL employment is never
# withheld and only its industry cell is. A county leaving disclosure therefore takes its
# jobs out of the numerator and leaves its whole workforce in the denominator, and the
# ratio falls with nobody changing what they do.
#
# Paint's published 2025 "fall" from 6.40x to 5.96x is that and nothing else. Two balanced
# readings say so and both are computed below rather than asserted: on the counties
# disclosed in BOTH of the last two years the composite ROSE, and on the five disclosed in
# all eleven it rose to the highest reading of the series.
#
# The construction is the location-quotient page's own published fixed-base line (its
# disclosure-twist section, claim lq-paint-fixed-base), recomputed here from the same
# shipped cells so the two pages cannot drift apart. The national share is recovered by
# inverting the bureau's own definition, lq = (emp / local_total) / nat, from every
# disclosed county; they agree to better than one part in a thousand, which is the check
# that this is the bureau's arithmetic and not a reconstruction of it.
LQ_CNTY = [a["code"] for a in lq["areas"] if a["code"] not in ("39000", "US000")]
LQ_NAME = {a["code"]: a["name"] for a in lq["areas"]}


def nat_share(year, naics):
    v = [(c["emp"] / c["local_total"]) / c["lq"] for c in lq["cells"]
         if c["year"] == year and c["naics"] == naics and c["lq"] and c["emp"]
         and c["local_total"] and c["area"] in LQ_CNTY]
    if not v:
        raise ValueError(f"no disclosed county cell for {naics} in {year}")
    if max(v) / min(v) - 1 > 1e-3:
        raise ValueError(f"disclosed counties disagree on the national share, {naics} {year}")
    return sum(v) / len(v)


def disclosed_in(year, naics):
    return {a for a in LQ_CNTY
            if any(c["year"] == year and c["area"] == a and c["naics"] == naics and c["lq"]
                   for c in lq["cells"])}


def region_jobs(year):
    """The LQ's own denominator: every county's total employment across all owners.

    Read off whichever industry row carries it, because the builder writes local_total on
    every row of a county-year including the withheld ones. That is the whole mechanism
    this section is about, so it is taken from the file rather than assumed.
    """
    seen = {c["area"]: c["local_total"] for c in lq["cells"]
            if c["year"] == year and c["area"] in LQ_CNTY and c["local_total"]}
    if len(seen) != len(LQ_CNTY):
        raise ValueError(f"missing a county workforce total in {year}")
    return sum(seen.values())


def composite_on(year, naics, counties):
    sel = [c for c in lq["cells"]
           if c["year"] == year and c["naics"] == naics and c["area"] in counties]
    return (sum(c["emp"] for c in sel) / region_jobs(year)) / nat_share(year, naics)


def fixed_series(naics):
    """Concentration on the counties BLS discloses in EVERY year.

    The concentration analogue of the Scale tile's balanced panel. The denominator is the
    same always-disclosed counties, not the whole region, so the level is a reading on a
    narrower geography than the tile's headline and may never travel unlabelled.
    """
    always = sorted(set.intersection(*(disclosed_in(y, naics) for y in lq_years)))
    out = []
    for y in lq_years:
        sel = [c for c in lq["cells"]
               if c["year"] == y and c["naics"] == naics and c["area"] in always]
        out.append((y, (sum(c["emp"] for c in sel) / sum(c["local_total"] for c in sel))
                       / nat_share(y, naics)))
    return always, out


fixed_counties, fixed_lead = fixed_series(lead["naics"])
fixed_now, fixed_prev = fixed_lead[-1][1], fixed_lead[-2][1]
conc_band = band(fixed_lead)

# Who moved in and out of the published set between the last two years, and what the
# composite does on the counties that stayed in it. Both are derived, so the tile names
# the mechanism instead of asserting it.
d_prev, d_now = disclosed_in(LATEST - 1, lead["naics"]), disclosed_in(LATEST, lead["naics"])
left = sorted(d_prev - d_now, key=lambda a: -next(
    c["emp"] for c in lq["cells"]
    if c["year"] == LATEST - 1 and c["area"] == a and c["naics"] == lead["naics"]))
entered = sorted(d_now - d_prev)
cell_of = lambda y, a: next(c for c in lq["cells"] if c["year"] == y and c["area"] == a
                            and c["naics"] == lead["naics"])
pair = {y: composite_on(y, lead["naics"], d_prev & d_now) for y in (LATEST - 1, LATEST)}

# The three readings of the same year-on-year move, and whether they agree. The tile only
# claims a disclosure artefact when the published basis and the two balanced ones actually
# disagree in SIGN; when they agree it says so plainly instead.
moved_pub = lead["lq"] - lead["prev"]
moved_pair = pair[LATEST] - pair[LATEST - 1]
moved_fixed = fixed_now - fixed_prev
artefact = (moved_pub < 0) != (moved_fixed < 0) and (moved_pub < 0) != (moved_pair < 0)


def _swap_phrase():
    out = ", ".join(f"{LQ_NAME[a]} ({fmt_n(cell_of(LATEST - 1, a)['emp'])} jobs at "
                    f"{cell_of(LATEST - 1, a)['lq']:.2f} times the national share)"
                    for a in left)
    inn = ", ".join(f"{LQ_NAME[a]} ({fmt_n(cell_of(LATEST, a)['emp'])} jobs at "
                    f"{cell_of(LATEST, a)['lq']:.2f} times)" for a in entered)
    if left and entered:
        return f"{out} left the published set and {inn} entered it"
    if left:
        return f"{out} left the published set"
    if entered:
        return f"{inn} entered the published set"
    return "the published set did not change"

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
WORDS = {0: "no", 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six",
         7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve"}
ORDINAL = {1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth", 6: "sixth",
           7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth"}


def fmt_n(v):
    return f"{round(v):,}"


tiles = [
    {
        "id": "scale",
        "dimension": "Scale",
        "short": "jobs counted",
        "question": "How many jobs is this?",
        "value": fmt_n(disclosed[LATEST]),
        "unit": f"jobs, every county figure published for {LATEST}",
        # TWO TOTALS FOR ONE YEAR, AND BOTH ARE RIGHT. A reader met 24,030 in the hero and
        # 23,457 in the standfirst and could not reconcile them. They are two bases: the
        # LEVEL counts every cell BLS published this year, the TREND counts only the cells
        # published in every year, because that is the only set a three-year run can be
        # read off. Neither is fixable into the other and neither may travel unlabelled.
        "bases": {
            "level": {"value": disclosed[LATEST], "display": fmt_n(disclosed[LATEST]),
                      "cells": cells[LATEST], "of_cells": possible,
                      "label": f"every county figure published for {LATEST}",
                      "why": ("A level is the fullest count the bureau published for the "
                              "year, and it is a floor, because a withheld figure is not "
                              "a zero.")},
            "trend": {"value": balanced[LATEST], "display": fmt_n(balanced[LATEST]),
                      "cells": len(balanced_keys), "of_cells": possible,
                      "label": (f"the {len(balanced_keys)} county figures published in "
                                f"every year since {YEARS[0]}"),
                      "why": ("A trend needs one fixed set of counties, or the bureau’s "
                              "disclosure decisions read as jobs appearing and vanishing. "
                              "This is the only basis that supports the three-year run.")},
            "note": (f"Two totals for {LATEST}, on two bases, both correct. "
                     f"{fmt_n(disclosed[LATEST])} is every published figure; "
                     f"{fmt_n(balanced[LATEST])} is the fixed set. They differ by "
                     f"{fmt_n(disclosed[LATEST] - balanced[LATEST])} jobs, which is the "
                     f"counties that report in some years and not others."),
        },
        "reading": (f"{fmt_n(disclosed[LATEST])} jobs in the three industries the cluster "
                    f"measures itself by, counted across the twelve counties in "
                    f"{LATEST}, on every county figure the bureau published for the year. "
                    f"It is a floor rather than a total: the Bureau of Labor "
                    f"Statistics publishes one figure per county per industry, and it "
                    f"withheld {possible - cells[LATEST]} of the {possible} to keep single "
                    f"employers unidentifiable."),
        "means": (f"That count cannot carry a trend, because the set of counties in it "
                  f"changes from year to year. On the {len(balanced_keys)} county figures "
                  f"published in every year since {YEARS[0]}, the only run that holds the "
                  f"same set of counties still, the total went "
                  f"{fmt_n(balanced[LATEST - 2])} in {LATEST - 2}, "
                  f"then {fmt_n(balanced[LATEST - 1])}, then {fmt_n(balanced[LATEST])}. "
                  f"That is the {ORDINAL[falling]} straight fall, and fewer jobs is the "
                  f"bad direction here. The two totals for {LATEST} differ by "
                  f"{fmt_n(disclosed[LATEST] - balanced[LATEST])} jobs and each is "
                  f"labelled wherever it appears."),
        "standing": dict(standing([(y, balanced[y]) for y in YEARS], "high"),
                         basis=(f"the {len(balanced_keys)} county figures published in "
                                f"every year since {YEARS[0]}"),
                         basis_short="jobs on the fixed county set",
                         merit_short="more jobs is better",
                         merit=("More jobs is the better end of this range. Nobody has "
                                "set a number the region is aiming at, so the range is "
                                "its own decade and not a goal."),
                         fmt="n"),
        "baseline": {
            "name": f"the same county figures in {LATEST - 1}",
            "why": ("A year is the shortest step this series takes, and comparing the "
                    "same set of counties is the only way to hold the measurement frame "
                    "still while the economy moves."),
        },
        "direction": {
            "value": round(balanced[LATEST] - balanced[LATEST - 1]),
            "pct": round((balanced[LATEST] / balanced[LATEST - 1] - 1) * 100, 1),
            "words": (f"down {abs(round(balanced[LATEST] - balanced[LATEST - 1])):,} jobs, "
                      f"{abs(round((balanced[LATEST] / balanced[LATEST - 1] - 1) * 100, 1))} "
                      f"percent, on the county figures published in both years"),
            "short_move": f"down {abs(round(balanced[LATEST] - balanced[LATEST - 1])):,} jobs",
            "of": "on the county figures published in both years",
            "raw": round(disclosed[LATEST] - disclosed[LATEST - 1]),
            "streak": falling,
        },
        "band": scale_band,
        "blind": (f"{possible - cells[LATEST]} of the {possible} county-by-industry "
                  f"figures are withheld so no employer can be identified from them. A "
                  f"withheld figure is not a zero, and the jobs behind it are not in the "
                  f"{fmt_n(disclosed[LATEST])}."),
        "vintage": {
            "as_of": f"{LATEST} annual averages",
            "changes_it": ("The Bureau of Labor Statistics revises these county figures, "
                           "which come from its Quarterly Census of Employment and Wages, "
                           "when employers refile. A new annual release replaces this "
                           "figure outright."),
        },
        "link": {"href": "../wages/", "label": "What the work pays"},
        "drivers": [
            {"label": by_industry["326"]["label"],
             "value": f"down {abs(by_industry['326']['change']):,.0f} jobs",
             "note": (f"{fmt_n(by_industry['326']['latest'])} jobs, all twelve counties "
                      f"published in both years")},
            {"label": by_industry["3255"]["label"],
             "value": f"down {abs(by_industry['3255']['change']):,.0f} jobs",
             "note": (f"{fmt_n(by_industry['3255']['latest'])} jobs across "
                      f"{WORDS[by_industry['3255']['cells_latest']]} published counties, "
                      f"the same count as last year")},
            {"label": by_industry["3252"]["label"],
             "value": f"up {abs(by_industry['3252']['change']):,.0f} jobs",
             "note": (f"a county came back into disclosure, from "
                      f"{WORDS[by_industry['3252']['cells_prev']]} counties to "
                      f"{WORDS[by_industry['3252']['cells_latest']]}, so this rise is "
                      f"partly the bureau publishing more")},
        ],
        "drivers_note": (f"Add these three and you get a fall of "
                         f"{abs(round(drivers_sum)):,}, "
                         f"which is the change across every county published this year. "
                         f"The {abs(round(balanced[LATEST] - balanced[LATEST - 1])):,} "
                         f"above is measured on the smaller set published in both years, "
                         f"so the two differ and the three do not sum to it."),
    },
    {
        "id": "concentration",
        "dimension": "Distinctiveness",
        "short": "paint against the U.S. share",
        "question": "Is this cluster unusual, or just present?",
        "value": f"{lead['lq']:.2f}×",
        "unit": f"the national share, on every county published for {LATEST}",
        # TWO READINGS FOR ONE YEAR, AND BOTH ARE RIGHT, exactly as the Scale tile above.
        # The LEVEL is every county the bureau published; the MOVEMENT and the range are
        # the counties it published in every year, because the published set moves and a
        # ratio built on a moving set falls when disclosure thins. Neither is fixable into
        # the other and neither may travel unlabelled.
        "bases": {
            "level": {"value": lead["lq"], "display": f"{lead['lq']:.2f}×",
                      "cells": lead["counties_counted"], "of_cells": 12,
                      "label": f"every county figure published for {LATEST}",
                      "why": ("A level is the fullest reading the bureau published for the "
                              "year, and it is a floor. A withheld county leaves the "
                              "numerator and stays in the denominator, because its total "
                              "workforce is published even when its industry cell is not, "
                              "so thinner disclosure pushes this number down by itself.")},
            "trend": {"value": round(fixed_now, 4), "display": f"{fixed_now:.2f}×",
                      "cells": len(fixed_counties), "of_cells": 12,
                      "label": (f"the {WORDS[len(fixed_counties)]} counties published in "
                                f"every year since {lq_years[0]}"),
                      "why": ("A trend needs one fixed set of counties, or the bureau’s "
                              "disclosure decisions read as concentration appearing and "
                              "vanishing. This is the only basis on which the move below "
                              "is a move in the economy, and it is the fixed base the "
                              "concentration page already publishes.")},
            "note": (f"Two readings for {LATEST}, on two bases, both correct. "
                     f"{lead['lq']:.2f}× is every county the bureau published; "
                     f"{fixed_now:.2f}× is the {WORDS[len(fixed_counties)]} counties it "
                     f"published in every one of the {WORDS[len(lq_years)]} years. The "
                     f"second is higher because it drops counties whose "
                     f"{lead['label'].lower()} jobs are withheld while their whole "
                     f"workforce still counts. They are readings on different geographies "
                     f"and neither is a correction of the other."),
        },
        "reading": (f"{lead['label']} is the most concentrated of the three: these twelve "
                    f"counties hold about {WORDS[round(lead['lq'])]} times the share of it "
                    f"that the country does. Plastics and rubber, the industries the region "
                    f"is known for, run "
                    f"{[c for c in conc if c['naics'] == '326'][0]['lq']:.2f} times."),
        "means": (f"A high share cuts both ways. {WORDS[round(lead['lq'])].capitalize()} "
                  f"times the country’s concentration is what makes these counties worth "
                  f"a buyer’s flight, and it is what ties local payroll to one industry’s "
                  f"cycle. " + (
                  f"The published reading fell this year and the fall is the bureau’s "
                  f"rather than the region’s: {_swap_phrase()}, and a county that goes "
                  f"withheld takes its jobs out of the top of the ratio while its whole "
                  f"workforce stays in the bottom. Both balanced readings rose. On the "
                  f"{WORDS[len(d_prev & d_now)]} counties published in both years the "
                  f"composite went {pair[LATEST - 1]:.2f}× to {pair[LATEST]:.2f}×, and on "
                  f"the {WORDS[len(fixed_counties)]} published in every year it reached "
                  f"{fixed_now:.2f}×, the highest of the {WORDS[len(lq_years)]}. Nothing "
                  f"here moved a step toward looking like the country."
                  if artefact else
                  f"On the {WORDS[len(fixed_counties)]} counties published in every year, "
                  f"the only basis a move can be read off, it went {fixed_prev:.2f}× to "
                  f"{fixed_now:.2f}×. The published reading moved the same way, so this "
                  f"one is the region and not the bureau’s disclosure.")),
        # THE ONE MEASURE WITH NO BETTER END, and the page says so rather than colouring
        # it as if it had one. A reader was told the longest bar on the movement chart was
        # the measure the page itself calls double-edged; encoding merit here without
        # admitting this exception would repeat that in a new place.
        "standing": dict(standing(fixed_lead, None),
                         basis=(f"the same composite for {lead['label'].lower()} on the "
                                f"{WORDS[len(fixed_counties)]} counties published in every "
                                f"year, {lq_years[0]} to {lq_years[-1]}"),
                         basis_short="paint on the fixed county set",
                         merit_short="no better end",
                         merit=("This measure has no better end. A high share is what "
                                "makes these counties worth a buyer’s flight and what "
                                "ties local payroll to one industry’s cycle, so a move "
                                "in either direction buys one and costs the other. It is "
                                "shown here without a merit direction rather than being "
                                "given one it does not have."),
                         fmt="x2"),
        "baseline": {
            "name": "1.0 times, the national share of employment",
            "why": ("A share against the country needs no peer region chosen for it and "
                    "no target set for it, and PIC has set none. At 1.0 the counties look "
                    "like the country; above it they hold more of this work than their "
                    "size implies."),
        },
        # ON THE FIXED SET, like the Scale tile's move. The published-basis change is
        # kept as `raw` because the page prints it in the tile's own prose and a reader
        # who subtracts 6.40 from 5.96 must find it here rather than a contradiction.
        "direction": {
            "value": round(moved_fixed, 2),
            "pct": round((fixed_now / fixed_prev - 1) * 100, 1),
            "words": (f"{'up' if moved_fixed >= 0 else 'down'} from {fixed_prev:.2f}× to "
                      f"{fixed_now:.2f}× the national share, a "
                      f"{'rise' if moved_fixed >= 0 else 'fall'} of {abs(moved_fixed):.2f}, "
                      f"on the {WORDS[len(fixed_counties)]} counties published in every "
                      f"year"),
            "short_move": (f"{'up' if moved_fixed >= 0 else 'down'} {abs(moved_fixed):.2f}, "
                           f"to {fixed_now:.2f}×"),
            "of": "on the counties published in every year",
            "raw": round(moved_pub, 2),
            "streak": None,
        },
        "band": conc_band,
        "blind": (f"{WORDS[lead['counties_suppressed']].capitalize()} of the twelve "
                  f"counties are withheld for {lead['label'].lower()}, so the "
                  f"{lead['lq']:.2f}× is a reading on the {WORDS[lead['counties_counted']]} "
                  f"that report. Their workforce still counts in the bottom of the ratio, "
                  f"so that reading is a floor and it sags whenever the bureau publishes "
                  f"less. The move and the range are read on the fixed set for that reason. "
                  f"What no basis here can see is the withheld counties themselves."),
        "vintage": {
            "as_of": f"{LATEST} annual averages",
            "changes_it": ("A county entering or leaving disclosure moves the published "
                           "composite without any employer changing what it does, which is "
                           "why the move and the range on this tile are read on the "
                           "counties published in every year."),
        },
        "link": {"href": "../location-quotient/", "label": "How concentrated it is"},
        "drivers": [
            {"label": c["label"],
             "value": f"{c['lq']:.2f}×",
             "note": (f"{WORDS[c['counties_counted']]} of twelve counties published, "
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
        # Two numbers in one tile read as one figure with a slash in it. Split them so
        # each carries its own label instead of asking the reader to pair by position.
        "value_parts": [
            {"v": f"{median(local):.2f}×", "k": "the average job in its own county"},
            {"v": f"{median(nat):.2f}×", "k": "the same industry across the country"},
        ],
        "reading": (f"The typical polymer job out-pays the average job in its own county "
                    f"by {median(local):.2f} times, and pays {median(nat):.2f} times what "
                    f"the same industry averages nationally. Both are true at once, and "
                    f"{len(both)} of the {len(latest_reg)} published county figures, holding "
                    f"{fmt_n(sum(r['emp'] for r in both))} of the "
                    f"{fmt_n(emp_total)} jobs, sit in both states."),
        # THE EXAMPLE THAT KEEPS THE RANGE HONEST. This measure is at the TOP of its own
        # published range and below the national rate for the same work in every year of
        # it. A range position is a comparison with its own history and nothing more; read
        # as a grade it would say the pay question is solved, which it is not.
        "standing": dict(standing([(y, v) for y, v, _, _, _ in nat_series], "high"),
                         basis=(f"the same median ratio against the national rate, "
                                f"{YEARS[0]} to {YEARS[-1]}"),
                         basis_short="pay against its industry",
                         merit_short="nearer parity is better",
                         merit=(f"Closer to the national rate is the better end. It has "
                                f"not reached it: the ratio is under 1.0 in every one of "
                                f"the {WORDS[len(nat_series)]} published years, so the "
                                f"best year in this range is still a year paying less "
                                f"than the country does for the same work."),
                         fmt="x3"),
        "baseline": {
            "name": "two baselines, because one of them flatters",
            "why": ("Against the county average it answers whether this is good work to "
                    "have here; against the same industry nationally, whether this is a "
                    "good place to do it. A recruiting number that carries only the first "
                    "is choosing the flattering half."),
        },
        "direction": {
            "value": round(nat_series[-1][1] - nat_series[-2][1], 4),
            "pct": round((nat_series[-1][1] / nat_series[-2][1] - 1) * 100, 1),
            "words": (f"the national side rose from {nat_series[-2][1]:.3f}× to "
                      f"{nat_series[-1][1]:.3f}× of the U.S. rate for the same work"),
            "short_move": (f"up {abs(nat_series[-1][1] - nat_series[-2][1]):.2f}, "
                           f"to {nat_series[-1][1]:.2f}×"),
            "of": "on the year, on the national side",
            "streak": None,
        },
        "band": pay_band,
        "drivers": [
            {"label": "Beats its own county",
             "value": f"{sum(1 for v in local if v > 1)} of {len(local)} counties",
             "note": f"median {median(local):.2f} times the county all-industry average"},
            {"label": "Beats its industry nationally",
             "value": f"{sum(1 for v in nat if v >= 1)} of {len(nat)} counties",
             "note": f"median {median(nat):.2f} times the U.S. average for the same work"},
            {"label": "Weekly wage per covered job",
             "value": "$" + fmt_n(nat_series[-1][2]),
             "note": (f"against $" + fmt_n(nat_series[-1][3]) +
                      " for the same industry mix nationally")},
        ],
        "blind": ("An average weekly wage moves with hours and with the mix of "
                  "occupations as much as with pay rates: a plant on overtime reads as a "
                  "raise. Nothing here is any one person’s pay."),
        "vintage": {
            "as_of": f"{LATEST} annual averages",
            "changes_it": ("The local ratio has no published history here, so only the "
                           "national side can be judged against its own past. A year of "
                           "wage revisions moves both."),
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
        "reading": (f"The polymer degrees come from "
                    f"{WORDS[len({p['institution'] for p in occ['programs'] if p['group'] == 'polymer'})]}"
                    f" of the three institutions counted here, and they conferred "
                    f"{polymer[deg_latest]} in {deg_latest}, against "
                    f"{polymer[deg_peak_year]} in {deg_peak_year}, their own high. "
                    f"Materials degrees, the other group of programs, held at "
                    f"{materials[deg_latest]}."),
        "standing": dict(standing([(y, polymer[y]) for y in prog_years], "high"),
                         basis=(f"the same three institutions, {prog_years[0]} to "
                                f"{prog_years[-1]}"),
                         basis_short="polymer degrees a year",
                         merit_short="more degrees is better",
                         merit=("More degrees out of the three programs is the better "
                                "end. Nobody has set a number the region needs, and this "
                                "range cannot see the two-year and certificate routes "
                                "into the same plants."),
                         fmt="n"),
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
            "of": "on the year",
            "streak": None,
        },
        "band": deg_band,
        "drivers": [
            {"label": f"Polymer programs, {deg_latest}",
             "value": fmt_n(polymer[deg_latest]),
             "note": (f"against a three-year average of "
                      f"{occ['program_totals']['polymer_awards_window_avg']}")},
            {"label": f"Materials programs, {deg_latest}",
             "value": fmt_n(materials[deg_latest]),
             "note": "the group of programs that has not fallen"},
            {"label": "Annual openings, the two degree occupations",
             "value": fmt_n(sum(o["annual"] for o in openings)),
             "note": ("materials and chemical engineers, on the state’s "
                      "eighteen-county projection region, which is why it is not divided "
                      "into the completions")},
        ],
        "blind": (f"{WORDS[len(occ['program_totals']['institutions'])].capitalize()} "
                  f"institutions, {occ['program_totals']['n_programs']} programs. It cannot "
                  f"see graduates who leave the region, employers who hire from outside it, "
                  f"or the two-year and certificate routes into the same plants."),
        "vintage": {
            "as_of": (f"{deg_latest}, from IPEDS, the federal survey every college "
                      f"reports its completed degrees to"),
            "changes_it": (f"This is the slowest series on the page: {deg_latest} is "
                           f"{WORDS[LATEST - deg_latest]} years behind the employment "
                           f"figures. Each new IPEDS release adds one year."),
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
        # WHAT THE RECORD SHOWS, AND WHAT IT CANNOT. This tile used to say "none of it
        # spent", which a reader finished believing was a measured zero. It is not: the
        # public record shows AWARD and EXECUTION and never DRAWDOWN, so a fully assigned
        # award that has paid out nothing and one that has paid out everything are the
        # same document here. Stating zero is as much a claim as stating a number, and
        # this page may state neither. _data/FIGURES.json carries the rule.
        "reading": (f"${federal_org_named / 1e6:.1f} million of the "
                    f"${federal_announced / 1e6:.1f} million in federal awards on the "
                    f"funding map is written into signed awards naming "
                    f"{WORDS[len(eda_leads)]} organizations. That is what the record "
                    f"shows: money signed for and assigned to a named recipient. How much "
                    f"of it has been paid out is a different quantity, and no figure on "
                    f"this page or in the public record is a measure of it."),
        "means": (f"A bigger number here is good news for the region only once the money "
                  f"reaches the ground, and nothing published tracks that. Read "
                  f"${federal_org_named / 1e6:.1f}M as a queue with "
                  f"{WORDS[len(eda_leads)]} names on it, of unknown length. The change "
                  f"printed beside it, up "
                  f"${(fy_real[closed[-1]] - fy_real[closed[-2]]) / 1e6:.2f}M, belongs to "
                  f"a different series: the year-on-year move in routine contracting, "
                  f"money already flowing to plants here."),
        "standing": dict(standing([(y, fy_real[y]) for y in closed], "high"),
                         basis=(f"routine contracting in the {WORDS[len(closed)]} closed "
                                f"fiscal years, FY{closed[0]} to FY{closed[-1]}, in "
                                f"{fed['cpi_base']} dollars"),
                         basis_short="routine contracting a year",
                         merit_short="more arriving is better",
                         year_prefix="FY",
                         merit=("More federal money actually contracted to plants here is "
                                "the better end, and this is the one capital series on "
                                "the page that is money arriving rather than money "
                                "promised. The signed awards above have no standing here "
                                "at all, because drawdown is not published."),
                         fmt="usd_m2"),
        "baseline": {
            "name": (f"routine federal contracting, ${closed_avg / 1e6:.1f} million a year "
                     f"in {fed['cpi_base']} dollars"),
            "why": ("An award is only large or small against the money that was already "
                    "arriving. Averaged over the "
                    f"{WORDS[len(closed)]} closed fiscal years, FY{closed[0]} to "
                    f"FY{closed[-1]}; "
                    f"FY{OPEN_FY} is still open and is left out of the average."),
        },
        "direction": {
            "value": round(fy_real[closed[-1]] - fy_real[closed[-2]]),
            "pct": round((fy_real[closed[-1]] / fy_real[closed[-2]] - 1) * 100, 1),
            # TWO DECIMALS, BECAUSE THE SUBTRACTION IS PRINTED. At one decimal this read
            # "rose to $39.0M from $22.5M ... up $16.4M", and 39.0 - 22.5 is 16.5. Both
            # ends were correctly rounded and the sentence still failed the only check a
            # reader can run on it in their head. Rounded to hundredths the three figures
            # close: 38.98 - 22.54 = 16.44. A claim in claims.json asserts that they do.
            "words": (f"routine contracting rose to ${fy_real[closed[-1]] / 1e6:.2f}M in "
                      f"FY{closed[-1]} from ${fy_real[closed[-2]] / 1e6:.2f}M, a rise of "
                      f"${(fy_real[closed[-1]] - fy_real[closed[-2]]) / 1e6:.2f}M and "
                      f"{round((fy_real[closed[-1]] / fy_real[closed[-2]] - 1) * 100)} "
                      f"percent higher"),
            # The tile prints $51.0M of signed awards and this move underneath it. They
            # are different series, so the label says which one moved rather than letting
            # the layout imply it is the award pile growing.
            "short_move": (f"Contracting up "
                           f"${(fy_real[closed[-1]] - fy_real[closed[-2]]) / 1e6:.2f}M"),
            "of": (f"in routine contracting on the year, which is not the "
                   f"${federal_org_named / 1e6:.1f}M above"),
            "streak": None,
        },
        "band": cap_band,
        "drivers": [
            {"label": "Signed awards",
             "value": "$" + f"{sum(a for _, a in eda_leads) / 1e6:.1f}M",
             "note": (f"{WORDS[len(eda_leads)].capitalize()} awards under the federal Tech "
                      f"Hubs program, each one a signed document naming its recipient")},
            {"label": "Routine contracting, FY" + str(closed[-1]),
             "value": "$" + f"{fy_real[closed[-1]] / 1e6:.2f}M",
             "note": (f"federal contracts and grants written to polymer plants in the "
                      f"twelve counties, in {fed['cpi_base']} dollars, against "
                      f"${fy_real[closed[-2]] / 1e6:.2f}M the year before")},
            {"label": "The award, in years of routine contracting",
             "value": f"{sum(a for _, a in eda_leads) / closed_avg:.1f} years",
             "note": (f"${sum(a for _, a in eda_leads) / 1e6:.1f}M divided by the "
                      f"${closed_avg / 1e6:.1f}M a year that was already arriving")},
        ],
        "blind": ("How much of the signed money has actually been paid out: no public "
                  "record exists. The record shows what was awarded and what was assigned "
                  "to a recipient, never what was drawn down, so a fully assigned award "
                  "that has disbursed nothing and one that has disbursed everything look "
                  "identical here. This page therefore states no disbursed amount, and "
                  "that includes not stating a zero. The contracting series also filters "
                  "on manufacturing industry codes, so university and research awards are "
                  "invisible to it: a $15.0M National Science Foundation Engines award "
                  "appears in no figure here. Place of performance is a field reported on "
                  "the award, not an observation of where work happened."),
        "vintage": {
            "as_of": (f"USAspending, the government’s own record of what it contracts and "
                      f"grants, through FY{OPEN_FY} in {fed['cpi_base']} dollars"),
            "changes_it": (f"FY{OPEN_FY} is a partial year and is excluded from every "
                           f"average here. USAspending keeps adding awards for months "
                           f"after a year closes."),
        },
        "link": {"href": "../federal-money/", "label": "The other federal money"},
    },
]

health = {
    "meta": {
        "source": ("Recomputed from the published data files of six pages in the Evidence "
                   "Room, PIC’s public data archive: wages, concentration, occupations, "
                   "federal money, the funding map and revisions."),
        "sources": ("Behind those pages: annual average employment and wages from the "
                    "Quarterly Census of Employment and Wages, the count the Bureau of "
                    "Labor Statistics builds from state unemployment-insurance filings; "
                    "BLS Employment Projections and completed degrees from IPEDS, the "
                    "federal survey every college reports to; award and contract records "
                    "from USAspending, filed against the place of performance the award "
                    "names; the signed award documents themselves; and archived earlier "
                    "releases of the price series from ALFRED, the Federal Reserve’s "
                    "archive of what each statistic said on the day it was published."),
        "row": ("One row is one measure in one year: its level, the baseline it is read "
                "against, and every year-over-year change the same measure has made in "
                "its published history."),
        "definition": ("How far a measure usually moves is worked out the same way for "
                       "all five. Take the measure’s own published history, compute the "
                       "change between every consecutive pair of years, hold out the "
                       "latest one, and compare it against the median and the largest of "
                       "the earlier changes. A move at or below the median is an ordinary "
                       "year for that measure, which by construction about half of years "
                       "are; a move larger than every earlier one has no precedent in the "
                       "series."),
        "baseline": ("Each tile states the baseline it is read against and why that one. "
                     "PIC has set no target for any of these five measures, so no tile "
                     "reports distance from a target. What each tile does report instead "
                     "is where the level sits in the same measure’s own published range, "
                     "which end of that range is the better one for the region where "
                     "there is one, and how far this year’s step was by that measure’s "
                     "own history. The five are never added into a score, because that "
                     "would need weights nobody has set."),
        "caution": ("What is measured here is how far a published series has moved "
                    "between years. That is not the same as how far a future revision "
                    "will move the year just published, which this repository has "
                    "measured for exactly three producer-price indexes (the prices "
                    "factories charge for their output), on the revisions page, and for "
                    "none of the employment, degree or spending series here."),
        "suppression": ("A county figure the bureau withholds is never a zero. Three of "
                        "the five measures are built from one figure per county per "
                        "industry, and the set the bureau publishes changes year to year, "
                        "so for those three the movement is judged on the figures present "
                        "in every year rather than on the raw total."),
        "scope": ("The three industries counted here are the census codes for resin and "
                  "synthetic rubber (3252), paint and coatings (3255) and plastics and "
                  "rubber products (326). The wider chemicals code 325 sweeps in "
                  "pharmaceuticals, agricultural chemicals and industrial gas, about 60 "
                  "percent of its own figure, and is context rather than cluster."),
        "not": ("This page carries no measure of output, productivity, exports, private "
                "investment or company formation, because no page in this room ships one "
                "yet. Five measures are not the health of an economy."),
        "geography": ("Every employment, wage and contracting figure is on the twelve "
                      "counties PIC treats as its region. The degree completions are three named universities and "
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
    # THE STANDING READING, counted rather than asserted. Four of the five have a better
    # end; one does not, and the page names it rather than colouring it in. The five are
    # never added together: a single score needs weights, nobody here has set any, and a
    # composite built on weights an author picked would be the target this page keeps
    # saying it does not have.
    "standing_summary": {
        "with_merit": [t["dimension"] for t in tiles if t["standing"]["better_end"]],
        "without_merit": [t["dimension"] for t in tiles if not t["standing"]["better_end"]],
        # Extremes are only reported for measures that HAVE a better end. The lowest year
        # of a measure with no better end is not a bad year, it is just a low one.
        "at_own_low": [t["dimension"] for t in tiles if t["standing"]["better_end"]
                       and t["standing"]["rank_from_low"] == 1],
        "at_own_high": [t["dimension"] for t in tiles if t["standing"]["better_end"]
                        and t["standing"]["rank_from_low"] == t["standing"]["n_years"]],
        "reference": "each measure’s own published years, which nobody had to choose",
        "not_a_score": ("The five are not combined. A single cluster score needs weights "
                        "saying how much a job is worth against a degree against a dollar, "
                        "and nobody has set any; a composite built on weights an author "
                        "picked would be exactly the target this page says it does not "
                        "have."),
        "not_a_grade": ("A position in a measure’s own range is a comparison with its own "
                        "history and nothing more. Job quality sits at the top of its "
                        "range and is below the national rate for the same work in every "
                        "year of that range, so the top of a range is not a pass."),
    },
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
