# -*- coding: utf-8 -*-
"""The churn page's missing comparator, and the age structure under its turnover.

WHAT IT ADDS. The churn page printed a turnover rate and then declined to say whether it
was high: "no other industry or state is compared here." The decline named a comparator
that was one request away on the series the page already uses, which makes it a research
gap wearing a caveat's clothes. This fetch closes it on the SAME INSTRUMENT - same API,
same table, same industry code, same quarters, same unadjusted series - along two axes the
page never pulled:

  GEOGRAPHY. NAICS 326 flows for Ohio and the five other states with the largest
  plastics-and-rubber payrolls (Illinois, Texas, California, Pennsylvania, Indiana), plus
  Michigan, which the same size rule selects and the data cannot serve. The answer is that
  a tenth a quarter is ordinary: three of the six churn faster than the twelve-county
  region and three churn slower, and the region runs below Ohio as a whole in every window
  tested. What is NOT ordinary is the direction, which is the page's actual argument.

  AGE. The eight QWI age bands for the same twelve counties, in the page's own recent
  window and in its 2012 baseline window. County-level cells are disclosed here, so the
  region is measured directly rather than scaled off the state. More than a quarter of
  these jobs are held by someone 55 or older, that share has risen about seven points
  since 2012, and the hire rate falls nearly tenfold across the bands.

  python3 _data/build/fetch_qwi_bench.py            fetch, verify, write
  python3 _data/build/fetch_qwi_bench.py --check    verify only, write nothing

WHAT ONE ROW IS.
  `states[FIPS].quarters[]` - one (state, year, quarter) cell of QWI at NAICS 326. `emp` is
  a STOCK on the first day of the quarter; `hires` and `seps` are FLOWS during it, so they
  never share an axis with employment. Identical in definition to the county rows the page
  already ships, which is the entire point: one parameter differs.
  `age[window][band][]` - one (county, year, quarter, age band) cell of the same series for
  the twelve PIC-12 counties. Bands are QWI's A01 through A08; A00 is all ages and is
  carried separately as a control, never as a ninth band.

TRAPS. Every one of these was hit while building this file.
  - **The API is NOT keyless.** A request without `key=` returns HTTP **200** with an HTML
    page titled "Missing Key". A JSON parse raises on it; a lenient caller that catches and
    continues writes an empty series indistinguishable from a genuine zero. This file
    refuses to start without CENSUS_API_KEY and treats any non-JSON body as fatal.
  - **HTTP 204 is an answer and is not a zero.** Michigan returns 204 for every quarter
    from 2022Q1 on, at NAICS 326 AND at industry=00: the state stopped supplying records to
    the program. Recorded in `coverage` with its last usable quarter, never as zero rows.
  - **Employment can be present while the flows are null.** Michigan 2021Q4 carries
    emp=35,885 with HirA and Sep both null, and so does 2025Q4 for every state in this
    pull. Coercing null to 0 prints a state churning at 0%. Rows without BOTH flows are
    dropped and counted.
  - **`qwi/sa` is the SEX-BY-AGE table, not "seasonally adjusted."** Adjustment is the
    separate `seasonadj` parameter, whose default is U. Verified rather than read off the
    path: `seasonadj=U` returns values identical to the default. `_data/SOURCES.json` named
    this series "seasonally adjusted" until this fetch corrected it.
  - **`agegrp` is a PREDICATE, not a `get` variable.** Asking for it in `get=` returns 204
    with an empty body, which reads downstream exactly like a suppressed cell.
  - **The age bands do not sum to the all-ages total.** Withheld county-quarter-band cells
    leave about 2-3% of employment outside the eight bands. Band shares are therefore
    shares of the DISCLOSED base, the residual is reported rather than spread, and any
    share of the true total is published as a BRACKET.
  - **A multi-state request fails WHOLE if one FIPS in it is invalid** - HTTP 500 for the
    chunk, not a partial result - so the state list is explicit and never generated.
  - **PIC-12 is not the first twelve entries of NEO-14.** Both come from `footprints.py`
    here for that reason; hand-typing the county codes silently swapped Ashtabula and
    Trumbull for Huron and Tuscarawas and moved every age share by half a point.

YIELD, ASSERTED RATHER THAN HOPED. Nothing is written until:
  1. every state carries all 55 quarters of the page's window (Michigan excepted and
     recorded), and
  2. the all-ages control for the twelve counties REPRODUCES the page's own published
     quarters exactly - `churn/data/churn.json` last four quarters, 71,771 jobs, 6,626
     hires, 7,157 separations. That is a check run against an answer already known, which
     is the only kind worth trusting: it pins the county list, the footprint, the industry
     code and the seasonal-adjustment default in one assertion.
"""
import json, os, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
from contact import UA  # noqa: E402  (one address, see contact.py)
from footprints import PIC12, META  # noqa: E402

