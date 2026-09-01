"""Derive the remaining five prototype datasets from the raw pulls in this folder.

WHAT A ROW IS, per source — these never share an axis:
  qwi.json     one (county, year, quarter) cell of Census QWI, NAICS 326.
               Emp = jobs on the first day of the quarter. HirA/Sep = FLOWS of jobs
               during the quarter, so they are not comparable to a stock.
  eia.json     one (series, month) price. Units differ per series and are NOT unified.
  fred.json    one (series, month) index level. Index bases differ per series.
  usaspending  one (fiscal year, category, code) obligation total at place of
               performance — money spent IN a county, not money awarded TO a company
               headquartered there.
  qcew.json    one (year, area, NAICS) annual average; emp counts jobs.
"""
import json, os, collections, statistics as st
from footprints import PIC12, META

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
load = lambda n: json.load(open(os.path.join(HERE, n), encoding="utf-8"))


def out(artifact, name, obj):
    d = os.path.join(WEB, artifact, "data")
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, name)
    json.dump(obj, open(p, "w", encoding="utf-8"), separators=(",", ":"))
    print(f"  {artifact}/data/{name}  {round(os.path.getsize(p)/1024)} KB")


# FEDERAL-data pages: PIC-12. QWI and QCEW are keyed on the 3-digit county code.
FOOTPRINT = "pic12"
NEO = {c[2:]: n for c, n in PIC12.items()}
FIPS5 = set(PIC12)

# ------------------------------------------------------------------ 1. CHURN
print("churn")
# FILTER TO THE FOOTPRINT. qwi.json deliberately holds BOTH footprints so either can be
# computed from one pull — 12 PIC-12 counties plus the 4 that only NEO-14 has. This block
# summed every row, so the headline churn totals were a 14-county mixture while the banner
# and the claim both said PIC-12. Caught only because a refetch changed the numbers and an
# assertion failed; nothing else on the page would have shown it.
_all = load("qwi.json")["rows"]
q = [r for r in _all if r["county"] in NEO]
_have = {r["county"] for r in q}
assert _have == set(NEO), (
    f"churn: qwi.json does not cover {FOOTPRINT}. missing={sorted(set(NEO) - _have)} "
    f"— run fetch_footprint.py. A partial footprint must fail the build, not publish a "
    f"total that silently means something else.")
print(f"  filtered {len(_all)} rows -> {len(q)} across {len(_have)} {FOOTPRINT} counties")
byq = collections.defaultdict(lambda: {"emp": 0, "hires": 0, "seps": 0,
                                       "counties": 0, "missing": 0})
for r in q:
    k = (r["year"], r["quarter"])
    c = byq[k]
    if r["emp"] is None or r["hires"] is None or r["seps"] is None:
        c["missing"] += 1
        continue
    c["emp"] += r["emp"]; c["hires"] += r["hires"]; c["seps"] += r["seps"]
    c["counties"] += 1
quarters = [{"year": y, "q": qq, **v,
             "net": v["hires"] - v["seps"],
             # churn = average of the two flows over the stock; the standard measure
             "churn_rate": round(((v["hires"] + v["seps"]) / 2) / v["emp"], 4) if v["emp"] else None}
            for (y, qq), v in sorted(byq.items()) if v["counties"] > 0]
# A quarter QWI has not published yet is dropped, never drawn as a zero.
county_latest = collections.defaultdict(dict)
for r in q:
    county_latest[(r["year"], r["quarter"])][r["county"]] = r
# Only quarters QWI has actually published — otherwise the newest, empty quarter makes
# every county look as if it had a withheld period.
published = {(x["year"], x["q"]) for x in quarters}
last4 = [k for k in sorted(county_latest) if k in published][-4:]
per_county = []
for c, name in NEO.items():
    h = s = e = 0; miss = 0
    for k in last4:
        r = county_latest[k].get(c)
        if not r or r["emp"] is None or r["hires"] is None or r["seps"] is None:
            miss += 1; continue
        h += r["hires"]; s += r["seps"]; e = max(e, r["emp"])
    per_county.append({"county": name, "hires": h, "seps": s, "emp": e,
                       "quarters_missing": miss,
                       "churn_rate": round(((h + s) / 2) / (e * 4), 4) if e else None})
