"""Build accountability/data/accountability.json from files this site already publishes.

WHAT THIS SCRIPT IS FOR
  The accountability page publishes a subtraction: of the $106.3 million PIC reports
  securing, how much sits on award lines naming PIC's own organisation. A subtraction is
  only worth publishing if it cannot go stale, so nothing here is fetched and nothing is
  typed. Every figure is recomputed from a JSON file another page in this repository
  already ships, and accountability/claims.json re-runs the same arithmetic against those
  UPSTREAM files rather than against this script's output. A correction on funding-map/
  therefore fails this page instead of leaving a flattering number in place.

  Run from anywhere:  python3 accountability/derive_accountability.py

READS (never re-fetches)
  ../funding-map/data/funding.json        the award register
  ../scorecard/data/scorecard.json        delivery, gaps, and the board's own empty rows
  ../timeline/data/timeline.json          the forward commitments and the R&D counts
  ../federal-money/data/techhub.json      the EDA award and its two instrument defects
  ../federal-money/data/federal.json      the background rate of routine federal money
  ../location-quotient/data/lq.json       the establishment count behind one context line
  data/promises.json                      the promise register, append-only, hand-seeded
  data/recipient_types.json               the recipient typing the upstream file lacks

FAILS LOUDLY, NEVER QUIETLY
  A recipient with no typing, a promise row that is not a forward event, a vault row that
  arrives carrying a figure, an R&D count whose number will not parse out of its own
  title: each raises here. A derive script that fills a gap with a plausible default is
  the failure this whole page exists to argue against.
"""
import json
import os
import re
import statistics
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, ".."))
OUT = os.path.join(HERE, "data", "accountability.json")


def load(*parts):
    with open(os.path.join(*parts), encoding="utf-8") as fh:
        return json.load(fh)


def die(msg):
    raise SystemExit(f"derive_accountability: {msg}")


FM = load(WEB, "funding-map", "data", "funding.json")
SC = load(WEB, "scorecard", "data", "scorecard.json")
TL = load(WEB, "timeline", "data", "timeline.json")
HUB = load(WEB, "federal-money", "data", "techhub.json")
FED = load(WEB, "federal-money", "data", "federal.json")
LQ = load(WEB, "location-quotient", "data", "lq.json")
PR = load(HERE, "data", "promises.json")
RT = load(HERE, "data", "recipient_types.json")

AS_OF = FM["meta"]["asOf"]

# ---------------------------------------------------------------- the award lines
# One row per EXECUTED LINE, not per organisation: the University of Akron holds two, and
# counting it once would hide the fact that it is a project lead on one and a sub-grantee
# on the other. Every derived count below is taken over this list.
PROG_SOURCE = {p["id"]: p["sourceId"] for p in FM["programs"]}
PROG_NAME = {p["id"]: p["name"] for p in FM["programs"]}
ROLE = RT["role_by_program"]
KIND = RT["kind"]

missing_kind = [r["id"] for r in FM["recipients"] if r["id"] not in KIND]
if missing_kind:
    die(f"recipients with no kind in data/recipient_types.json: {missing_kind}. "
        "Type them, or fold the typing into funding.json upstream. Do not guess at "
        "render time.")
missing_role = sorted({a["programId"] for r in FM["recipients"] for a in r["awards"]
                       if a["programId"] not in ROLE})
if missing_role:
    die(f"programmes with no role mapping: {missing_role}")

LINES = []
for r in FM["recipients"]:
    for a in r["awards"]:
        LINES.append({
            "recipient_id": r["id"],
            "recipient": r["name"],
            "also_known_as": r.get("alsoKnownAs"),
            "program_id": a["programId"],
            "program": PROG_NAME[a["programId"]],
            "source_id": PROG_SOURCE[a["programId"]],
            "amount": a["amount"],
            "funds": a["funds"],
            "award_id": a.get("awardId"),
            "kind": KIND[r["id"]],
            "kind_label": RT["kind_label"][KIND[r["id"]]],
            "role": ROLE[a["programId"]],
        })
LINES.sort(key=lambda x: -x["amount"])

TOT = FM["meta"]["totals"]
ASSIGNED = sum(l["amount"] for l in LINES)