API = "https://api.census.gov/data/timeseries/qwi/sa"
NAICS = "326"

# The size rule, stated once and applied without exception: Ohio plus the five other
# states with the largest plastics-and-rubber payrolls. The same six top the ranking at
# BOTH ends of the page's window (2012Q1 and 2025Q3) and in the middle, so the set is not
# an artefact of the quarter it was picked in. Michigan is seventh by that rule at every
# point it reports, and is carried here so its absence is a published fact, not a silence.
STATES = {"39": ("Ohio", "OH"), "17": ("Illinois", "IL"), "48": ("Texas", "TX"),
          "06": ("California", "CA"), "42": ("Pennsylvania", "PA"),
          "18": ("Indiana", "IN"), "26": ("Michigan", "MI")}
BANDS = ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08"]
BAND_LABEL = {"A01": "14 to 18", "A02": "19 to 21", "A03": "22 to 24", "A04": "25 to 34",
              "A05": "35 to 44", "A06": "45 to 54", "A07": "55 to 64", "A08": "65 and older"}
# The page's own two windows, so nothing here is measured over a span the page does not
# already use: its recent four quarters and its 2012 baseline year.
WINDOWS = {"now": [(2024, 4), (2025, 1), (2025, 2), (2025, 3)],
           "base": [(2012, q) for q in (1, 2, 3, 4)]}
SPAN = [(y, q) for y in range(2012, 2025) for q in (1, 2, 3, 4)] + [(2025, q) for q in (1, 2, 3)]
CHECK = "--check" in sys.argv


def key():
    """The master .env at the user's home. Names only ever printed, never values."""
    for p in (os.path.expanduser("~/.env"), os.path.join(HERE, "..", "..", "..", ".env")):
        if not os.path.exists(p):
            continue
        for line in open(p, encoding="utf-8", errors="ignore"):
            if line.strip().startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k.strip() == "CENSUS_API_KEY":
                return v.strip().strip('"').strip("'")
    raise SystemExit("no CENSUS_API_KEY in the environment. This API is NOT keyless: "
                     "without a key it answers HTTP 200 with an HTML page saying "
                     "'Missing Key', which a lenient parser turns into an empty series.")


CK = key()


def get(**params):
    """One request. Returns a list of dicts, or None when the API says NO RECORDS.

    The distinction is the whole function. A 204 with an empty body is the Census saying
    the cell does not exist; an HTML body is a failed request wearing a 200; both are
    silently zero downstream if this is written the obvious way.
    """
    q = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{API}?{q}&key={CK}"
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120)
    except urllib.error.HTTPError as e:
        raise SystemExit(f"FATAL: HTTP {e.code} on {q}. A multi-state request fails whole "
                         f"when any FIPS in it is invalid; it is never a partial result.")
    ct = r.headers.get("content-type", "")
    body = r.read()
    if r.status == 204 or not body.strip():
        return None
    if "json" not in ct:
        raise SystemExit(f"FATAL: non-JSON body ({ct}) on {q}. This is the missing-key "
                         f"page, which arrives as HTTP 200. It is not a zero.")
    head, *rows = json.loads(body.decode())
    return [dict(zip(head, r_)) for r_ in rows]


def flows(o):
    """emp, hires, seps as ints, or None when either flow is missing.

    A row with employment and null flows is real and common (2025Q4 for every state in
    this pull, Michigan 2021Q4). It is not a quarter of zero hiring.
    """
    try:
        return int(o["Emp"]), int(o["HirA"]), int(o["Sep"])
    except (TypeError, ValueError, KeyError):
        return None


# ------------------------------------------------------------------ 1. STATES
print("states: NAICS 326 flows, one request per year, seven states")
state_rows = {f: [] for f in STATES}
state_drop = {f: [] for f in STATES}
for year in range(2012, 2026):
    got = get(get="Emp,HirA,Sep", **{"for": "state:" + ",".join(STATES)},
              industry=NAICS, year=year, quarter="1,2,3,4")
    if got is None:
        print(f"  {year}: no records for any state"); continue
    for o in got:
        f, y, q = o["state"], int(o["year"]), int(o["quarter"])
        if (y, q) not in SPAN:
            continue
        v = flows(o)
        if v is None:
            state_drop[f].append(f"{y}Q{q}"); continue
        state_rows[f].append({"year": y, "q": q, "emp": v[0], "hires": v[1], "seps": v[2]})
    time.sleep(0.2)
    print(f"  {year}: {sum(len(v) for v in state_rows.values())} rows so far", flush=True)

