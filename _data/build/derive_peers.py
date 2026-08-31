"""Derive the peer-positioning dataset.

THE CENTRAL PROBLEM THIS FILE SOLVES
  BLS suppresses employment for most metros — 1,430 of 1,907 metro rows in the 2024
  cross-section. A "national rank" computed from what is left silently omits Chicago,
  New York, Atlanta, Dallas and Houston. So every rank this file emits is explicitly a
  rank AMONG DISCLOSED AREAS, and it ships with the count of areas that could displace
  it (suppressed areas with MORE establishments than the subject).

  States are barely suppressed (282 disclosed vs 26). State comparison is the robust
  claim; metro comparison is the interesting one that needs the caveat attached.
"""
import json, os, collections
from footprints import PIC12, META

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
SRC = json.load(open(os.path.join(HERE, "peers.json"), encoding="utf-8"))
T, ROWS = SRC["titles"], SRC["rows"]
CROSS = SRC["meta"]["cross_year"]
AKRON, OHIO, US = "C1042", "39000", "US000"
FOOTPRINT = "pic12"
NEO = set(PIC12)


def kind(a):
    if a == US: return "national"
    if a.startswith("C"): return "metro"
    if a.endswith("000") and len(a) == 5: return "state"
    return "county"


for r in ROWS:
    r["kind"] = kind(r["area"])
    r["name"] = T.get(r["area"], r["area"])

idx = collections.defaultdict(list)
for r in ROWS:
    idx[(r["year"], r["naics"], r["kind"])].append(r)


def rank_block(year, naics, k, subject):
    """A ranking plus everything needed to judge whether to trust it."""
    all_rows = idx[(year, naics, k)]
    disclosed = [r for r in all_rows if not r["suppressed"] and r["emp"]]
    supp = [r for r in all_rows if r["suppressed"]]
    ranked = sorted(disclosed, key=lambda r: -r["emp"])
    subj = next((r for r in disclosed if r["area"] == subject), None)
    pos = next((i for i, r in enumerate(ranked, 1) if r["area"] == subject), None)
    # the honest limit: suppressed areas with more establishments than the subject
    could_displace = []
    if subj and subj["estabs"]:
        could_displace = sorted(
            [r for r in supp if r["estabs"] and r["estabs"] > subj["estabs"]],
            key=lambda r: -r["estabs"])
    by_lq = sorted([r for r in disclosed if r["lq"]], key=lambda r: -r["lq"])
    return {
        "year": year, "naics": naics, "kind": k,
        "subject": subject, "subject_name": T.get(subject, subject),
        "subject_emp": subj["emp"] if subj else None,
        "subject_estabs": subj["estabs"] if subj else None,
        "subject_lq": subj["lq"] if subj else None,
        "rank_emp": pos, "of_disclosed": len(ranked),
        "rank_lq": next((i for i, r in enumerate(by_lq, 1) if r["area"] == subject), None),
        "suppressed": len(supp),
        "could_displace": [{"area": r["area"], "name": r["name"], "estabs": r["estabs"]}
                           for r in could_displace[:30]],
        "could_displace_n": len(could_displace),
        "top": [{"area": r["area"], "name": r["name"], "emp": r["emp"],
                 "estabs": r["estabs"], "lq": r["lq"]} for r in ranked[:25]],
    }


# A HOLE IN A TREND LINE IS A SUPPRESSION, AND IT HAS TO SAY SO. BLS withholds most
# metro-years for this industry; the house rule is that a withheld cell is never a zero,
# so the deriver drops it entirely, which leaves a gap that looks exactly like a fetch
# that failed. Declaring the policy is what tells verify_series (and a reader) which it is.
GAPS = {"kind": "suppression",
        "reason": "BLS withholds employment for most metro-years in this industry; a "
                  "withheld cell is dropped, never drawn as zero, so a trend line is "
                  "broken wherever the bureau did not publish"}
out = {"gaps": GAPS,
       "meta": dict(SRC["meta"], footprint=META[FOOTPRINT], derived_note=(
        "Every rank here is among DISCLOSED areas. `could_displace_n` counts suppressed "
        "areas with more establishments than the subject — the number that would have to "
        "be zero for a plain 'national rank' to be honest.")),
       "cross_year": CROSS}

# 1. the robust comparison: states
out["states"] = {n: rank_block(CROSS, n, "state", OHIO) for n in
                 ("325", "326", "3261", "3262")}