# THE FOUR STAGES. Match is never in this accumulator. It is a promise made at award time
# by organisations other than PIC, so it is drawn as a detached bar with its own label and
# it never becomes a segment of the staged total.
STAGES = [
    {"key": "secured", "amount": TOT["total"], "label": "reported secured",
     "sub": "three public awards plus partner and local match"},
    {"key": "awarded", "amount": TOT["awards"], "label": "awarded",
     "sub": "the three public awards themselves"},
    {"key": "assigned", "amount": ASSIGNED, "label": "assigned to a named recipient",
     "sub": f"{len(LINES)} executed lines naming {len(FM['recipients'])} recipients"},
    {"key": "attributed", "amount": sum(l["amount"] for l in LINES
                                        if l["recipient_id"] == "greater-akron-chamber"),
     "label": "on award lines naming PIC’s own organisation",
     "sub": "two lines naming the Greater Akron Chamber"},
]
if any(s["amount"] == TOT["match"] for s in STAGES):
    die("the match figure has entered the staged bar; it is a separate promise")
GAC = [l for l in LINES if l["recipient_id"] == "greater-akron-chamber"]

# THE CHAMBER SIGNS FOR MORE THAN THE TWO LINES THE HEADLINE COUNTS. The register attributes
# APEX to the regional workforce programs the money funds, which is what the money does; the
# named grantee on that award is the Chamber itself. A page whose H1 is "$4,149,515 names its
# own organisation" has to say so, or the reader is left to discover it on the award page.
APEX_LINE = next((l for l in LINES if l["award_id"] == "ED25OIE0G0108"), None)
if APEX_LINE is None:
    die("the APEX award line is gone from the register; the grantee note below has no source")
if APEX_LINE["recipient_id"] == "greater-akron-chamber":
    die("APEX is now attributed to the Chamber in the register, so the headline stage and the "
        "grantee note would double-count it. Re-read both before publishing.")
PRIOR = FM["meta"]["outlays"]["prior_award"]
GRANTEE = {"apex": {"award_id": APEX_LINE["award_id"], "amount": APEX_LINE["amount"],
                    "attributed_to": APEX_LINE["recipient"]},
           "prior": {"award_id": PRIOR["awardId"], "amount": PRIOR["amount"],
                     "outlay": PRIOR["outlay"], "what": PRIOR["what"]}}

# WHAT HAS BEEN PAID. Recomputed from the register's own award rows, never copied: the
# meta block and the per-award outlays have to agree or this page does not build.
_OL = FM["meta"]["outlays"]
_paid = sum(a["outlay"] for r in FM["recipients"] for a in r["awards"] if "outlay" in a)
_base = sum(a["amount"] for r in FM["recipients"] for a in r["awards"] if "outlay" in a)
if abs(_paid - _OL["outlaid"]) > 0.01 or _base != _OL["obligated"]:
    die(f"the register's award outlays sum to {_paid:,.2f} of {_base:,} against a meta block "
        f"claiming {_OL['outlaid']:,.2f} of {_OL['obligated']:,}. A payment total that does "
        f"not reconcile to its own rows is exactly the figure this page must not publish.")
if any("outlay" in a for r in FM["recipients"] for a in r["awards"]
       if a.get("awardId") == _OL["no_record"]["awardId"]):
    die("the award with no USAspending record has acquired an outlay figure. An absent "
        "award row is not a zero drawdown and must never be rendered as one.")
OUTLAYS = {"source": _OL["source"], "as_of": _OL["asOf"], "lines": _OL["lines"],
           "base": _base, "paid": round(_paid, 2), "share": _paid / _base * 100,
           "share_of_awarded": _base / TOT["awards"] * 100,
           "no_record": _OL["no_record"], "not_federal": _OL["not_federal"],
           "note": _OL["note"]}
ATTRIBUTED = STAGES[3]["amount"]
SHARE = ATTRIBUTED / TOT["awards"]

# ------------------------------------------------------------------- band B, staging
DEL = SC["delivery"]
if DEL["assigned"] != ASSIGNED or DEL["awarded"] != TOT["awards"]:
    die("scorecard delivery and the award register disagree; one of them is stale")
AGG_LINES = [l for l in LINES if l["kind"] == "program_aggregate"]
AGG_TOTAL = sum(l["amount"] for l in AGG_LINES)

