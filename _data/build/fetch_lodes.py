"""LODES — the labor shed. Where the people who work here actually live.

ACS says how many credential-holders live in the footprint. QCEW says how many jobs sit
in it. Neither says whether those are the same people, and for a cluster whose recruiting
pitch is regional, that is the load-bearing question: how far does the commute reach, and
how much of the workforce is imported from outside the footprint entirely?

LODES answers it from the same LEHD job-level frame that produces QWI.

WHAT A ROW IS
  One (home county, work county) count of JOBS, not people and not commuters. A worker
  holding two jobs appears twice. Both ends are assigned by employer-reported address:
  the work end is the establishment, the home end is the worker's residence on file.

  Segment JT00 = all jobs, all sectors. LODES origin-destination carries NO industry
  dimension, so this is the labor shed of the whole economy, NOT of the polymer cluster.
  Do not describe it as the cluster's workforce. (Industry detail exists only in the WAC
  workplace files, at 2-digit CNS sectors, which cannot be crossed with residence.)

FOOTPRINT: PIC-12 work end, per footprints.py — federal source. The HOME end is
deliberately unbounded: the whole point is to see how much labor arrives from outside.
"""
import csv, gzip, io, json, os, sys, time, urllib.request, collections
from footprints import PIC12, META

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
# Year is an argument so a PRE-PANDEMIC baseline can be pulled with the same code path.
# That baseline is not optional colour: the 2022 shed shows Franklin County (Columbus,
# a two-hour drive) as the largest external source of PIC-12 jobs. If Franklin was
# already large in 2019 the "remote work broke the labor shed" reading is dead and the
# pattern is an administrative artifact. One fetch decides it, so it gets a code path.
#   python fetch_lodes.py          -> 2022, writes lodes.json
#   python fetch_lodes.py 2019     -> 2019, writes lodes_2019.json
YEAR = int(sys.argv[1]) if len(sys.argv) > 1 else 2022
URL = f"https://lehd.ces.census.gov/data/lodes/LODES8/oh/od/oh_od_main_JT00_{YEAR}.csv.gz"
# "main" = both ends in Ohio. Out-of-state inflow lives in the separate `aux` file and is
# fetched too, or the shed looks artificially self-contained.
AUX = f"https://lehd.ces.census.gov/data/lodes/LODES8/oh/od/oh_od_aux_JT00_{YEAR}.csv.gz"

# Ohio county names for readable output; anything else is reported by FIPS.
OH_COUNTY = {
    "39007": "Ashtabula", "39035": "Cuyahoga", "39055": "Geauga", "39085": "Lake",
    "39093": "Lorain", "39099": "Mahoning", "39103": "Medina", "39133": "Portage",
    "39151": "Stark", "39153": "Summit", "39155": "Trumbull", "39169": "Wayne",
    "39033": "Crawford", "39077": "Huron", "39139": "Richland", "39157": "Tuscarawas",
    # Adjacent counties in NEITHER footprint that turn out to be real feeders.
    "39029": "Columbiana", "39005": "Ashland", "39019": "Carroll", "39043": "Erie",
    "39075": "Holmes", "39067": "Harrison", "39159": "Union", "39129": "Pickaway",
    # Distant metros. These are almost certainly remote work or administrative address
    # assignment, NOT commuting — see the caution in meta.
    "39041": "Delaware", "39049": "Franklin", "39061": "Hamilton", "39113": "Montgomery",
    "39095": "Lucas", "39017": "Butler", "39165": "Warren", "39151x": "-",
}


def stream(url):
    """Yield (h_county_fips, w_county_fips, jobs) from a LODES OD file."""
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=300) as resp:
        with gzip.GzipFile(fileobj=io.BufferedReader(resp)) as gz:
            rdr = csv.reader(io.TextIOWrapper(gz, encoding="utf-8"))
            head = next(rdr)
            iw, ih, is_ = head.index("w_geocode"), head.index("h_geocode"), head.index("S000")
            for row in rdr:
                # Census block GEOID: state(2)+county(3)+tract(6)+block(4). First 5 = county.
                yield row[ih][:5], row[iw][:5], int(row[is_])


flows = collections.Counter()
n_rows = 0
for label, url in (("main", URL), ("aux", AUX)):
    t0 = time.time()
    got = 0
    for h, w, jobs in stream(url):
        got += 1
        if w in PIC12:                      # work end must be in the footprint
            flows[(h, w)] += jobs
    n_rows += got
    print(f"  {label}: {got:,} block pairs in {time.time()-t0:.0f}s", flush=True)

if not flows:
    raise SystemExit("FATAL: no flows with a work end in PIC-12. Either the file layout "
                     "changed or the GEOID slice is wrong — a zero result here is a bug, "
                     "not an empty labor shed.")

total = sum(flows.values())
inside = sum(v for (h, w), v in flows.items() if h in PIC12)
rows = [{"home": h, "home_name": OH_COUNTY.get(h, h), "work": w, "work_name": PIC12[w],
         "jobs": v, "home_in_footprint": h in PIC12}
        for (h, w), v in flows.items() if v > 0]
rows.sort(key=lambda r: -r["jobs"])

out = {"meta": {
    "source": f"LEHD LODES8 origin-destination, Ohio, {YEAR}, segment JT00 (all jobs), "
              "main + aux",
    "row": "one (home county, work county) count of JOBS — not people, not commuters. "
           "A two-job worker appears twice.",
    "footprint": META["pic12"],
    "footprint_note": "The WORK end is bounded to PIC-12. The HOME end is deliberately "
                      "unbounded, because the question is how much labor arrives from "
                      "outside the footprint.",
    "no_industry": "LODES origin-destination carries NO industry dimension. This is the "
                   "labor shed of the whole economy, NOT of the polymer cluster. Industry "
                   "detail exists only in the WAC workplace files and cannot be crossed "
                   "with residence.",
    "remote_work_caution": "The home end is the residence on file, NOT evidence of a "
                           "commute. Franklin County (Columbus) is the single largest "
                           "external source of PIC-12 jobs and is a two-hour drive; "
                           "Hamilton, Montgomery and Lucas are similar. Post-2020 these "
                           "are remote or hybrid arrangements, not a labor shed. Treat "
                           "ADJACENT counties as commuting and DISTANT metros as "
                           "residence-of-record. Do not sum them into one 'imported "
                           "workforce' figure.",
    "totals": {"jobs_worked_in_pic12": total,
               "home_inside_pic12": inside,
               "home_outside_pic12": total - inside,
               "share_imported": round((total - inside) / total, 4)},
    "year": YEAR,
    "fetched": time.strftime("%Y-%m-%d")}, "rows": rows[:4000]}

p = os.path.join(HERE, "lodes.json" if YEAR == 2022 else f"lodes_{YEAR}.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"wrote {p} {round(os.path.getsize(p)/1024)} KB — {total:,} jobs worked in PIC-12, "
      f"{inside:,} live inside ({inside/total:.1%}), {total-inside:,} imported "
      f"({(total-inside)/total:.1%}), {len(rows):,} county pairs")