out("churn", "churn.json", {
    # NOT SEASONALLY ADJUSTED, and this line said the opposite until 2026-09-01. The API
    # path is timeseries/qwi/sa, where "sa" is the SEX-BY-AGE table and not seasonal
    # adjustment; adjustment is the separate `seasonadj` parameter, whose default is U
    # (unadjusted). fetch_rest.qwi() never sets it. Checked against the API rather than
    # read off the path: all 55 shipped quarters match seasonadj=U exactly, and
    # seasonadj=S returns HTTP 204 for NAICS 326 at this geography, so no adjusted series
    # exists to have been fetched. The winter/summer swing is still in these numbers,
    # which is what the trailing four-quarter averages on the page are for.
    "meta": {"source": "U.S. Census Quarterly Workforce Indicators (QWI), not seasonally adjusted",
             "naics": "326, plastics and rubber products manufacturing",
             "row": "one (county, year, quarter) cell; Emp is a STOCK at quarter start, "
                    "hires and separations are FLOWS during the quarter: never plot them "
                    "on one axis as if comparable",
             "geography": f"the {META[FOOTPRINT]['n']} {META[FOOTPRINT]['label']} counties, summed",
             "footprint": META[FOOTPRINT],
             "span": [f"{quarters[0]['year']}Q{quarters[0]['q']}",
                      f"{quarters[-1]['year']}Q{quarters[-1]['q']}"],
             "note": "A quarter's totals exclude counties QWI withheld; counties_counted "
                     "says how many of the twelve are in each sum."},
    "quarters": quarters, "counties": per_county})
print(f"  {len(quarters)} quarters, "
      f"{quarters[0]['year']}Q{quarters[0]['q']}–{quarters[-1]['year']}Q{quarters[-1]['q']}")

# ------------------------------------------------------------- 2. COST SCISSORS
print("cost-scissors")
eia, fred = load("eia.json")["rows"], load("fred.json")["rows"]
series = collections.defaultdict(list)
# Energy is the feedstock stage for the parts of this cluster that buy hydrocarbons;
# FRED rows carry their own stage, assigned when fetched.
for r in eia:
    series[(r["label"], r["unit"], "EIA", "feedstock")].append((r["date"], r["value"]))
for r in fred:
    series[(r["label"], "index", "FRED", r.get("stage", "context"))].append(
        (r["date"], r["value"]))
BASE = "2019-01-01"
scissors = []
for (label, unit, src, stage), pts in series.items():
    pts.sort()
    base = next((v for d, v in pts if d >= BASE), None)
    if not base:
        continue
    idx = [{"date": d, "value": v, "index": round(v / base * 100, 2)}
           for d, v in pts if d >= "2015-01-01"]
    # The pass-through question: how much of the run-up above the base has come back?
    post = [p for p in idx if p["date"] >= BASE]
    peak = max(post, key=lambda p: p["index"]) if post else None
    now = post[-1] if post else None
    retraced = None
    if peak and now and peak["index"] > 100:
        retraced = round((peak["index"] - now["index"]) / (peak["index"] - 100), 4)
    scissors.append({"label": label, "unit": unit, "source": src, "stage": stage,
                     "base": BASE, "base_value": base,
                     "peak": peak, "now": now, "retraced": retraced,
                     "points": idx})
out("cost-scissors", "scissors.json", {
    "meta": {"sources": "U.S. EIA (energy prices) and FRED/BLS (producer price indexes)",
             "row": "one (series, month) observation",
             "rebasing": f"Every series is indexed to 100 at {BASE}. Levels are in different "
                         "units ($/mcf, ¢/kWh, index points) and are NEVER drawn on a shared "
                         "value axis. Indexing is what makes one axis honest.",
             "caution": "An index shows relative movement from the base month only. A series "
                        "that starts high and stays flat looks identical to one that is cheap "
                        "and flat.",
             "stages": "feedstock -> resin -> product. The chain has three links, and 'did "
                       "output prices follow input prices down' is unanswerable with only "
                       "the last one. Retracement is the share of a series' rise above its "
                       "base month that has since come back.",
             "base_month_bias": "January 2019 is a WINTER month, so gas enters the index at "
                                "a seasonal high and its later fall looks larger than an "
                                "annual-average base would show. The stage ORDERING below is "
                                "robust to that; the exact percentages are not.",
             "not_margin": "An output index rising faster than an input index is NOT a "
                           "margin. Labor, freight, energy and packaging are not in either "
                           "series. It is a spread between two published indices, and that "
                           "is all it is."},
    "series": scissors})