# --------------------------------------------------------------- band C, the coalition
RULE = 1_000_000
ABOVE = [l for l in LINES if l["amount"] >= RULE]
BELOW = [l for l in LINES if l["amount"] < RULE]
RD = [l for l in LINES if l["program_id"] == "oh-rd"]
COHORT = [l for l in LINES if l["program_id"] == "oh-startup"]
if len({l["amount"] for l in COHORT}) != 1:
    die("the Synthe6 cohort awards are no longer identical; the 'nine at $25,000' "
        "sentence has to be rewritten before this page ships")
AWARD_IDS = sorted({l["award_id"] for l in LINES if l["award_id"]})

# ------------------------------------------------------------------ band D, promises
FORWARD = [e for e in TL["events"] if not e.get("delivered")]
FWD = {e["id"]: e for e in FORWARD}
rows = PR["rows"]
if len(rows) != len(FORWARD):
    die(f"the register holds {len(rows)} rows against {len(FORWARD)} forward events. "
        "A commitment was added or removed upstream; append to history[], never edit.")
for r in rows:
    ev = FWD.get(r["id"])
    if ev is None:
        die(f"promise {r['id']} is not a forward event on the timeline")
    if not r.get("set_by") or not r.get("source_document"):
        die(f"promise {r['id']} is missing set_by or source_document")
    if not r.get("first_published_date"):
        die(f"promise {r['id']} has no first_published_date; the keeping rate is measured "
            "against the resolution date as it stood when the register opened")
    if r["current_date"] != r["first_published_date"] and not r.get("history"):
        die(f"promise {r['id']} moved off its first published date with no history entry")
    if ev["date"] != r["current_date"] and not r.get("history"):
        die(f"promise {r['id']}: the timeline says {ev['date']} and this register says "
            f"{r['current_date']} with no dated history entry. That difference is the "
            "thing the register exists to record.")
    if r.get("award_id") and r["award_id"] not in AWARD_IDS:
        die(f"promise {r['id']} cites award {r['award_id']}, which is in no award line")

for r in rows:
    r["timeline_title"] = FWD[r["id"]]["title"]
rows.sort(key=lambda r: (r["current_date"], r["id"]))

BY_TYPE = {t: len([r for r in rows if r["type"] == t])
           for t in ("numeric_outcome", "milestone", "period_end")}
BY_OWNER = {c: len([r for r in rows if r["owner_class"] == c]) for c in ("pic", "partner")}
NEAR = [r for r in rows if r["current_date"] <= "2026-12-31"]
RESOLVED = [r for r in rows if r["status"] in ("delivered", "missed")]
KEPT = [r for r in RESOLVED if r["current_date"] == r["first_published_date"]]
FLOOR = PR["calibration"]["floor_n"]
# The rate is None until n reaches the floor. A tracker showing 100 percent on n=2 is the
# silent pass METHODS-SOP §8 names, and a sceptical reader spots it faster than the page
# spots itself.
RATE = (len(KEPT) / len(RESOLVED)) if len(RESOLVED) >= FLOOR else None

# ------------------------------------------------------- band E, three published counts
def count_event(iso, needle, fields):
    """One timeline event, its numbers PARSED HERE into typed fields rather than scraped
    at render time. If a title is reworded so a number no longer parses, this raises now
    instead of printing an empty cell later."""
    hits = [e for e in TL["events"] if e["date"] == iso and needle in e["title"]]
    if len(hits) != 1:
        die(f"expected exactly one event on {iso} containing {needle!r}, got {len(hits)}")
    ev = hits[0]
    out = {"id": ev["id"], "date": iso, "date_display": ev.get("dateDisplay", iso),
           "title": ev["title"], "org": ev["org"], "parsed": {}}
    for name, pattern in fields.items():
        m = re.search(pattern, ev["title"])
        if not m:
            die(f"cannot parse {name} out of {ev['id']}: {ev['title']!r}")
        out["parsed"][name] = int(m.group(1).replace(",", ""))
    return out

C2025 = count_event("2025-07-01", "39 proposals",
                    {"proposals": r"(\d+) proposals", "funded": r"(\d+) funded"})