# 2. the interesting one: metros
out["metros"] = {n: rank_block(CROSS, n, "metro", AKRON) for n in
                 ("325", "326", "3261", "3262")}

# 3. the full disclosed metro cross-section for 326 — the scatter
m326 = [r for r in idx[(CROSS, "326", "metro")] if not r["suppressed"] and r["emp"] and r["lq"]]
out["metro_scatter"] = sorted(
    [{"area": r["area"], "name": r["name"], "emp": r["emp"], "estabs": r["estabs"],
      "lq": r["lq"], "wage": r["wage"]} for r in m326], key=lambda r: -r["emp"])

# 4. how much of the country is invisible, by geography level
vis = {}
for k in ("metro", "county", "state"):
    rows = idx[(CROSS, "326", k)]
    d = [r for r in rows if not r["suppressed"] and r["emp"]]
    s = [r for r in rows if r["suppressed"]]
    vis[k] = {"disclosed": len(d), "suppressed": len(s),
              "disclosed_emp": round(sum(r["emp"] for r in d)),
              "suppressed_estabs": round(sum(r["estabs"] or 0 for r in s))}
out["visibility"] = vis

# 5. trend for the two industries that carry the story
PEERS = [AKRON, "C1746", "C2486", "C2138", "C2110", "C3346"]   # resolved below by title
peer_pool = {}
for naics in ("326", "3262"):
    for y in SRC["meta"]["trend_years"]:
        for r in idx[(y, naics, "metro")]:
            if r["suppressed"] or not r["emp"]:
                continue
            peer_pool.setdefault((naics, r["area"]), []).append(
                {"year": y, "emp": r["emp"], "lq": r["lq"], "estabs": r["estabs"]})
# keep metros with a full series and a top-30 finish in the cross-section
keep = {}
for naics in ("326", "3262"):
    top = [r["area"] for r in sorted(
        [x for x in idx[(CROSS, naics, "metro")] if not x["suppressed"] and x["emp"]],
        key=lambda r: -r["emp"])[:30]]
    for a in set(top) | {AKRON}:
        s = peer_pool.get((naics, a))
        if s and len(s) >= 8:
            keep[f"{naics}|{a}"] = {"naics": naics, "area": a, "name": T.get(a, a),
                                    "series": sorted(s, key=lambda x: x["year"])}
out["trend"] = keep

# 6. Ohio and NEO counties in the national county distribution
cty = [r for r in idx[(CROSS, "326", "county")] if not r["suppressed"] and r["emp"]]
cty_ranked = sorted(cty, key=lambda r: -r["emp"])
out["footprint_counties"] = [
    {"area": r["area"], "name": r["name"], "emp": r["emp"], "lq": r["lq"],
     "rank": i, "of": len(cty_ranked)}
    for i, r in enumerate(cty_ranked, 1) if r["area"] in NEO]

p = os.path.join(WEB, "peers", "data", "peers.json")
os.makedirs(os.path.dirname(p), exist_ok=True)
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print("wrote", p, round(os.path.getsize(p) / 1024), "KB")
print()
m = out["metros"]["326"]
print(f"Akron, NAICS 326, {CROSS}:")
print(f"  {m['subject_emp']:.0f} jobs, {m['subject_estabs']:.0f} establishments, LQ {m['subject_lq']}")
print(f"  rank {m['rank_emp']} of {m['of_disclosed']} DISCLOSED metros by employment")
print(f"  rank {m['rank_lq']} of {m['of_disclosed']} by concentration")
print(f"  {m['suppressed']} metros suppressed; {m['could_displace_n']} of them have MORE establishments")
print(f"  largest suppressed: " + ", ".join(
    f"{x['name'].split(',')[0]} ({x['estabs']:.0f})" for x in m["could_displace"][:5]))
s = out["states"]["326"]
print()
print(f"Ohio, NAICS 326, {CROSS}:")
print(f"  {s['subject_emp']:.0f} jobs, LQ {s['subject_lq']}, rank {s['rank_emp']} of {s['of_disclosed']} disclosed states")
print(f"  {s['suppressed']} states suppressed; {s['could_displace_n']} could displace")
print()
print("visibility of NAICS 326:")
for k, v in vis.items():
    tot = v["disclosed"] + v["suppressed"]
    print(f"  {k:7s} {v['disclosed']:5d} disclosed of {tot:5d}  ({v['disclosed']/tot*100:.0f}%)")
print()
print(f"trend series kept: {len(keep)} | footprint counties in national ranking: {len(out['footprint_counties'])}")
