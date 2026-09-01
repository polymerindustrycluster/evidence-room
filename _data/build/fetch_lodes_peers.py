"""Is PIC-12's containment unusual, or is it just America?

"No county is a labor market" is only a finding about Northeast Ohio if county-level
containment is materially lower here than in comparable places. Cross-county commuting is
the US metropolitan default — that is what a metropolitan area IS, and OMB delineates them
using commuting interchange — so the claim needs a benchmark or it is describing the country.

WHAT IS COMPARED, AND WHY IT IS FAIR
  The same two shares, from the same instrument, computed by the same code path:
    own-county share  = a resident's jobs that sit in their own county
    region share      = a resident's jobs that sit anywhere in their own region
  Peer regions are METROPOLITAN AREAS (CBSAs). PIC-12 is a custom 12-county footprint, so
  it is entered as its own row rather than pretending to be a CBSA.

TWO CONTROLS THAT MATTER
  1. SIZE. A bigger region mechanically contains more of its own workers — a 12-county
     region will beat a 2-county one on region share for no economic reason at all. So the
     comparison is plotted AGAINST region size, never as a bare league table.
  2. STATE BORDERS. This reads each state's `main` file, which is home-in-state and
     work-in-state. A metro straddling a state line (Cincinnati, Philadelphia, New York,
     Chicago) would show falsely high containment because its out-of-state commuters are
     invisible. Those are EXCLUDED, not silently included. PIC-12 qualifies on its own
     terms: its measured out-of-state work is 1.3%.

  python fetch_lodes_peers.py
"""
import csv, gzip, io, json, os, time, urllib.request, collections
from footprints import PIC12, META

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
YEAR = 2022
BASE = "https://lehd.ces.census.gov/data/lodes/LODES8"
# Manufacturing-weighted states, chosen for peer metros rather than coverage. Every metro
# they contain is measured; nothing is hand-picked after seeing a number.
STATES = ["oh", "pa", "mi", "in", "il", "wi", "ny", "nc", "sc", "tn", "mo", "mn"]
MIN_JOBS = 60_000        # below this a "metro" is a small town and the comparison is noise


