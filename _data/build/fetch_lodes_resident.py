"""LODES, the OTHER direction — where the people who LIVE here actually work.

`fetch_lodes.py` bounds the WORK end to PIC-12 and leaves the home end open, which answers
"who fills the jobs that sit here." That is workplace containment. It cannot answer the
reciprocal — "where do the people who live here work" — because a PIC-12 resident employed
outside PIC-12 never appears in that pull at all. Checked: of its 4,000 county pairs, the
number with a PIC-12 home and a non-PIC-12 workplace is ZERO, by construction.

The two are different quantities and neither implies the other. A county can fill its jobs
with outsiders while its own residents also leave, or fill them with outsiders while its
residents stay. Publishing one and calling it "containment" invites a reader to assume the
other, which is precisely the substitution the register's council flagged.

SAME INSTRUMENT, BOTH DIRECTIONS. This deliberately re-uses LODES rather than reaching for
the ACS commuting table, which would be a different estimand with its own margins; the two
figures have to be subtractable from each other or the comparison is decorative.

OUT-OF-STATE WORK IS NOT OPTIONAL HERE. Ohio's `main` file is home-OH/work-OH and its `aux`
file is work-OH/home-elsewhere. Neither contains an Ohio resident working in another state.
Ashtabula, Trumbull and Mahoning sit on the Pennsylvania line, so omitting that direction
would inflate their resident containment — the error would land hardest on exactly the
counties the finding is about. Each neighboring state's own `aux` file carries the rows we
need (work in that state, home in Ohio), so they are fetched and filtered to PIC-12 homes.

  python fetch_lodes_resident.py          -> 2022, writes lodes_resident.json
  python fetch_lodes_resident.py 2019     -> 2019 baseline
"""
import csv, gzip, io, json, os, sys, time, urllib.request, collections
from footprints import PIC12, META

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
YEAR = int(sys.argv[1]) if len(sys.argv) > 1 else 2022

# Ohio main carries every OH-resident job worked in Ohio. The rest is out-of-state work by
# Ohio residents, which lives in the DESTINATION state's aux file. These six share a border
# with Ohio or are close enough to commute to; anything further is remote work, and the
# residual is reported rather than silently dropped.
NEIGHBORS = ["pa", "mi", "wv", "in", "ky", "ny"]
BASE = "https://lehd.ces.census.gov/data/lodes/LODES8"


def stream(url):
    """Yield (home_county_fips, work_county_fips, jobs). Missing files yield nothing."""
    req = urllib.request.Request(url, headers=UA)
    try:
        resp = urllib.request.urlopen(req, timeout=300)
    except Exception as e:                      # a state may not publish a given year
        print(f"    (skip {url.rsplit('/', 1)[-1]}: {e})", flush=True)
        return
    with resp:
        with gzip.GzipFile(fileobj=io.BufferedReader(resp)) as gz:
            rdr = csv.reader(io.TextIOWrapper(gz, encoding="utf-8"))
            head = next(rdr)
            iw, ih, is_ = head.index("w_geocode"), head.index("h_geocode"), head.index("S000")
            for row in rdr:
                yield row[ih][:5], row[iw][:5], int(row[is_])


flows = collections.Counter()
sources = [("oh main", f"{BASE}/oh/od/oh_od_main_JT00_{YEAR}.csv.gz")]
sources += [(f"{s} aux", f"{BASE}/{s}/od/{s}_od_aux_JT00_{YEAR}.csv.gz") for s in NEIGHBORS]

for label, url in sources:
    t0, got, kept = time.time(), 0, 0
    for h, w, jobs in stream(url):
        got += 1
        if h in PIC12:                          # HOME end bounded — the whole point
            flows[(h, w)] += jobs
            kept += 1
    print(f"  {label}: {got:,} pairs, {kept:,} with a PIC-12 home, {time.time()-t0:.0f}s",
          flush=True)

if not flows:
    raise SystemExit("FATAL: no flows with a HOME end in PIC-12. A zero here is a bug in "
                     "the GEOID slice or the file layout, not an empty region.")

# Per home county: total jobs held by its residents, and where those jobs sit.
by_home = collections.defaultdict(lambda: {"total": 0, "own": 0, "in_pic12": 0,
                                           "out_state": 0, "dests": collections.Counter()})
for (h, w), v in flows.items():
    b = by_home[h]
    b["total"] += v
    b["dests"][w] += v
    if w == h:
        b["own"] += v
    if w in PIC12:
        b["in_pic12"] += v
    if not w.startswith("39"):
        b["out_state"] += v

rows = []
for h in sorted(PIC12, key=lambda k: -by_home[k]["total"]):
    b = by_home[h]
    t = b["total"] or 1
    top = [{"work": w, "jobs": n} for w, n in b["dests"].most_common(6) if w != h]
    rows.append({
        "home": h, "home_name": PIC12[h],
        "workers_total": b["total"],
        # RESIDENT containment, county: residents' jobs that sit in their own county.
        "own_county": b["own"], "own_share": round(b["own"] / t, 4),
        # RESIDENT containment, region: residents' jobs anywhere inside PIC-12. This is the
        # figure that answers whether the REGION is a labor market even though the county
        # is not — the two are different claims and the page must not merge them.
        "in_region": b["in_pic12"], "region_share": round(b["in_pic12"] / t, 4),
        "out_of_state": b["out_state"],
        "out_of_state_share": round(b["out_state"] / t, 4),
        "top_external": top})

tot = sum(r["workers_total"] for r in rows)
own = sum(r["own_county"] for r in rows)
reg = sum(r["in_region"] for r in rows)
oos = sum(r["out_of_state"] for r in rows)

out = {"meta": {
    "source": f"LEHD LODES8 origin-destination, {YEAR}, segment JT00 (all jobs). Ohio main "
              f"plus the aux files of {', '.join(s.upper() for s in NEIGHBORS)}, which is "
              "where an Ohio resident working out of state appears.",
    "row": "one PIC-12 home county: jobs held by its residents, and where those jobs sit. "
           "JOBS, not people — a two-job worker is counted twice.",
    "direction": "HOME end bounded to PIC-12, WORK end unbounded. This is the reciprocal of "
                 "lodes.json, which bounds the work end. The two measure different "
                 "quantities and must never be presented as one.",
    "footprint": META["pic12"],
    "not": "Not commuting. Both ends are employer-reported addresses, so the home end is a "
           "residence on file and a distant pairing is remote work or address-of-record.",
    "residual": "Work in a state outside Ohio and its six neighbors is not captured and "
                "would appear here as local employment. It is small but it is a known "
                "one-directional bias — resident containment is an UPPER bound.",
    "totals": {"resident_jobs": tot,
               "in_own_county": own, "own_county_share": round(own / tot, 4),
               "in_pic12": reg, "region_share": round(reg / tot, 4),
               "out_of_state": oos, "out_of_state_share": round(oos / tot, 4)},
    "year": YEAR,
    "fetched": time.strftime("%Y-%m-%d")}, "rows": rows}

p = os.path.join(HERE, "lodes_resident.json" if YEAR == 2022
                 else f"lodes_resident_{YEAR}.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"\nwrote {p} — {tot:,} resident jobs; {own:,} in own county ({own/tot:.1%}), "
      f"{reg:,} inside PIC-12 ({reg/tot:.1%}), {oos:,} out of state ({oos/tot:.1%})")