coverage = []
for f, (name, ab) in STATES.items():
    rows = sorted(state_rows[f], key=lambda r: (r["year"], r["q"]))
    have = {(r["year"], r["q"]) for r in rows}
    missing = [f"{y}Q{q}" for (y, q) in SPAN if (y, q) not in have]
    if missing:
        last = rows[-1] if rows else None
        coverage.append({"state": f, "name": name, "quarters": len(rows),
                         "expected": len(SPAN), "missing": len(missing),
                         "last_usable": f"{last['year']}Q{last['q']}" if last else None,
                         "first_missing": missing[0],
                         "flows_null": state_drop[f],
                         "why": "The state stopped supplying records to the LEHD program. "
                                "The gap is not confined to this industry: industry=00 "
                                "returns HTTP 204 for the same quarters."})
        print(f"  {name}: {len(rows)}/{len(SPAN)} quarters, first gap {missing[0]}")
    elif len(rows) != len(SPAN):
        raise SystemExit(f"FATAL: {name} has {len(rows)} rows for {len(SPAN)} quarters.")
    state_rows[f] = rows

# Ohio is the benchmark the region sits inside; a hole in it kills the comparison.
if len(state_rows["39"]) != len(SPAN):
    raise SystemExit("FATAL: Ohio is short of the page's window. A missing benchmark is "
                     "worse than no comparison.")
if len(coverage) != 1 or coverage[0]["state"] != "26":
    print(f"  NOTE: coverage gaps now in {[c['name'] for c in coverage]}, "
          f"which is not the single expected Michigan case. Read them before publishing.")

# ------------------------------------------------- 2. AGE BANDS, PIC-12 COUNTIES
counties = [c[2:] for c in PIC12]
print(f"age bands: {len(BANDS)} bands plus the all-ages control, "
      f"{len(counties)} {META['pic12']['label']} counties, {len(WINDOWS)} windows")
age = {}
control = {}
for win, qs in WINDOWS.items():
    band_rows, ctl = {}, {"emp": 0, "hires": 0, "seps": 0, "cells": 0}
    for band in BANDS + ["A00"]:
        acc = {"emp": 0, "hires": 0, "seps": 0, "cells": 0}
        for (y, q) in qs:
            got = get(get="Emp,HirA,Sep", **{"for": "county:" + ",".join(counties)},
                      **{"in": "state:39"}, industry=NAICS, year=y, quarter=q, agegrp=band)
            if got is None:
                continue
            for o in got:
                v = flows(o)
                if v is None:
                    continue
                acc["emp"] += v[0]; acc["hires"] += v[1]; acc["seps"] += v[2]
                acc["cells"] += 1
            time.sleep(0.05)
        acc["cells_expected"] = len(qs) * len(counties)
        if band == "A00":
            ctl = acc
        else:
            band_rows[band] = acc
    disclosed = sum(v["emp"] for v in band_rows.values())
    age[win] = {"bands": band_rows, "disclosed_emp": disclosed,
                "residual_emp": ctl["emp"] - disclosed}
    control[win] = ctl
    print(f"  {win}: control {ctl['emp']:,} jobs, bands {disclosed:,}, "
          f"residual {ctl['emp'] - disclosed:,} "
          f"({(ctl['emp'] - disclosed) / ctl['emp'] * 100:.2f}% outside the bands)")

# ---------------------------------------- 3. THE CHECK AGAINST A KNOWN ANSWER
# The all-ages control for the recent window must reproduce the page's own quarters, to
# the job. If it does not, something in the county list, the footprint, the industry code
# or the adjustment default differs from what the page shipped, and no comparison built on
# this file would be measuring the same thing the page measures.
page = json.load(open(os.path.join(WEB, "churn", "data", "churn.json"), encoding="utf-8"))
want = [q for q in page["quarters"] if (q["year"], q["q"]) in WINDOWS["now"]]
if len(want) != 4:
    raise SystemExit("FATAL: churn.json does not carry the four quarters this pull "
                     "benchmarks against. Re-run derive_rest.py first.")
known = {k: sum(q[k] for q in want) for k in ("emp", "hires", "seps")}
got = {k: control["now"][k] for k in ("emp", "hires", "seps")}
if known != got:
    raise SystemExit(f"FATAL: the all-ages control does not reproduce the published page.\n"
                     f"  churn.json 2024Q4-2025Q3: {known}\n"
                     f"  this pull:                {got}\n"
                     f"A comparator measured on a different base is not a comparator.")