C2025B = count_event("2025-12-12", "5 of 38",
                     {"selected": r"[\"“](\d+) of \d+[\"”]",
                      "population": r"[\"“]\d+ of (\d+)[\"”]"})
C2026 = count_event("2026-07-07", "59 applications",
                    {"applications": r"(\d+) applications", "yoy_pct": r"\+(\d+)%"})

APEX_FUNDING = [l for l in LINES if l["award_id"] == "ED25OIE0G0108"][0]["funds"]
APEX_TIMELINE = FWD["F35"]["title"]
APEX_DIFFER = ("400" not in APEX_FUNDING) and ("400" in APEX_TIMELINE)
if not APEX_DIFFER:
    die("the two APEX target strings now agree. That is either a correction or a silent "
        "harmonisation; a person decides which, and UPDATES.md records it.")

RECONCILE = [
    {"published": f"{C2025['parsed']['proposals']} proposals, "
                  f"{C2025['parsed']['funded']} funded",
     "on": C2025["date"], "display": C2025["date_display"],
     "document": f"Public event register, {C2025['id']}",
     "counted": None},
    {"published": f"{C2025B['parsed']['selected']} of {C2025B['parsed']['population']}",
     "on": C2025B["date"], "display": C2025B["date_display"],
     "document": f"Public event register, {C2025B['id']}",
     "counted": None},
    {"published": f"{C2026['parsed']['applications']} applications, "
                  f"up {C2026['parsed']['yoy_pct']} percent year on year",
     "on": C2026["date"], "display": C2026["date_display"],
     "document": f"Public event register, {C2026['id']}",
     "counted": None},
    {"published": f"{len(RD)} executed sub-grants totalling "
                  f"${sum(l['amount'] for l in RD):,}",
     "on": AS_OF, "display": AS_OF,
     "document": "Award register, executed sub-grant agreements",
     "counted": "Executed sub-grant agreements, which is the only one of these four "
                "that says what it counted."},
    {"published": "500 enrollments and 320 placements, against 500 enrollments, "
                  "400 completions and 320 placements",
     "on": AS_OF, "display": AS_OF,
     "document": "Award register and public event register, both describing "
                 "ED25OIE0G0108",
     "counted": "Two descriptions of one Notice of Award. One of them is incomplete."},
]

# -------------------------------------------------------- band F, the negative space
VAULT = [r for r in SC["rows"] if r["status"] == "vault"]
carrying = [r["id"] for r in VAULT if r.get("current") or r.get("sub")]
if carrying:
    die(f"vault rows arrived carrying a value: {carrying}")
TARGETS = [{"metric": r["metric"], "target": r["target"], "group": r["group"]}
           for r in SC["rows"] if r["target"] != "not set"]

