"""Do the University of Akron and Case Western Reserve actually work together?

WHY THIS EXISTS. A prior version of the talent page ended with the claim that PIC could put
the two chairs "in the same room, which nothing in this data suggests has happened." That is
an unbounded negative resting on data that was never about collaboration at all — the same
logical form as a "no source document connects them" own-goal this project has already
published once. It was deleted. This file is its replacement: the claim, measured.

TWO INDEPENDENT MEASURES OF THE SAME PROPOSITION
  1. Coauthorship  — OpenAlex works listing BOTH institutions.
  2. Joint federal awards — NSF awards binding both, found two ways (below).
Both point at "do these institutions collaborate," which is what the register's replacement
rule requires: independent measures of substantially the SAME proposition, not two adjacent
quantities juxtaposed. Publications and dollars are different instruments pointed at one
question, and they can genuinely disagree.

TWO WAYS TO FIND A JOINT AWARD, because NSF encodes them differently:
  a. ONE award, two institutions — the PI and a co-PI hold emails at the two domains. Precise,
     and it is how the NEO-SMART Engine's coalition is visible.
  b. TWO awards, one project — NSF's "Collaborative Research:" mechanism issues a separate
     award to each institution under an identical title. Matching normalized titles across
     the two award lists recovers the pair. Missing this method undercounts badly.

WHAT A NULL WOULD AND WOULD NOT MEAN — decided before the numbers were seen. OpenAlex
affiliation data is incomplete, NSF's coPDPI field lists signatories rather than the full
coalition, and neither source sees industry contracts, consortium membership, joint teaching
or a conversation. So this instrument can DEMONSTRATE collaboration and cannot demonstrate
its absence. A thin result is reported as "not detectable at this resolution" and is not
published as a finding about the institutions.

  python fetch_collab.py
"""
import json, os, re, time, urllib.parse, urllib.request, collections

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
# THE WINDOW ENDS AT THE LAST COMPLETE PUBLICATION YEAR, and it is hand-set, because a
# publication year that is still running looks exactly like a collapse in joint output.
# It is guarded: col-no-new-joint-award asserts the window's end year, so extending this
# range without re-reading the page's shape sentences fails the claims gate rather than
# shipping a stale one. It went stale once: the pull ran on 2026-08-17 with the range
# stopping at 2024, and by 2026-08-31 OpenAlex was returning six joint works for 2025,
# a tripling off the 2024 floor the page called the third year of a fall.
YEARS = list(range(2012, 2026))
NSF = "https://api.nsf.gov/services/v1/awards.json"
OA = "https://api.openalex.org/works"

INST = {
    "akron": {"name": "University of Akron", "openalex": "I110152177",
              "domains": ("uakron.edu",)},
    "cwru": {"name": "Case Western Reserve University", "openalex": "I58956616",
             "domains": ("case.edu", "cwru.edu")},
}
# Polymer relevance is a CLASSIFICATION, not a keyword. OpenAlex subfield 2507 "Polymers
# and Plastics", confirmed against the authoritative snapshot rather than guessed. The
# earlier full-text "polymer" match could not distinguish this from subfield 2502
# "Biomaterials" — biomedical polymer work — which is a different question about a different
# cluster. Both counts are taken so the page can say what the bound changed.
SUBFIELD = "2507"          # Polymers and Plastics
SUBFIELD_ALT = "2502"      # Biomaterials, reported separately and never merged in
from contact import MAILTO  # noqa: E402


def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                        timeout=180) as r:
                return json.load(r)
        except Exception as e:
            if i == tries - 1:
                print(f"    FAILED {url[:110]}: {e}")
                return None
            time.sleep(2 + 3 * i)


# HOUSE STYLE REACHES INTO THE META STRINGS. Everything written into `meta` below is
# rendered as prose on the page, in the figure source line and in the generated methodology
# box, so tools/style.mjs reads it as published writing: typographer's quotes only. The
# 2026-08-31 refresh regenerated this file with ASCII apostrophes and the style gate failed
# on six text nodes the page had been shipping correctly, because the committed JSON had
# been hand-corrected after the last pull and the generator never was.


# ---------------------------------------------------------------- 1. NSF awards
def nsf_awards(name):
    """Every award to this awardee since 2012. Paged; NSF caps rpp at 25."""
    out, offset = [], 1
    fields = ("id,title,startDate,estimatedTotalAmt,awardeeName,piEmail,coPDPI,"
              "piFirstName,piLastName,fundProgramName")
    while True:
        u = (f"{NSF}?awardeeName=%22{urllib.parse.quote(name)}%22&printFields={fields}"
             f"&dateStart=01/01/2012&rpp=25&offset={offset}")
        d = get(u)
        got = (d or {}).get("response", {}).get("award", [])
        out += got
        if len(got) < 25:
            break
        offset += 25
        if offset > 4000:
            print("    (stopped at 4000 — check paging)")
            break
    return out