print(f"  {len(scissors)} series, indexed to {BASE}")

# ------------------------------------------------- 3. WAGES vs CONCENTRATION
print("patents-payroll")
qcew = load("qcew.json")
idx = {(r["year"], r["area"], r["own"], r["naics"]): r for r in qcew}
NAMES = {r["area"]: r["area_name"] for r in qcew}
YEARS = sorted({r["year"] for r in qcew})
LATEST = YEARS[-1]
NA = [("325", "Chemical manufacturing"), ("3252", "Resin, synthetic rubber & fibers"),
      ("3255", "Paint, coating & adhesive"), ("326", "Plastics & rubber products"),
      ("3261", "Plastics products"), ("3262", "Rubber products")]
wage_rows, trend = [], []
for y in YEARS:
    us_all = idx.get((y, "US000", "5", "10"))
    for naics, label in NA:
        us = idx.get((y, "US000", "5", naics))
        if us and us["weekly_wage"]:
            trend.append({"year": y, "naics": naics, "label": label, "area": "US000",
                          "name": "United States", "weekly_wage": us["weekly_wage"],
                          "emp": us["emp"]})
        for a in [k for k in NAMES if k in FIPS5]:
            r = idx.get((y, a, "5", naics))
            if not r or r["disclosure"] == "N" or not r["weekly_wage"]:
                continue
            rec = {"year": y, "naics": naics, "label": label, "area": a,
                   "name": NAMES[a], "weekly_wage": r["weekly_wage"], "emp": r["emp"],
                   "lq": r["lq_bls"],
                   "vs_us": round(r["weekly_wage"] / us["weekly_wage"], 4)
                            if us and us["weekly_wage"] else None,
                   "vs_local_all": round(r["weekly_wage"] / idx[(y, a, "0", "10")]["weekly_wage"], 4)
                            if idx.get((y, a, "0", "10")) and idx[(y, a, "0", "10")]["weekly_wage"] else None}
            if y == LATEST:
                wage_rows.append(rec)
            trend.append(rec)
out("wages", "wages.json", {
    "meta": {"source": "BLS QCEW annual averages",
             "footprint": META[FOOTPRINT],
             "row": "one (year, county, NAICS) cell; weekly_wage is average weekly wage "
                    "per covered job, not a salary and not per person",
             "latest": LATEST,
             "measures": {"vs_us": "county weekly wage ÷ the same industry nationally",
                          "vs_local_all": "county weekly wage ÷ that county's all-industry "
                                          "average: does the cluster pay above its own town"},
             "caution": "Average weekly wage moves with hours and with the mix of occupations, "
                        "not only with pay rates."},
    "latest_rows": wage_rows, "trend": trend})
print(f"  {len(wage_rows)} latest-year rows, {len(trend)} trend rows")

# ------------------------------------------------------------ 4. FEDERAL MONEY
print("federal-money")
# BLS CPI-U, annual averages, 1982-84 = 100. Data journalism's rule: always adjust when
# comparing dollars across years. An eight-year nominal sum understates the real total by
# about 3% here — small, but "about $249M" and "about $257M" are different sentences and
# only one of them is the answer to "how much did the region actually get".
CPI_BASE = 2025
CPI = {2018: 251.107, 2019: 255.657, 2020: 258.811, 2021: 270.970, 2022: 292.655,
       2023: 304.702, 2024: 313.689, 2025: 322.132, 2026: 322.132}
def real(v, fy):
    """Nominal dollars restated in CPI_BASE dollars. Years past the last published CPI
    annual average are carried at that average rather than extrapolated."""
    return v * CPI[CPI_BASE] / CPI.get(fy, CPI[CPI_BASE])

