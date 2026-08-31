"""Shape the collaboration network for the page, and quarantine what cannot be trusted.

THE AFFILIATION-PARSER PROBLEM. OpenAlex resolves free-text affiliation strings to
institution records, and the match is a guess. `I4210153792`, **University School** — a K-12
boys' school in Cleveland, homepage us.edu — is credited as a research partner. The
overwhelmingly likely cause is the parser matching the substring "University School" inside
"Case Western Reserve University School of Medicine."

It is quarantined rather than deleted, and the page says how many works the quarantine
moves, because a silent filter is how a number becomes unauditable. If a check ever shows
these are real, remove the entry — do not leave it excluded on the strength of a hunch that
nobody wrote down.

WHY THIS MATTERS MORE THAN ITS SIZE. This page's whole claim is reach, and a reach chart is
a list of names. One implausible name at the top of it is the entire credibility of the
chart, and it is exactly the defect a reader spots first.

AND IT DID, ON THIS FILE. Two corrections from the 2026-08-17 review, both worth keeping:

  1. This docstring said University School was "credited with 161 polymer research
     collaborations". That was true under the KEYWORD bound. Under the subfield-2507 bound
     now in force it is 1 — the rebound already fixed most of what the quarantine was for.
     The rationale here read far stronger than the evidence supported, which is its own
     small lesson: a comment describing data is a claim about data and rots like one.

  2. The quarantine caught the 1-work artifact and PUBLISHED the 7-work one. **Shaker
     Heights Public Library, led: 7** — a public library as corresponding-author institution
     on seven polymer papers — sat in the top 40 partners, along with two more libraries at
     1 work each, while University School at 1 work was excluded. SUSPECT was a hand-written
     list of one id, so it caught what someone had already looked at. The list is longer now
     and the reason is written next to each entry, but the shape of the defect survives:
     THIS IS STILL A DENYLIST, and a denylist only ever catches what somebody noticed.
     If this page is ever published, the check that belongs here is positive — a partner
     should have to look like a research institution to be listed at all, rather than merely
     avoid being on a list of things that don't.
"""
import json, os, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
R = json.load(open(os.path.join(HERE, "reach.json"), encoding="utf-8"))

# id -> why it is not trustworthy as a research partner.
# EVERY ENTRY IS A JUDGMENT ON IMPLAUSIBILITY AND EVERY ONE IS REVERSIBLE. None has been
# confirmed against the raw affiliation strings; that check was rate limited and is still
# outstanding. Delete an entry the moment a check shows the institution is real — do not
# leave anything excluded on the strength of a hunch nobody wrote down.
SUSPECT = {
    "I4210153792": "A K-12 preparatory school in Cleveland (us.edu). Almost certainly the "
                   "affiliation parser matching the substring 'University School' inside "
                   "'Case Western Reserve University School of Medicine'. NOT YET "
                   "CONFIRMED against the raw affiliation strings — that check was rate "
                   "limited and is outstanding. The exclusion is a judgment on "
                   "implausibility, and it is reversible.",
    # The three below were found in the 2026-08-17 review, published, while the one above
    # was excluded at a seventh of the size. A public lending library does not hold a
    # corresponding authorship on polymer chemistry; the plausible readings are a patron
    # address, a digitisation or ILL credit, or a name collision — all parser artifacts.
    "I4210117756": "Shaker Heights Public Library: a municipal public library credited "
                   "with SEVEN led works, which would make it a larger originating partner "
                   "than most universities on this chart. A public lending library does not "
                   "hold corresponding authorship on polymer chemistry. NOT YET CONFIRMED "
                   "against raw affiliation strings; reversible.",
    "I4210088727": "Chester County Library System (Exton, PA) — a county public library "
                   "system, 1 led work. Same class of artifact. NOT YET CONFIRMED; "
                   "reversible.",
    "I2803038395": "Nanjing Library — a provincial public library, 1 led work. Same class "
                   "of artifact. NOT YET CONFIRMED; reversible. Flagged explicitly because "
                   "this page reports a country breakdown and a spurious CN row is the one "
                   "a hostile reader will find first.",
}