awards = {}
for k, v in INST.items():
    awards[k] = nsf_awards(v["name"])
    print(f"  NSF {v['name']}: {len(awards[k]):,} awards since 2012", flush=True)


def amt(v):
    """NSF returns estimatedTotalAmt as a STRING. Summing without this raises TypeError on
    the first collaborative pair; coercing silently to 0 would understate the dollars."""
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0


def emails(a):
    e = [a.get("piEmail") or ""]
    for c in (a.get("coPDPI") or []):
        m = re.search(r"[\w.+-]+@[\w.-]+", c)
        if m:
            e.append(m.group(0))
    return [x.lower() for x in e if x]


def domains_of(a):
    return {k for k, v in INST.items()
            if any(e.endswith(v["domains"]) for e in emails(a))}


# a. one award naming people at both institutions
both_in_one = []
for k, lst in awards.items():
    for a in lst:
        if len(domains_of(a)) == 2:
            both_in_one.append(dict(a, _via="co-PI at both institutions", _side=k))

# b. NSF "Collaborative Research:" — one project, two awards, identical title
def norm(t):
    t = re.sub(r"^\s*(collaborative research|career|nsf|eager|rapid|goali)\s*:\s*", "",
               (t or "").lower())
    return re.sub(r"[^a-z0-9 ]+", " ", t).strip()


by_title = collections.defaultdict(dict)
for k, lst in awards.items():
    for a in lst:
        n = norm(a.get("title"))
        if len(n) > 25:                      # a very short title is not a safe key
            by_title[n].setdefault(k, []).append(a)
# A shared TITLE is not a shared PROJECT. Both universities hold awards literally titled
# "Graduate Research Fellowship Program (GRFP)" — an institutional fellowship block that
# every university receives separately — and matching on title alone booked it as a
# $1.1M joint project across five award IDs. NSF's collaborative mechanism names itself in
# the title, so require that name rather than inferring a partnership from a coincidence.
def is_collaborative(a):
    return "collaborative research" in (a.get("title") or "").lower()


by_title = {n: v for n, v in by_title.items()
            if all(any(is_collaborative(x) for x in lst) for lst in v.values())}
title_pairs = [{"title": a["akron"][0]["title"], "norm": n,
                "akron": [{"id": x["id"], "amt": amt(x.get("estimatedTotalAmt")),
                           "start": x.get("startDate")} for x in a["akron"]],
                "cwru": [{"id": x["id"], "amt": amt(x.get("estimatedTotalAmt")),
                          "start": x.get("startDate")} for x in a["cwru"]]}
               for n, a in by_title.items() if len(a) == 2]

seen = set()
joint = []
for a in both_in_one:
    if a["id"] in seen:
        continue
    seen.add(a["id"])
    joint.append({"id": a["id"], "title": a.get("title"), "start": a.get("startDate"),
                  "amount": amt(a.get("estimatedTotalAmt")), "awardee": a.get("awardeeName"),
                  "via": a["_via"]})
for p in title_pairs:
    ids = [x["id"] for x in p["akron"] + p["cwru"]]
    if any(i in seen for i in ids):
        continue
    seen.update(ids)
    joint.append({"id": " + ".join(ids), "title": p["title"],
                  "start": min(x["start"] for x in p["akron"] + p["cwru"] if x["start"]),
                  "amount": sum(x["amt"] for x in p["akron"] + p["cwru"]),
                  "awardee": "both (NSF Collaborative Research)",
                  "via": "separate awards, one project"})
joint.sort(key=lambda r: (r["start"] or "")[-4:] + (r["start"] or "")[:2])
print(f"  joint NSF awards: {len(both_in_one)} via co-PI, {len(title_pairs)} via "
      f"collaborative-research title pair, {len(joint)} distinct")


# ---------------------------------------------------------- 2. OpenAlex coauthorship
def oa_count_one(inst_id, year):
    d = get(f"{OA}?per-page=1&filter=institutions.id:{inst_id},publication_year:{year}")
    return (d or {}).get("meta", {}).get("count")


def oa_count(extra=""):
    f = (f"institutions.id:{INST['akron']['openalex']},"
         f"institutions.id:{INST['cwru']['openalex']}")
    d = get(f"{OA}?per-page=1&filter={f},{extra}" if extra else f"{OA}?per-page=1&filter={f}")
    return (d or {}).get("meta", {}).get("count")


