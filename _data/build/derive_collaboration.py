"""Shape the collaboration measures for the page, and carry the control series with them.

The page's whole risk is a false trend. Joint output falls from 29 works in 2018 to 2 in
2024, and there are two innocent explanations that have to be excluded on the page rather
than in a footnote:

  1. INDEXING LAG. OpenAlex indexes recent years incompletely, so any series ending at the
     present droops. Excluded by carrying each university's OWN total output beside the
     joint count: Case Western's is flat-to-rising through 2024, so the platform is not
     simply missing recent work.
  2. ONE PARTNER SHRINKING. If Akron's whole research output halved, joint work would fall
     with it and say nothing about the relationship. It DID nearly halve — so the page
     reports joint work as a SHARE of Akron's output as well as a count, because that is
     the version of the question the count cannot answer.

Neither control is decoration. Without them this is a chart of a number going down.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
C = json.load(open(os.path.join(HERE, "collab.json"), encoding="utf-8"))

# Own-output control, FETCHED (see fetch_collab.py) rather than hand-entered. An earlier
# draft of this file typed the 2012-2015 values in from memory; they were invented, which is
# the single worst failure mode available to a page whose entire argument is a controlled
# comparison. If the key is missing, fail — never fall back to a partial control.
if "own" not in C:
    raise SystemExit("collab.json has no `own` series — re-run fetch_collab.py. The joint "
                     "trend must not be published without the control that separates it "
                     "from indexing lag and from one partner shrinking.")
OWN = {r["year"]: {"akron": r["akron"], "cwru": r["cwru"]} for r in C["own"]}

co = {r["year"]: r["works"] for r in C["coauthorship"]}
poly = {r["year"]: r["works"] for r in C["coauthorship_polymer"]}
YEARS = [r["year"] for r in C["coauthorship"]]
missing = [y for y in YEARS if y not in OWN]
assert not missing, (
    f"own-output control is missing {missing}. The joint series must never be published "
    f"without it — a falling count with no control is indistinguishable from indexing lag "
    f"or from one partner shrinking. Re-pull OWN before deriving.")

bio = {r["year"]: r["works"] for r in C.get("coauthorship_biomaterials", [])}
series = [{"year": y, "joint": co[y], "polymer": poly[y], "bio": bio.get(y, 0),
           "akron": OWN[y]["akron"], "cwru": OWN[y]["cwru"],
           # joint work per thousand of Akron's output: the count, controlled for the fact
           # that the smaller partner nearly halved over the same period
           "per_1k_akron": round(co[y] / OWN[y]["akron"] * 1000, 2)}
          for y in YEARS]

pk = max(series, key=lambda r: r["joint"])
# The last year with ANY polymer- or biomaterials-classified joint paper. Zero since is the
# finding; an absence needs a date attached or it is just a gap in a chart.
_subj = [r for r in series if r["polymer"] or r["bio"]]
last_subject_year = _subj[-1]["year"] if _subj else None
last = series[-1]
awards = C["joint_awards"]
gap_since = max((a["start"] or "")[-4:] for a in awards) if awards else None

out = {"meta": dict(C["meta"],
                    control="Each university's own annual output is carried beside the "
                            "joint count, because a joint series alone cannot tell a "
                            "thinning relationship from an indexing lag or from one "
                            "partner shrinking.",
                    row="one year: works listing both institutions, works matching "
                        "'polymer', and each institution's own total output."),
       "totals": dict(C["totals"], peak_year=pk["year"], peak_joint=pk["joint"],
                      last_year=last["year"], last_joint=last["joint"],
                      newest_joint_award_year=gap_since,
                      polymer_total=sum(r["polymer"] for r in series),
                      bio_total=sum(r["bio"] for r in series),
                      subject_total=sum(r["polymer"] + r["bio"] for r in series),
                      last_subject_year=last_subject_year),
       "series": series, "joint_awards": awards, "sample": C["sample"]}

p = os.path.join(WEB, "collaboration", "data", "collaboration.json")
os.makedirs(os.path.dirname(p), exist_ok=True)
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"wrote {p}")
print(f"  {out['totals']['coauthored']} coauthored works, "
      f"{out['totals']['coauthored_polymer']} polymer-matching")
print(f"  peak {pk['joint']} in {pk['year']} -> {last['joint']} in {last['year']}")
print(f"  per 1k of Akron output: {pk['per_1k_akron']} -> {last['per_1k_akron']}")
print(f"  {len(awards)} joint NSF awards, newest starting {gap_since}")
