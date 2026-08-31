"""The branch-plant undercount, measured: invented here, credited elsewhere.

Reads `_patents_raw.jsonl` (see `fetch_patents.py`) and produces `patents.json`.

THE WINDOW IS 2015-2025 AND THE REASON IS PATENT LAW, NOT DATA QUALITY. The America Invents
Act took effect 16 September 2012. Before it, an application was filed in the INVENTOR's name
and USPTO recorded no applicant at all; after it, assignees file in their own name. Measured
share of PIC-12-invented applications carrying any applicant:

    2001-2011   0.0% - 2.7%        2013   69.3%       2015   90.4%
    2012       21.0%               2014   83.8%       2025   97.2%

Running the whole 2001-2025 corpus reports "50.4% no applicant listed", which reads as a
finding about ownership and is a finding about **legislative history**. The window starts at
2015, the first year above 90%.

WHAT ONE ROW IS. One patent APPLICATION with at least one inventor whose RESIDENCE address
is in a PIC-12 city. Not a granted patent — see `fetch_patents.py`. An application with three
Akron inventors and one in Texas counts once, here, because the question is whether the
region gets credit for work done in it, not how much of the work was done in it.

RESIDENCE, NOT POSTAL. Inventors carry both. The postal address is frequently the EMPLOYER'S,
which would collapse the exact distinction being measured — an inventor whose postal address
is Bridgestone's would be classified by their employer's location on both sides of the
comparison, guaranteeing agreement.

THE CITY LIST COMES FROM AN AUTHORITATIVE CROSSWALK — see `build_pic12_geo.py`. An earlier
version derived it from FRS `county_name`, which is unreliable (FRS places an Ohio town in
"SANTA CLARA COUNTY"). That let COLUMBUS into the footprint mapped to Portage, and matching on
the name swept in every Columbus, Ohio inventor: **309 of 3,147 applications, 9.8% of this
base, were contaminated.** The list is now admitted by Census ZCTA-to-county assignment.

WHAT THIS CANNOT SAY. Patent counts measure disclosure, not invention: firms that protect
process know-how as trade secret are invisible, and that is common in compounding. A patent
counted here may also have been assigned after filing — `applicantBag` is the applicant at
filing, not the current owner.
"""
import collections
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
GEO = json.load(open(os.path.join(HERE, "pic12_geo.json"), encoding="utf-8"))
CITIES = GEO["cities"]
Y0, Y1 = 2015, 2025

rows = [json.loads(l) for l in open(os.path.join(HERE, "_patents_raw.jsonl"), encoding="utf-8")]


def in12(a):
    return a.get("state") == "OH" and a.get("city") in CITIES


def year(r):
    f = (r.get("filed") or "")[:4]
    return int(f) if f.isdigit() else None


invented = [r for r in rows
            if any(in12(x) for x in r["inventors"] if x["cat"] == "residence")
            and year(r) and Y0 <= year(r) <= Y1]
have = [r for r in invented if any(a["name"] or a["city"] for a in r["applicants"])]
if not have:
    raise SystemExit("FATAL: no applications with an applicant. The AIA window or the "
                     "applicant field path is wrong; this returned 2,954 on 2026-08-17.")


def cls(r):
    aps = [a for a in r["applicants"] if a["name"] or a["city"]]
    if any(in12(a) for a in aps):
        return "pic12"
    if any(a["state"] == "OH" for a in aps):
        return "ohio_other"
    if any(a["country"] and a["country"] != "US" for a in aps):
        return "foreign"
    if any(a["state"] for a in aps):
        return "us_other"
    return "unclassifiable"


split = collections.Counter(cls(r) for r in have)
exporters, local, loc = collections.Counter(), collections.Counter(), {}
for r in have:
    for a in r["applicants"]:
        if not a["name"]:
            continue
        k = a["name"].upper()
        loc.setdefault(k, {"city": a["city"].title(),
                           "state": a["state"] or a["country"], "pic12": in12(a)})
        (local if in12(a) else exporters)[k] += 1

series = collections.defaultdict(lambda: collections.Counter())
for r in have:
    series[year(r)][cls(r)] += 1

away = sum(v for k, v in split.items() if k not in ("pic12", "unclassifiable"))
out = {
    "meta": {
        "source": "USPTO Open Data Portal, patent applications, CPC C08*/B29*, inventor "
                  "residence in Ohio, cut to PIC-12 cities",
        "row": "one patent APPLICATION with >=1 inventor RESIDING in a PIC-12 city",
        "not_grants": "Applications, not granted patents. May be abandoned or still pending. "
                      "Never write 'patents awarded'.",
        "window_is_legal_not_editorial":
            "2015-2025. The America Invents Act (Sept 2012) created the applicant field; "
            "before it 0-2.7% of applications carry one, so the full 2001-2025 corpus reports "
            "'50.4% no applicant', which is legislative history misread as ownership.",
        "residence_not_postal":
            "An inventor's postal address is often the employer's, which would collapse the "
            "distinction being measured. Residence only.",
        "geography": f"{len(CITIES)} PIC-12 city names admitted by Census ZCTA-to-county crosswalk "
                     f"(build_pic12_geo.py). The prior FRS-derived list admitted COLUMBUS and "
                     f"contaminated 9.8% of this base.",
        "patents_measure_disclosure":
            "Trade-secret process know-how is invisible to patents and is common in "
            "compounding. This counts what firms chose to disclose.",
        "applicant_is_at_filing": "Post-filing assignment is not reflected.",
        "counts": {"invented_in_pic12": len(invented), "with_applicant": len(have),
                   "credited_away": away,
                   "credited_away_pct": round(away / len(have) * 100, 1)},
        "split": dict(split),
        "years": [Y0, Y1],
        "generated": "2026-08-17",
    },
    "series": {str(y): dict(v) for y, v in sorted(series.items())},
    "exporters": [{"name": k, "n": v, **loc[k]} for k, v in exporters.most_common(40)],
    "local": [{"name": k, "n": v, **loc[k]} for k, v in local.most_common(40)],
}
json.dump(out, open(os.path.join(HERE, "patents.json"), "w", encoding="utf-8"), indent=1)
print(f"invented in PIC-12, 2015-2025: {len(invented):,}")
print(f"  with applicant recorded:     {len(have):,}")
print(f"  CREDITED ELSEWHERE:          {away:,} ({away/len(have)*100:.1f}%)")
print("wrote patents.json")
