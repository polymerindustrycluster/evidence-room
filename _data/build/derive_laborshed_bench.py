"""The reciprocal and the benchmark — the two things the commute matrix cannot say.

The matrix answers "who fills the jobs that sit in this county." That is ONE direction of a
two-directional quantity, and on its own it invites two errors:

  1. THE RECIPROCAL. "Only 48 percent of Summit's jobs are held by Summit residents" says
     nothing about where Summit's residents work. Those are different populations with
     different denominators. Both are computed here, from the same instrument, and never
     summed or subtracted.

  2. THE BENCHMARK. Cross-county commuting is the United States metropolitan default — it
     is close to the definition of a metropolitan area. Without a peer comparison, "no
     county is a labor market" describes the country and is dressed as a finding about
     Northeast Ohio. 397 counties in 73 single-state peer metros are measured by the same
     code path to settle it.

WHICH DENOMINATOR, WHERE — the two charts do not share a basis, on purpose:
  * The reciprocal uses the FULLEST denominator available in each direction: workplace from
    lodes.json (Ohio main + aux, so out-of-state residents working here are counted), and
    resident from lodes_resident.json (Ohio main + six neighbor aux files, so residents
    working out of state are counted).
  * The benchmark uses IN-STATE ONLY on both sides, because peer states' aux files were not
    fetched and a comparison has to be like-for-like. On that basis Summit reads 48.9 rather
    than 48.4; the gap is the Pennsylvania and out-of-state inflow, and it is stated rather
    than smoothed.
"""
import json, os, statistics
from footprints import PIC12, META

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
load = lambda fn: json.load(open(os.path.join(HERE, fn), encoding="utf-8"))

work = load("lodes.json")          # workplace side, full denominator
res = load("lodes_resident.json")  # resident side, full denominator
peer = load("lodes_peers.json")    # both sides, in-state only, PIC-12 + 73 peer metros

# ---- workplace own-share per county, on the page's published basis
wjobs, wown = {}, {}
for r in work["rows"]:
    wjobs[r["work"]] = wjobs.get(r["work"], 0) + r["jobs"]
    if r["home"] == r["work"]:
        wown[r["work"]] = wown.get(r["work"], 0) + r["jobs"]

res_by = {r["home"]: r for r in res["rows"]}
assert set(res_by) == set(PIC12), (
    f"resident file does not cover the footprint: missing "
    f"{sorted(set(PIC12) - set(res_by))} — re-run fetch_lodes_resident.py. A partial "
    f"footprint must fail the build, not average itself away.")

pairs = []
for c, name in PIC12.items():
    r = res_by[c]
    pairs.append({
        "county": c, "name": name,
        "work_jobs": wjobs[c], "work_own": round(wown[c] / wjobs[c], 4),
        "res_jobs": r["workers_total"], "res_own": r["own_share"],
        "res_region": r["region_share"]})
pairs.sort(key=lambda x: -x["res_region"])

# ---- the benchmark: PIC-12 counties inside the distribution of peer metro counties
pcs = peer["peer_counties"]
outside = sorted(r["own_share_work"] for r in pcs if not r["in_pic12"])
inside = [r for r in pcs if r["in_pic12"]]
pct = lambda v: sum(1 for x in outside if x < v) / len(outside)
for r in inside:
    r["percentile"] = round(pct(r["own_share_work"]), 3)
inside.sort(key=lambda r: -r["own_share_work"])

q = lambda f: outside[int(f * len(outside))]
below69 = sum(1 for x in outside if x < 0.69) / len(outside)

# ---- regions of comparable size, so "89.5 percent" can be read
regions = [r for r in peer["peers"] if r["counties"] >= 6]
regions.append(dict(peer["pic12"], name="PIC-12", kind="footprint"))
regions.sort(key=lambda r: -r["region_share_work"])

out = {"meta": {
    "source": "LEHD LODES8 origin-destination, 2022, segment JT00. " + res["meta"]["source"],
    "row": "one county, measured in both directions: jobs located in it, and jobs held by "
           "its residents. JOBS, not people.",
    "bases": "The reciprocal chart uses the fullest denominator in each direction. The "
             "benchmark chart uses in-state-only on both sides so PIC-12 and its peers are "
             "measured identically; Summit is 48.9 percent on that basis and 48.4 percent "
             "when out-of-state residents working here are included.",
    "peer_rule": peer["meta"]["fair_comparison"],
    "size_control": peer["meta"]["size_control"],
    "footprint": META["pic12"],
    "not_the_cluster": "LODES carries no industry dimension. This is the whole economy.",
    "fetched": res["meta"]["fetched"]},
    "pairs": pairs,
    "benchmark": {
        "n_peer_counties": len(outside),
        "n_peer_metros": peer["meta"]["n_peers"],
        "peer_deciles": {"p10": q(.10), "p25": q(.25), "p50": q(.50),
                         "p75": q(.75), "p90": q(.90)},
        "peer_median": q(.50),
        # the raw 397 values: the strip plot draws one tick per peer county, and a
        # binned summary would hide exactly what the chart exists to show
        "peer_values": [round(v, 4) for v in outside],
        "share_below_69": round(below69, 4),
        "pic12_counties": inside,
        "pic12_median": round(statistics.median(r["own_share_work"] for r in inside), 4)},
    "regions": regions,
    "totals": {
        "work_region_share": peer["pic12"]["region_share_work"],
        "res_region_share": res["meta"]["totals"]["region_share"],
        "res_own_share": res["meta"]["totals"]["own_county_share"],
        "out_of_state_share": res["meta"]["totals"]["out_of_state_share"]}}

p = os.path.join(WEB, "laborshed", "data", "bench.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"wrote {p}")
print(f"  peer metro counties: {len(outside)}, median {q(.50):.1%}, "
      f"{below69:.0%} below 69%")
print(f"  PIC-12 county median {out['benchmark']['pic12_median']:.1%} "
      f"(peer median {q(.50):.1%})")
print(f"  PIC-12 region: {peer['pic12']['region_share_work']:.1%} of jobs held by residents; "
      f"{res['meta']['totals']['region_share']:.1%} of residents' jobs are inside it")
print(f"  regions with 6+ counties, ranked: "
      f"{', '.join(r['name'].split(',')[0][:18] + ' ' + format(r['region_share_work'], '.1%') for r in regions[:4])}")