# LIST 2 IS GENERATED, NOT MAINTAINED. Each line names the vault rows it covers, and the
# `because` text is lifted verbatim from the shipped meta of the file that owns the
# limitation, so a hand-maintained honesty list cannot go stale here. The `would_need`
# column is the only editorial text: it is a decision, not a datum, and no shipped file
# holds it. Every line carries defined_on and either fill_by or permanent_reason.
DEFINED_ON = SC.get("generated_on", AS_OF)
LIST2 = [
    {"covers": ["a-members", "a-dues", "a-renewal", "a-earned"],
     "not_here": "Members in good standing, dues revenue, renewal rate, "
                 "earned-revenue share",
     "because": SC["meta"]["publicOnly"],
     "because_from": "scorecard.json meta.publicOnly",
     "would_need": "A membership-agreement and marketing-communications decision on what "
                   "may be published, and at what grain.",
     "defined_on": DEFINED_ON, "fill_by": None,
     "permanent_reason": "This repository is public and its history is permanent, so no "
                         "grain of a member record is publishable in it. A populated copy "
                         "belongs outside it."},
    {"covers": ["b-disbursed"],
     "not_here": "Award dollars disbursed against the whole award total",
     "because": SC["meta"]["caution"],
     "because_from": "scorecard.json meta.caution",
     "would_need": "A drawdown figure for the $31,250,000 Ohio Innovation Hub grant, a "
                   "state award that publishes no drawdown, and a payment figure for "
                   "EDA award ED25HDQ0G0009, which has no USAspending record of any "
                   "kind. The payment stage above already prints the outlays that seven "
                   "of the eight federal lines do publish; what no record covers is the "
                   "whole $85,335,784.",
     "defined_on": DEFINED_ON, "fill_by": "on a decision to publish drawdown totals",
     "permanent_reason": None},
    {"covers": ["c-completions", "c-placements"],
     "not_here": "Completions of a PIC-funded training programme, and member companies "
                 "taking a participant",
     "because": "Held in PIC and APEX programme records, which this repository does not "
                "carry.",
     "because_from": "scorecard.json, the two empty group C rows",
     "would_need": "A quarterly reporting arrangement with ConxusNEO, the Ohio "
                   "Manufacturers’ Association and the Polymer Sector Partnership.",
     "defined_on": DEFINED_ON,
     "fill_by": "on a quarterly reporting arrangement", "permanent_reason": None},
    {"covers": [],
     "not_here": "Jobs created, or an economic-impact multiplier",
     "because": "No page in this room ships a method for it that survives its own gates.",
     "because_from": "this page",
     "would_need": "A defensible method, published before the number.",
     "defined_on": DEFINED_ON, "fill_by": None,
     "permanent_reason": "Until a method exists and is published first, the figure would "
                         "be an assertion with a decimal point on it."},
    {"covers": [],
     "not_here": "Which published dates slipped before this register opened",
     "because": TL["meta"]["publicOnly"],
     "because_from": "timeline.json meta.publicOnly",
     "would_need": "A decision to emit the slip column, which cannot be un-made.",
     "defined_on": DEFINED_ON,
     "fill_by": "on the slip-record decision (Open Question 3)",
     "permanent_reason": None},
    {"covers": [],
     "not_here": "The NEO-SMART NSF Engine award",
     "because": FM["meta"]["disclosures"][2],
     "because_from": "funding.json meta.disclosures",
     "would_need": "Nothing. It is correctly excluded, and it is named here so nobody "
                   "thinks it was overlooked.",
     "defined_on": DEFINED_ON, "fill_by": None,
     "permanent_reason": "It is not PIC money, so it will never appear on this page."},
]
covered = sorted({v for line in LIST2 for v in line["covers"]})
if covered != sorted(r["id"] for r in VAULT):
    die(f"list 2 covers {covered} but the board's empty rows are "
        f"{sorted(r['id'] for r in VAULT)}")
for line in LIST2:
    if not line["defined_on"] or not (line["fill_by"] or line["permanent_reason"]):
        die(f"list 2 line {line['not_here']!r} has no fill date and no permanent reason")

# ------------------------------------------------- context, additionality, and defects
def lq_cell(year, naics):
    hits = [c for c in LQ["composite"] if c["year"] == year and c["naics"] == naics]
    if len(hits) != 1:
        die(f"expected one LQ composite cell for {year}/{naics}")
    return hits[0]

EST = lq_cell(2025, "326")
fy = sorted({r["fy"] for r in FED["naics"]})
BACKGROUND = sum(r["real"] for r in FED["naics"]) / len(fy)

# The five instrument defects, copied from the shipped metas of the files that carry
# them so a page-local paraphrase cannot drift from the original. They ride in the
# per-figure source lines, because PV.methodology()'s key set is fixed in the shared core.
DEFECTS = [
    {"figure": "The EDA award total behind the 4.9 percent share",
     "text": HUB["meta"]["note"], "from": "federal-money/data/techhub.json meta.note"},
    {"figure": "Comparing the Tech Hub award with routine federal contracting",
     "text": HUB["meta"]["caution"],
     "from": "federal-money/data/techhub.json meta.caution"},
    {"figure": "The background rate of routine federal money",
     "text": FED["meta"]["caution"], "from": "federal-money/data/federal.json meta.caution"},
    {"figure": "The board’s talent rows",
     "text": SC["meta"]["excludes"], "from": "scorecard/data/scorecard.json meta.excludes"},
    {"figure": "The board’s talent rows",
     "text": SC["meta"]["small_numbers"],
     "from": "scorecard/data/scorecard.json meta.small_numbers"},
]