us = load("usaspending.json")["rows"]
by_fy_naics = collections.defaultdict(float)
by_fy_county = collections.defaultdict(float)
names = {}
for r in us:
    if r["amount"] is None:
        continue
    if r["kind"] == "naics":
        by_fy_naics[(r["fy"], r["code"])] += r["amount"]
        names[r["code"]] = r["name"]
    else:
        by_fy_county[(r["fy"], r["name"])] += r["amount"]
out("federal-money", "federal.json", {
    "meta": {"source": "USAspending.gov spending_by_category, place of performance",
             "row": "one (fiscal year, category, code) obligation total",
             "footprint": META[FOOTPRINT],
             "scope": f"Obligations at place of performance in the {META[FOOTPRINT]['n']} "
                      f"{META[FOOTPRINT]['label']} counties. NAICS rows are filtered to 325* "
                      "and 326*, chemical and plastics/rubber. County rows are ALL "
                      "industries and are an order of magnitude larger; the two are shown "
                      "separately and never summed.",
             "caution": "Place of performance is a REPORTED FIELD on the award, not an "
                        "observation of where work happened: a centrally administered "
                        "contract or a prime performing through a subaward can put the code "
                        "somewhere other than the activity. An obligation is not an outlay.",
             "excludes": "University and research awards are INVISIBLE to the NAICS view by "
                         "construction: it filters to 325*/326* manufacturing codes, and a "
                         "university files under 61xxxx or 5417xx. The NSF NEO-SMART Engine "
                         "($14,999,983) and TARDISS do not appear in the NAICS rows. The "
                         "all-industry county rows do capture them."},
    "inflation": "Dollars from different years are not the same dollars. Every row "
                 "carries BOTH the nominal obligation and the same figure restated in "
                 f"{CPI_BASE} dollars using BLS CPI-U annual averages. Any total spanning "
                 "more than one year must use the real column; the nominal one is kept so "
                 "a reader can reconcile against USAspending itself.",
    "cpi_base": CPI_BASE, "cpi": CPI,
    "naics": [{"fy": fy, "code": c, "name": names.get(c, c), "amount": round(v),
               "real": round(real(v, fy))}
              for (fy, c), v in sorted(by_fy_naics.items())],
    "counties": [{"fy": fy, "county": c, "amount": round(v),
                  "real": round(real(v, fy))}
                 for (fy, c), v in sorted(by_fy_county.items())]})
print(f"  {len(by_fy_naics)} naics-year rows, {len(by_fy_county)} county-year rows")

# ---------------------------------------------------------------- 5. REVISIONS
print("revisions")
v = load("fred_vintages.json")["rows"]
per = collections.defaultdict(list)
for r in v:
    per[(r["series"], r["label"], r["date"])].append(r)
revised = []
for (sid, label, date), rows in sorted(per.items()):
    rows.sort(key=lambda r: r["vintage_start"])
    vals = [r["value"] for r in rows]
    if len(vals) < 2:
        continue
    revised.append({"series": sid, "label": label, "date": date,
                    "first": vals[0], "latest": vals[-1], "revisions": len(vals) - 1,
                    "delta": round(vals[-1] - vals[0], 4),
                    "pct": round((vals[-1] - vals[0]) / vals[0] * 100, 3) if vals[0] else None,
                    "path": [{"v": r["value"], "from": r["vintage_start"]} for r in rows]})
out("revisions", "revisions.json", {
    "meta": {"source": "ALFRED, the archival vintages behind FRED",
             "row": "one (series, reference month) with every value ever published for it",
             "why": "A published number is an estimate that keeps moving. Charts normally show "
                    "only the latest vintage, which hides that entirely.",
             "span": [min(r["date"] for r in revised), max(r["date"] for r in revised)]
                     if revised else None},
    "periods": revised,
    "all": [{"series": r["series"], "date": r["date"], "value": r["value"],
             "vintage": r["vintage_start"]} for r in v]})
print(f"  {len(revised)} periods that were revised at least once, of {len(per)} total")
print("\ndone")