def open_gz(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        resp = urllib.request.urlopen(req, timeout=600)
    except Exception as e:
        print(f"    (skip {url.rsplit('/', 1)[-1]}: {e})", flush=True)
        return None
    return gzip.GzipFile(fileobj=io.BufferedReader(resp))


cbsa_of, cbsa_name, cbsa_states = {}, {}, collections.defaultdict(set)
flows = collections.Counter()

# 40 million block pairs to produce a few thousand county pairs. Cache the county-level
# result so re-deriving a chart never means re-downloading a state.
CACHE = os.path.join(HERE, "lodes_flows_cache.json")
if os.path.exists(CACHE):
    c = json.load(open(CACHE, encoding="utf-8"))
    flows = collections.Counter({tuple(k.split(">")): v for k, v in c["flows"].items()})
    cbsa_of = c["cbsa_of"]
    cbsa_name = c["cbsa_name"]
    cbsa_states = collections.defaultdict(set, {k: set(v) for k, v in c["cbsa_states"].items()})
    print(f"  cache: {len(flows):,} county pairs from {CACHE}")
    STATES = []

for st in STATES:
    t0 = time.time()
    gz = open_gz(f"{BASE}/{st}/{st}_xwalk.csv.gz")
    if gz:
        with gz:
            rd = csv.DictReader(io.TextIOWrapper(gz, encoding="latin-1"))
            for r in rd:
                c, cb = r["cty"], r["cbsa"]
                if cb and cb != "99999":
                    cbsa_of[c] = cb
                    cbsa_name[cb] = r["cbsaname"]
                    cbsa_states[cb].add(c[:2])
    gz = open_gz(f"{BASE}/{st}/od/{st}_od_main_JT00_{YEAR}.csv.gz")
    if not gz:
        continue
    n = 0
    with gz:
        rd = csv.reader(io.TextIOWrapper(gz, encoding="utf-8"))
        head = next(rd)
        iw, ih, is_ = head.index("w_geocode"), head.index("h_geocode"), head.index("S000")
        for row in rd:
            flows[(row[ih][:5], row[iw][:5])] += int(row[is_])
            n += 1
    print(f"  {st}: {n:,} block pairs, {time.time()-t0:.0f}s", flush=True)

if not flows:
    raise SystemExit("FATAL: no flows read. A zero here is a bug, not an empty country.")

if not os.path.exists(CACHE):
    json.dump({"flows": {f"{h}>{w}": v for (h, w), v in flows.items()},
               "cbsa_of": cbsa_of, "cbsa_name": cbsa_name,
               "cbsa_states": {k: sorted(v) for k, v in cbsa_states.items()}},
              open(CACHE, "w", encoding="utf-8"), separators=(",", ":"))


def measure(name, counties, kind):
    """Resident-side containment for an arbitrary set of counties, one code path for all."""
    cs = set(counties)
    total = own = inside = 0
    for (h, w), v in flows.items():
        if h not in cs:
            continue
        total += v
        if w == h:
            own += v
        if w in cs:
            inside += v
    if not total:
        return None
    # The WORKPLACE side of the same flows. The published laborshed page is workplace-side
    # ("jobs here held by people who live here"), so benchmarking it against a resident-side
    # peer median would compare two different quantities — the exact substitution the
    # register's council flagged. Both sides, same code path, same row.
    wtotal = wown = winside = 0
    for (h, w), v in flows.items():
        if w not in cs:
            continue
        wtotal += v
        if w == h:
            wown += v
        if h in cs:
            winside += v
    return {"name": name, "kind": kind, "counties": len(cs), "resident_jobs": total,
            "own_share": round(own / total, 4), "region_share": round(inside / total, 4),
            "jobs_located": wtotal,
            "own_share_work": round(wown / wtotal, 4) if wtotal else None,
            "region_share_work": round(winside / wtotal, 4) if wtotal else None}


# --- peer metros: every CBSA in the fetched states that is single-state and big enough
by_cbsa = collections.defaultdict(list)
for c, cb in cbsa_of.items():
    by_cbsa[cb].append(c)

def name_states(nm):
    """The state codes a CBSA's own name carries: 'Kansas City, MO-KS' -> {MO, KS}."""
    return set(nm.rsplit(",", 1)[-1].strip().split("-")) if "," in nm else set()


peers = []
skipped_multistate = []
for cb, counties in by_cbsa.items():
    # The county-based test ALONE is not sufficient and quietly produced two wrong rows:
    # only the states in STATES were crosswalked, so "New York-Newark-Jersey City, NY-NJ"
    # and "Kansas City, MO-KS" presented as single-state because their other halves were
    # never loaded — and then scored 97.8% and 88.4% containment on a truncated denominator.
    # The CBSA's own name is the authority on how many states it spans.
    if (len({c[:2] for c in counties}) > 1 or len(cbsa_states[cb]) > 1
            or len(name_states(cbsa_name.get(cb, ""))) > 1):
        skipped_multistate.append(cbsa_name.get(cb, cb))
        continue
    m = measure(cbsa_name.get(cb, cb), counties, "metro")
    if m and m["resident_jobs"] >= MIN_JOBS:
        peers.append(m)
peers.sort(key=lambda r: -r["resident_jobs"])

# --- PIC-12 measured by the identical code path, so the row is comparable by construction
pic = measure(META["pic12"]["label"], set(PIC12), "footprint")
# and its largest constituent metro, because a reader will ask
akron = measure("Akron, OH (Summit + Portage)", {"39153", "39133"}, "metro")

# Every county inside a qualifying peer metro, measured one county at a time. The
# published page's claim is about COUNTIES ("not one of the twelve reaches 69 percent"),
# so the benchmark has to be a distribution of counties, not of regions.
peer_cbsas = {cb for cb, cs in by_cbsa.items()
              if len({c[:2] for c in cs}) == 1 and len(cbsa_states[cb]) == 1
              and len(name_states(cbsa_name.get(cb, ""))) == 1}
peer_counties = []
for cb in peer_cbsas:
    for c in by_cbsa[cb]:
        m = measure(c, [c], "county")
        if m and m["jobs_located"] >= 8000:
            m["metro"] = cbsa_name.get(cb, cb)
            m["in_pic12"] = c in PIC12
            if c in PIC12:
                m["name"] = PIC12[c]
            peer_counties.append(m)
peer_counties.sort(key=lambda r: r["own_share_work"])

out = {"meta": {
    "source": f"LEHD LODES8 origin-destination, {YEAR}, segment JT00 (all jobs), `main` "
              f"files for {', '.join(s.upper() for s in STATES)}, with LODES' own county-to-"
              "CBSA crosswalk.",
    "row": "one region: the share of jobs held by its residents that sit in their own "
           "county, and the share that sit anywhere inside the region.",
    "measure": "RESIDENT side. Denominator is jobs held by residents of the region, not "
               "jobs located in it. This is the reciprocal of the commute matrix.",
    "fair_comparison": "Only single-state metros are included; a state-straddling metro "
                       "would show falsely high containment because this reads in-state "
                       "files. Metros under 60,000 resident jobs are excluded as noise.",
    "size_control": "Region share rises mechanically with the number of counties in a "
                    "region. Read it against region size, never as a ranking.",
    "excluded_multistate": sorted(set(skipped_multistate))[:20],
    "n_peers": len(peers),
    "year": YEAR, "fetched": time.strftime("%Y-%m-%d")},
    "pic12": pic, "akron": akron, "peers": peers, "peer_counties": peer_counties}

p = os.path.join(HERE, "lodes_peers.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
med = lambda k: sorted(r[k] for r in peers if r[k] is not None)[len(peers) // 2]
med_own, med_reg = med("own_share"), med("region_share")
print(f"  peer median WORKPLACE: own-county {med('own_share_work'):.1%}, "
      f"region {med('region_share_work'):.1%}")
print(f"  PIC-12   WORKPLACE:    own-county {pic['own_share_work']:.1%}, "
      f"region {pic['region_share_work']:.1%}")
print(f"\nwrote {p} — {len(peers)} single-state metros")
print(f"  peer median: own-county {med_own:.1%}, region {med_reg:.1%}")
print(f"  PIC-12:      own-county {pic['own_share']:.1%}, region {pic['region_share']:.1%} "
      f"across {pic['counties']} counties")
print(f"  Akron metro: own-county {akron['own_share']:.1%}, region {akron['region_share']:.1%}")
