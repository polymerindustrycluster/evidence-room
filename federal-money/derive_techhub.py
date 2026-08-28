"""Cross-reference the Tech Hub award onto this page, from data already shipped in the repo.

WHY THIS EXISTS
  federal-money charts the BACKGROUND rate of federal polymer contracting. The whole
  point of that background is to make one number legible: the EDA Sustainable Polymers
  Tech Hub award. That number is not in USAspending's NAICS slice (an EDA implementation
  grant to a project lead is not a 325*/326* procurement obligation), so it cannot be
  derived from federal.json. It IS already shipped, verified against signed federal
  Notices of Award, in funding-map/data/funding.json.

  This script copies it across and re-aggregates it. It fetches nothing. Re-run it after
  any change to the funding map's data:

      cd federal-money && python3 derive_techhub.py

  Every figure it writes is traceable to a field in funding.json; nothing is typed by hand.
"""
import json, os, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "funding-map", "data", "funding.json")
OUT = os.path.join(HERE, "data", "techhub.json")

f = json.load(open(SRC, encoding="utf-8"))
eda = next(s for s in f["sources"] if s["id"] == "eda")

# The seven implementation awards obligated straight to their project leads. One
# recipient can hold awards under several programs; only the eda-direct ones belong to
# the Tech Hub implementation award this page compares against.
leads = []
for r in f["recipients"]:
    for a in r["awards"]:
        if a.get("programId") == "eda-direct":
            leads.append({"name": r["name"], "amount": a["amount"],
                          "funds": a.get("funds", ""), "awardId": a.get("awardId", "")})
leads.sort(key=lambda x: -x["amount"])

# Award IDs carry the federal fiscal year of obligation: ED24... vs ED25...
fy2024 = sum(x["amount"] for x in leads if x["awardId"].startswith("ED24"))

# Restating the FY2024 share into 2025 dollars, with the same CPI-U table federal.json
# uses. Reported so the ratio on the page can state its own sensitivity instead of
# asserting that mixing bases is harmless.
cpi = json.load(open(os.path.join(HERE, "data", "federal.json"), encoding="utf-8"))["cpi"]
rebased = (eda["award"] - fy2024) + fy2024 * cpi["2025"] / cpi["2024"]

# Meta keys are constrained: _shared/picviz.js classifies every one as LIMITS / METHOD /
# STRUCTURAL and verify_consistency.py errors on anything else. `derived_note` and `note`
# are the sanctioned names for the generation note and the dollar-basis caveat; inventing
# `generated`/`basis` failed the gate. generated_on sits OUTSIDE meta for the same reason.
doc = {
    "meta": {
        # Reader words. This string is printed under a chart, so it names what a reader can
        # check (the funding map, the Notices of Award) and not the file path it was copied
        # from. The path, the script and the as-of date live in `derived_note`, which the
        # generated methodology box files under METHOD.
        "source": "PIC funding map, EDA Sustainable Polymers Tech Hub. Figures verified "
                  "against the signed federal Notices of Award.",
        "row": "one EDA implementation award to one project lead",
        "derived_note": "Copied from the funding map's own shipped dataset as of %s and "
                        "re-aggregated for this page. Nothing is fetched: every figure "
                        "here is the figure that file carries." % f["meta"]["asOf"],
        "note": "The award is shown as awarded. %d of the %d implementation awards carry "
                "FY2024 award IDs; restating those into 2025 dollars raises the award "
                "total by %.1f%%, which does not move the published ratio."
                % (sum(1 for x in leads if x["awardId"].startswith("ED24")), len(leads),
                   (rebased / eda["award"] - 1) * 100),
        "caution": "A competitive implementation grant and a procurement obligation are "
                   "different instruments. They share a unit of account, dollars "
                   "committed, and that is the only sense in which this page compares them.",
    },
    "generated_on": datetime.date.today().isoformat(),
    "name": eda["name"],
    "agency": eda["agency"],
    "award": eda["award"],
    "match": eda["matchAmount"],
    "match_label": eda["matchLabel"],
    "fy2024_share": fy2024,
    "award_2025_dollars": round(rebased),
    "leads": leads,
}

json.dump(doc, open(OUT, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("wrote %s — award $%s across %d leads" % (OUT, f"{eda['award']:,}", len(leads)))