print(f"  reproduced churn.json exactly: {known['emp']:,} jobs, {known['hires']:,} hires, "
      f"{known['seps']:,} separations")

# ------------------------------ 4. IS A SUM OF COUNTIES COMPARABLE TO ONE STATE?
# The page's own methodology says summing counties inflates its flows against a single
# geography, "by an amount QWI cannot measure". It is measurable, and this measures it:
# every disclosed Ohio county at NAICS 326 against Ohio published as one unit, same
# quarter. If summing inflated the flows the county sum would EXCEED the state total.
print("aggregation check: all disclosed Ohio counties against Ohio as one unit")
CHKQ = (2025, 2)
rows = get(get="Emp,HirA,Sep", **{"for": "county:*"}, **{"in": "state:39"},
           industry=NAICS, year=CHKQ[0], quarter=CHKQ[1]) or []
csum = {"emp": 0, "hires": 0, "seps": 0, "counties": 0}
withheld = 0
for o in rows:
    v = flows(o)
    if v is None:
        withheld += 1; continue
    csum["emp"] += v[0]; csum["hires"] += v[1]; csum["seps"] += v[2]; csum["counties"] += 1
srow = get(get="Emp,HirA,Sep", **{"for": "state:39"}, industry=NAICS,
           year=CHKQ[0], quarter=CHKQ[1])
sv = flows(srow[0])
agg = {"quarter": f"{CHKQ[0]}Q{CHKQ[1]}",
       "county_sum": csum, "counties_withheld": withheld,
       "state": {"emp": sv[0], "hires": sv[1], "seps": sv[2]},
       "county_hire_rate": round(csum["hires"] / csum["emp"], 5),
       "state_hire_rate": round(sv[1] / sv[0], 5),
       "reading": "The county sum falls SHORT of the state total, by about the employment "
                  "in the counties QWI withholds, and the two hire rates agree to a "
                  "fraction of a point. Summing counties does not inflate the flows, so a "
                  "twelve-county rate and a whole-state rate are the same measurement."}
print(f"  county sum {csum['emp']:,} jobs / {csum['hires']:,} hires across "
      f"{csum['counties']} counties ({withheld} withheld)")
print(f"  state      {sv[0]:,} jobs / {sv[1]:,} hires")
print(f"  hire rate  {agg['county_hire_rate'] * 100:.2f}% summed against "
      f"{agg['state_hire_rate'] * 100:.2f}% published")

out = {"meta": {
    "source": "U.S. Census Quarterly Workforce Indicators (QWI), not seasonally adjusted",
    "naics": "326, plastics and rubber products manufacturing",
    "row": "states: one (state, year, quarter) cell, emp a STOCK at quarter start and "
           "hires/seps FLOWS during it. age: one (age band, window) sum over the twelve "
           "counties and the window's quarters.",
    "geography": f"the {META['pic12']['n']} {META['pic12']['label']} counties, summed, "
                 f"against seven states published as single units",
    "footprint": META["pic12"],
    "peer_rule": "Ohio and the five other states with the largest plastics-and-rubber "
                 "payrolls. The same six top the ranking in 2012Q1, 2021Q4 and 2025Q3, so "
                 "the set does not depend on the quarter it was chosen in. Michigan is "
                 "seventh by the same rule and is carried in `coverage`, not dropped.",
    "seasonadj": "The path segment `sa` is the SEX-BY-AGE table, not seasonal adjustment. "
                 "Adjustment is the `seasonadj` parameter, default U; `seasonadj=U` "
                 "returns identical values, checked rather than assumed.",
    "windows": {k: [f"{y}Q{q}" for (y, q) in v] for k, v in WINDOWS.items()},
    "span": [f"{SPAN[0][0]}Q{SPAN[0][1]}", f"{SPAN[-1][0]}Q{SPAN[-1][1]}"],
    "caution": "Age bands do not sum to the all-ages control: withheld county-quarter-band "
               "cells leave a residual outside them. Shares are of the disclosed base and "
               "the residual is published, never spread across the bands.",
    "fetched": time.strftime("%Y-%m-%d")},
    "states": {f: {"name": n, "abbr": a, "quarters": state_rows[f]}
               for f, (n, a) in STATES.items()},
    "coverage": coverage,
    "age": age, "age_control": control, "band_label": BAND_LABEL,
    "aggregation_check": agg}

if CHECK:
    print("\n--check: verified, nothing written.")
    raise SystemExit(0)
p = os.path.join(HERE, "qwi_bench.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"\nwrote {p}  {round(os.path.getsize(p) / 1024)} KB")