partners, quarantined = [], []
for p in R["partners"]:
    (quarantined if p["id"] in SUSPECT else partners).append(p)
for q in quarantined:
    q["why"] = SUSPECT[q["id"]]

mappable = [p for p in partners if p.get("lat") is not None]
mappable.sort(key=lambda p: -p["total"])

by_country = collections.Counter()
for p in partners:
    by_country[p.get("country") or "??"] += p["total"]
tot_country = sum(by_country.values())
countries = [{"code": k, "n": v, "share": round(v / tot_country, 4)}
             for k, v in by_country.most_common()]

T = R["totals"]
attributable = T["led"] + T["joined"]

# The cached pull predates the fix at fetch_reach.py:193 and still carries a meta.source
# describing the KEYWORD bound — the one meta.polymer_bound in the same object says was
# discarded. Rebuilt here from the subfield the pull actually used, so the methodology box
# stops publishing the discredited method as the method without forcing a re-fetch.
# DELETE THIS BLOCK after the next fetch_reach.py run; it is a patch, not a design.
source = R["meta"]["source"]
if "matching" in source:
    # Subfield read out of polymer_bound rather than typed, so the number cannot disagree
    # with the paragraph that explains it two entries down.
    sub = re.search(r"subfield (\d+)", R["meta"]["polymer_bound"]).group(1)
    source = re.sub(r"matching '[^']*'", f"in subfield {sub} ('Polymers and Plastics')",
                    source)
    assert "matching" not in source, source

out = {"meta": dict(R["meta"],
                    source=source,
                    quarantine="Institutions the affiliation parser resolved implausibly "
                               "are excluded from the map and the rankings, listed with "
                               "the reason, and the works they account for are reported "
                               "rather than silently dropped. The list is hand-written, so "
                               "it catches what someone has already noticed and nothing "
                               "else."),
       "totals": dict(T,
                      attributable=attributable,
                      led_share=round(T["led"] / attributable, 4),
                      joined_share=round(T["joined"] / attributable, 4),
                      partners_shown=len(partners),
                      quarantined=len(quarantined),
                      quarantined_works=sum(q["total"] for q in quarantined),
                      top10_share=round(T["top10"] / T["pct_n"], 4),
                      top1_share=round(T["top1"] / T["pct_n"], 4),
                      us_share=round(by_country.get("US", 0) / tot_country, 4),
                      countries=len([c for c in countries if c["code"] != "??"])),
       "fwci_deciles": R["fwci_deciles"],
       "countries": countries[:14],
       "quarantined": quarantined,
       # the map only needs what it draws; the full ranked list lives in the table
       "map": [{"n": p["name"], "c": p.get("country"), "lat": p["lat"], "lon": p["lon"],
                "l": p["led"], "j": p["joined"], "t": p["total"]}
               for p in mappable if p["total"] >= 2],
       "top": [{"name": p["name"], "country": p.get("country"), "city": p.get("city"),
                "led": p["led"], "joined": p["joined"], "total": p["total"]}
               for p in partners[:40]]}

# The basemap travels with the data. A map page whose backdrop lives in a separate file
# can be published without it and will render points floating in white space.
W = json.load(open(os.path.join(HERE, "world.json"), encoding="utf-8"))
out["world"] = W["land"]
out["meta"]["basemap"] = W["meta"]["source"] + " " + W["meta"]["note"]

p = os.path.join(WEB, "reach", "data", "reach.json")
os.makedirs(os.path.dirname(p), exist_ok=True)
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
t = out["totals"]
print(f"wrote {p}")
print(f"  {t['works']:,} works · led {t['led_share']:.0%} · joined {t['joined_share']:.0%} "
      f"({t['no_corresponding']:,} unattributable)")
print(f"  {t['partners_shown']:,} partners shown, {len(out['map']):,} on the map "
      f"(2+ works), {t['quarantined']} quarantined ({t['quarantined_works']} works)")
print(f"  US {t['us_share']:.0%} of collaborations across {t['countries']} countries")
print(f"  FWCI median {t['fwci_median']:.2f}; {t['top10_share']:.0%} in the top 10% of "
      f"their field, {t['top1_share']:.1%} in the top 1%")