# EACH INSTITUTION'S OWN OUTPUT, fetched rather than assumed. The joint series falls
# steeply and there are two innocent explanations — OpenAlex indexing lag on recent years,
# and one partner simply publishing less. Both are excluded only by carrying the control,
# so it is pulled here and never hand-entered.
own = []
for y in YEARS:
    a = oa_count_one(INST["akron"]["openalex"], y)
    c = oa_count_one(INST["cwru"]["openalex"], y)
    own.append({"year": y, "akron": a or 0, "cwru": c or 0})
print(f"  own output pulled for {len(own)} years", flush=True)

coauth, coauth_poly, bio = [], [], []
for y in YEARS:
    n = oa_count(f"publication_year:{y}")
    f = (f"institutions.id:{INST['akron']['openalex']},"
         f"institutions.id:{INST['cwru']['openalex']},publication_year:{y}")
    d = get(f"{OA}?per-page=1&filter={f},topics.subfield.id:{SUBFIELD}{MAILTO}")
    p = (d or {}).get("meta", {}).get("count")
    d2 = get(f"{OA}?per-page=1&filter={f},topics.subfield.id:{SUBFIELD_ALT}{MAILTO}")
    bio.append({"year": y, "works": (d2 or {}).get("meta", {}).get("count") or 0})
    time.sleep(0.3)
    coauth.append({"year": y, "works": n or 0})
    coauth_poly.append({"year": y, "works": p or 0})
    print(f"    {y}: {n or 0:>3} coauthored, {p or 0:>3} polymer", flush=True)

# a readable sample, so a reader can check the measure rather than trust it
f = (f"institutions.id:{INST['akron']['openalex']},"
     f"institutions.id:{INST['cwru']['openalex']},publication_year:2012-2024")
d = get(f"{OA}?per-page=25&filter={f},topics.subfield.id:{SUBFIELD}{MAILTO}"
        f"&select=id,title,publication_year,doi,primary_location")
sample = [{"year": w["publication_year"], "title": w["title"], "doi": w.get("doi"),
           "venue": ((w.get("primary_location") or {}).get("source") or {}).get("display_name")}
          for w in (d or {}).get("results", [])]
sample.sort(key=lambda r: -r["year"])

tot_co = sum(r["works"] for r in coauth)
tot_poly = sum(r["works"] for r in coauth_poly)

out = {"meta": {
    "question": "Do the University of Akron and Case Western Reserve collaborate, and on "
                "polymer work specifically?",
    "sources": "OpenAlex works listing both institutions; NSF awards API, awards to either "
               "institution since 2012.",
    "row": "coauthorship: one WORK listing both institutions. awards: one NSF award, or one "
           "NSF Collaborative Research project split across two awards.",
    "two_measures": "Publications and federal awards are independent instruments aimed at "
                    "the same proposition, which is what makes this triangulation rather "
                    "than juxtaposition. They can disagree.",
    "polymer_bound": (
        f"Polymer relevance is OpenAlex subfield {SUBFIELD}, ‘Polymers and Plastics’, a "
        f"classification rather than a keyword. Biomaterials is a separate subfield "
        f"({SUBFIELD_ALT}) and is counted beside it, never merged into it. The unbounded "
        f"coauthorship count is published alongside both."),
    "what_a_null_would_mean": "This instrument can demonstrate collaboration and CANNOT "
                              "demonstrate its absence. OpenAlex affiliation coverage is "
                              "incomplete, NSF’s co-PI field lists signatories rather than "
                              "the coalition, and neither sees industry contracts, "
                              "consortium membership, joint teaching or a conversation. A "
                              "low count means not detectable at this resolution.",
    "subfield": SUBFIELD,
    "subfield_alt": SUBFIELD_ALT,
    "years": [YEARS[0], YEARS[-1]],
    "fetched": time.strftime("%Y-%m-%d")},
    "totals": {"coauthored": tot_co, "coauthored_polymer": tot_poly,
               "joint_awards": len(joint),
               "joint_award_dollars": sum(r["amount"] for r in joint),
               "nsf_akron": len(awards["akron"]), "nsf_cwru": len(awards["cwru"])},
    "coauthorship": coauth, "coauthorship_polymer": coauth_poly,
    "coauthorship_biomaterials": bio, "own": own,
    "joint_awards": joint, "sample": sample}

p = os.path.join(HERE, "collab.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"\nwrote {p}")
print(f"  {tot_co} coauthored works {YEARS[0]}-{YEARS[-1]}, {tot_poly} polymer-matching")
print(f"  {len(joint)} joint NSF awards, ${sum(r['amount'] for r in joint):,.0f}")