# ---------------------------------------------------------------------------- write
DATA = {
    "meta": {
        "title": "What PIC promised, what has landed, and who is in the coalition",
        "source": "Every figure is recomputed from a file another page of this site "
                  "already publishes: the PIC award register (funding map), the internal "
                  "scorecard, the public event register (timeline), the EDA Tech Hub "
                  "award file, USAspending obligations, and BLS QCEW establishment "
                  "counts. Nothing on this page is fetched.",
        "row": "one executed award line in the coalition register, and one dated public "
               "commitment in the promise register. The two are never counted together.",
        "fetched": AS_OF,
        "definition": "Money is attributed to PIC when it sits on an executed award line "
                      "naming the Greater Akron Chamber, the organisation that holds "
                      "PIC. Money obligated directly to another project lead is convened, "
                      "not held, and the page reports the two separately rather than "
                      "summing them into one figure of merit.",
        "baseline": "The published $106,290,451 secured figure is the baseline the "
                    "subtraction runs against. It is the number a reader arrives to test, "
                    "so it is kept in full and decomposed rather than replaced.",
        "derived_note": "Nothing here is fetched and nothing is typed. "
                        "derive_accountability.py recomputes every figure from the "
                        "shipped JSON of the pages named above, and claims.json re-runs "
                        "the same arithmetic against those upstream files rather than "
                        "against this page\u2019s own output, so a correction on the funding "
                        "map fails this page instead of leaving a flattering number "
                        "standing.",
        "caution": "An award register records commitment and execution. It records no "
                   "payment, so no figure taken from it measures money spent. The payment "
                   "stage on this page is not taken from it: it is the federal ledger’s "
                   "own outlay figure, which covers the federal award lines and not the "
                   "state grant, and that is why the stage is part filled rather than "
                   "either empty or whole.",
        "not": "No target on this page was set by PIC. The three targets on the board are "
               "ceilings fixed by signed award documents, and no board row names an "
               "owner. Where PIC has set no target, the absence is the finding and no "
               "placeholder stands in for it.",
        "publicOnly": "This repository is public and its history is permanent, so it "
                      "carries no member, applicant or personal record at any grain. "
                      "Seven board rows and the membership goal are published as defined "
                      "empty slots with the register that holds the real number named "
                      "beside them.",
        "excludes": "The public event register records only events recorded as public. "
                    "The record of which published dates slipped is deliberately withheld "
                    "there, so the promise register on this page begins on the day it "
                    "opened and reports nothing about dates published before it existed.",
        "scope": "PIC\u2019s own award register and public record. This page is not a health "
                 "report on the regional polymer economy, which is cluster-health, and "
                 "not the internal board scorecard, which is unlinked and carries "
                 "deliberately empty rows.",
        "small_numbers": "The promise register holds eighteen rows and one of them "
                         "carries a number that can be missed. A keeping rate computed "
                         "over a handful of resolved commitments would be noise with a "
                         "percent sign, so this page prints the count and no rate until "
                         f"{FLOOR} commitments have resolved.",
        "note": "Match is never summed into the staged bar. It is promised at award time "
                "by organisations other than PIC, so it is drawn detached, with its own "
                "label. The $10,417,066 beside the state grant is promised by local "
                "partners, not by the state.",
    },
    "generated_on": date.today().isoformat(),
    "as_of": AS_OF,
    "draft": {
        "status": "unreviewed draft",
        "reason": "This page has not been through marketing or communications review, and "
                  "the seven questions in its README are unanswered. The hero leads with "
                  "the subtraction because that is the version that has to be seen to be "
                  "judged, and whether it may is one of the seven.",
    },
    "attribution": {
        "stages": STAGES,
        "match": {"amount": TOT["match"],
                  "label": "partner and local match",
                  "sub": "committed by organisations other than PIC, at award time"},
        "share_of_awarded": SHARE,
        "gac_lines": [{"amount": l["amount"], "award_id": l["award_id"],
                       "funds": l["funds"], "source_id": l["source_id"]} for l in GAC],
        "gac_grantee": GRANTEE,
        "mechanism": next(s["note"] for s in FM["sources"] if s["id"] == "eda"),
        "other_leads": len([l for l in LINES if l["program_id"] == "eda-direct"]) - 1,
    },
    "staging": {
        "awarded": DEL["awarded"], "assigned": DEL["assigned"],
        "unassigned": DEL["unassigned"],
        "share_assigned": DEL["assigned"] / DEL["awarded"] * 100,
        "sources": DEL["sources"],
        "gaps": DEL["gaps"],
        "reconciliation": FM["meta"]["reconciliation"],
        "aggregates": {"recipients": len({l["recipient_id"] for l in AGG_LINES}),
                       "lines": len(AGG_LINES), "total": AGG_TOTAL,
                       "share_of_assigned": AGG_TOTAL / ASSIGNED * 100,
                       "rows": [{"recipient": l["recipient"], "amount": l["amount"],
                                 "program": l["program"]} for l in AGG_LINES]},
        "disbursed": None,
        "disbursed_label": "no figure covers the award total",
        "outlays": OUTLAYS,
    },
    "coalition": {
        "recipients": len(FM["recipients"]),
        "lines": len(LINES),
        "award_ids": len(AWARD_IDS),
        "rule": RULE,
        "above": {"n": len(ABOVE), "sum": sum(l["amount"] for l in ABOVE),
                  "share": sum(l["amount"] for l in ABOVE) / ASSIGNED * 100},
        "below": {"n": len(BELOW), "sum": sum(l["amount"] for l in BELOW),
                  "share": sum(l["amount"] for l in BELOW) / ASSIGNED * 100},
        "rd": {"n": len(RD), "sum": sum(l["amount"] for l in RD),
               "max": max(l["amount"] for l in RD), "min": min(l["amount"] for l in RD),
               "median": statistics.median(l["amount"] for l in RD),
               "max_to": max(RD, key=lambda l: l["amount"])["recipient"],
               "min_to": min(RD, key=lambda l: l["amount"])["recipient"]},
        "cohort": {"n": len(COHORT), "each": COHORT[0]["amount"],
                   "sum": sum(l["amount"] for l in COHORT)},
        "rows": LINES,
        "not_a_roster": "This is a register of recipients, not a membership roster. PIC "
                        "has members who receive nothing here and recipients who are not "
                        "members, and PIC’s membership register is not published.",
    },
    "promises": {
        "opened_on": PR["opened_on"],
        "rule": PR["_rule"],
        "rows": rows,
        "by_type": BY_TYPE,
        "by_owner": BY_OWNER,
        "near": len(NEAR), "far": len(rows) - len(NEAR),
        "calibration": {"statistic": PR["calibration"]["statistic"],
                        "n": len(RESOLVED), "kept": len(KEPT), "rate": RATE,
                        "floor": FLOOR, "floor_basis": PR["calibration"]["floor_basis"]},
        "unsourced_goal": PR["unsourced_goal"],
        "goal_context": {
            "establishments": int(EST["estabs"]), "year": EST["year"],
            "counties": EST["counties_counted"],
            "suppressed": EST["counties_suppressed"],
            "naics": EST["naics"], "label": EST["label"]},
    },
    "reconcile": {
        "rows": RECONCILE,
        "events": [C2025, C2025B, C2026],
        "apex": {"funding": APEX_FUNDING, "timeline": APEX_TIMELINE, "differ": APEX_DIFFER},
        "standing_rule": "Every new public count of this programme is added to this "
                         "table, or the build fails.",
    },
    "negative": {
        "counts": SC["counts"],
        "targets": TARGETS,
        "vault_rows": [{"id": r["id"], "metric": r["metric"], "source": r["source"],
                        "definition": r["definition"], "cadence": r["cadence"],
                        "current": r.get("current"), "sub": r.get("sub")} for r in VAULT],
        "list2": LIST2,
    },
    "context": {
        "techhub_award": HUB["award"],
        "background_rate": BACKGROUND,
        "background_years": [fy[0], fy[-1]],
        "background_counties": FED["meta"]["footprint"]["n"],
        "defects": DEFECTS,
    },
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(DATA, fh, indent=1, ensure_ascii=False)
    fh.write("\n")

print(f"accountability.json written: {len(LINES)} award lines, {len(rows)} promises, "
       f"${ATTRIBUTED:,} attributed ({SHARE * 100:.1f}% of ${TOT['awards']:,}), "
       f"n={len(RESOLVED)} resolved commitments, "
       f"keeping rate {'withheld below the floor' if RATE is None else RATE}",
      file=sys.stderr)
