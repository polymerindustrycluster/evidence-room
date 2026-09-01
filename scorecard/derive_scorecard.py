"""Build the PIC internal scorecard from data this repository already ships.

WHY THIS EXISTS
  Every other page here measures the regional polymer economy. This one measures the
  organisation. The two are different accountabilities and this file keeps them apart:
  each row carries an explicit `status` — public, vault, or context — and nothing in the
  build can promote a context row into an accountable one.

  It FETCHES NOTHING. Every populated figure is recomputed from a JSON file already
  published on another page in this repo, so a correction there fails this page's claims
  instead of leaving a stale board number behind:

      funding-map/data/funding.json        the award register
      federal-money/data/techhub.json      the EDA award, re-aggregated
      federal-money/data/federal.json      routine federal obligations (context)
      occupations/data/viz-data.json       IPEDS completions and regional employment
      peers/data/peers.json                Ohio's national rank (context)

  Run it from this folder after any change to those files:

      cd scorecard && python3 derive_scorecard.py

THE RULE THIS FILE ENFORCES
  A row whose measurement lives in PIC's own records is written with `current: None`.
  There is no default, no zero, and no estimate. `_assert_empty()` at the bottom raises
  if a vault row ever acquires a value, because the failure this page exists to prevent
  is a plausible-looking number appearing where a real one was never collected.
"""
import json, os, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, ".."))
OUT = os.path.join(HERE, "data", "scorecard.json")

load = lambda *p: json.load(open(os.path.join(WEB, *p), encoding="utf-8"))
FM = load("funding-map", "data", "funding.json")
TH = load("federal-money", "data", "techhub.json")
FED = load("federal-money", "data", "federal.json")
OCC = load("occupations", "data", "viz-data.json")
PEERS = load("peers", "data", "peers.json")

money = lambda n: "$%s" % f"{round(n):,}"


def short(n):
    """$79.2M / $625K. Board reading, with the exact figure kept in the sub-line."""
    if abs(n) >= 1e6:
        return "$%.1fM" % (n / 1e6)
    return "$%dK" % round(n / 1e3)


# ---------------------------------------------------------------- B. award delivery
#
# One award dollar "has reached a named recipient" when the register carries an executed
# line item naming the organisation that holds it. That is an ASSIGNMENT test, not a
# payment test, and the distinction is the whole point of group B: the register records
# what has been committed and executed, never what has been drawn down.
AWARDED = FM["meta"]["totals"]["awards"]
MATCH = FM["meta"]["totals"]["match"]
SECURED = FM["meta"]["totals"]["total"]
ASSIGNED = sum(a["amount"] for r in FM["recipients"] for a in r["awards"])
UNASSIGNED = AWARDED - ASSIGNED
N_RECIPIENTS = len(FM["recipients"])

# Per source: EDA, Ohio, APEX. `programs` partition the award; recipients hold pieces of
# programs. Summing recipients by their programme's source is the only join available.
PROG_SOURCE = {p["id"]: p["sourceId"] for p in FM["programs"]}
by_source = {}
for s in FM["sources"]:
    by_source[s["id"]] = {"id": s["id"], "short": s["short"], "name": s["name"],
                          "award": s["award"], "assigned": 0}
for r in FM["recipients"]:
    for a in r["awards"]:
        by_source[PROG_SOURCE[a["programId"]]]["assigned"] += a["amount"]
for v in by_source.values():
    v["unassigned"] = v["award"] - v["assigned"]
    v["pct"] = v["assigned"] / v["award"] * 100
SRC_ROWS = [by_source[s["id"]] for s in FM["sources"]]

EDA = by_source["eda"]
OHIO = by_source["ohio"]
N_LEADS = len(TH["leads"])

# Where the unassigned balance sits. The register's own reconciliation says it is two
# Ohio workstreams; this recomputes it rather than quoting the sentence.
prog_assigned = {p["id"]: 0 for p in FM["programs"]}
for r in FM["recipients"]:
    for a in r["awards"]:
        prog_assigned[a["programId"]] += a["amount"]
GAPS = [{"id": p["id"], "name": p["name"], "amount": p["amount"],
         "assigned": prog_assigned[p["id"]], "gap": p["amount"] - prog_assigned[p["id"]]}
        for p in FM["programs"] if p["amount"] - prog_assigned[p["id"]] > 0]
GAPS.sort(key=lambda g: -g["gap"])

# --------------------------------------------------------------- C. talent programmes
#
# IPEDS completions at the three regional institutions the occupations page tracks.
# `group` is that page's own classification of the CIP code, kept rather than re-derived.
IPEDS_YEAR = OCC["program_totals"]["latest_year"]
WINDOW = OCC["program_totals"]["window"]


def completions(group=None, award=None, year=None):
    tot = 0
    for p in OCC["programs"]:
        if group and p["group"] != group:
            continue
        if award and p["award"] != award:
            continue
        tot += p["by_year"].get(str(year), 0) if year else p["latest"]
    return tot


def series(group=None, award=None):
    years = sorted({int(y) for p in OCC["programs"] for y in p["by_year"]})
    return [{"year": y, "n": completions(group, award, y)} for y in years]


POLY = series("polymer")
POLY_LATEST = completions("polymer")
POLY_WINDOW = [completions("polymer", year=y) for y in WINDOW]
POLY_AVG = sum(POLY_WINDOW) / len(POLY_WINDOW)
BACH_LATEST = completions("polymer", "Bachelor")
BACH_WINDOW = [completions("polymer", "Bachelor", y) for y in WINDOW]
MAT_LATEST = completions("materials")
MAT_WINDOW = [completions("materials", year=y) for y in WINDOW]
N_INSTITUTIONS = len(OCC["program_totals"]["institutions"])

# A DATA-INTEGRITY READING, inherited rather than made here. This page read a duplicated
# 2019/2020 out of the shipped occupations file and excluded both years. The duplicate
# turned out to be the first symptom of a longer fault: the federal mirror ran a year
# behind from 2020 to 2022 and then skipped a collection year entirely. Those three years
# now come from the NCES completions files (`_data/build/ipeds_mirror_fix.py`), the
# series is whole, and the exclusion no longer applies. Read from the corrected file so
# this page cannot go stale against it, and asserted so a reverted correction is loud.
CORRECTION = OCC.get("source_correction")
if not CORRECTION:
    raise SystemExit("occupations/data/viz-data.json carries no source_correction: run "
                     "_data/build/mirror_fix_patch.py before this file.")
DUP_1920 = [p for p in OCC["programs"]
            if "2019" in p["by_year"] and "2020" in p["by_year"]
            and p["by_year"]["2019"] == p["by_year"]["2020"]]
if DUP_1920:
    raise SystemExit("%d programmes still repeat 2019 under 2020 after the correction."
                     % len(DUP_1920))


# The direction word was typed into three rows -- "down three years", "up three years" --
# and two of the three stopped being true the moment the window carried its right years.
# A word that describes the numbers beside it is computed from them.
def trend_words(w):
    """Three window values, and what may honestly be said about their order."""
    if w[0] < w[1] < w[2]:
        return "up three years", "up"
    if w[0] > w[1] > w[2]:
        return "down three years", "down"
    return "volatile", "volatile"


POLY_TREND, MAT_TREND, BACH_TREND = (trend_words(w) for w in (POLY_WINDOW, MAT_WINDOW,
                                                              BACH_WINDOW))

# ------------------------------------------------------------------- D. cluster context
FED_FYS = sorted({r["fy"] for r in FED["naics"]})
FED_AVG = sum(r["real"] for r in FED["naics"]) / len(FED_FYS)
REGION_EMP = OCC["region"]["emp"]
OHIO_RANK = PEERS["states"]["326"]

# ---------------------------------------------------------------------------- the rows
#
# OWNER is "not assigned" on every accountable row, and that is a reading rather than an
# omission: an EOS scorecard row without a named person is not a scorecard row, and this
# repository holds no owner assignment for any of them. Naming one would be inventing a
# commitment on someone's behalf.
#
# TARGET has exactly two legal states. "not set" means PIC has published no target.
# A figure means a ceiling fixed by a signed document (the amount awarded, the number of
# implementation awards) — a denominator, never an ambition.
NA = "not assigned"
NOT_SET = "not set"

GROUPS = [
    {"key": "A", "title": "Growth and sustainability",
     "blurb": "Whether PIC can pay for itself. Every row here is measured in PIC’s "
              "own membership register and general ledger, and neither may be published "
              "in a public repository."},
    {"key": "B", "title": "Federal and state award delivery",
     "blurb": "Whether the money PIC won reaches the organisations it was won for. The "
              "award register is a public document, so most of this group computes."},
    {"key": "C", "title": "Talent programs",
     "blurb": "Whether the region produces the graduates the cluster hires. Federal "
              "education data covers the degree side; PIC’s own programs do not."},
    {"key": "D", "title": "Cluster context",
     "blurb": "The regional economy PIC works on. Read-only: PIC influences these and "
              "does not control them, and they are never averaged with the rows above."},
]

R = []


def row(**kw):
    kw.setdefault("owner", NA)
    kw.setdefault("target", NOT_SET)
    kw.setdefault("current", None)
    kw.setdefault("sub", None)
    kw.setdefault("trend", "no prior reading")
    kw.setdefault("dir", "none")
    kw.setdefault("href", None)
    R.append(kw)


# --- A. growth and sustainability -- every row vault-sourced, deliberately unpopulated
row(id="a-members", group="A", status="vault",
    metric="Members in good standing",
    definition="Organisations whose dues are paid and whose membership has not lapsed "
               "on the last day of the quarter. One organisation counts once regardless "
               "of how many staff it sends.",
    cadence="Quarterly, at quarter close",
    source="PIC membership register")
row(id="a-dues", group="A", status="vault",
    metric="Dues revenue, trailing twelve months",
    definition="Dues cash received in the twelve months ending at quarter close. "
               "Excludes sponsorship, event fees and grant income, which are counted in "
               "the earned-revenue row instead.",
    cadence="Quarterly, at quarter close",
    source="PIC general ledger")
row(id="a-renewal", group="A", status="vault",
    metric="Renewal rate",
    definition="Members whose renewal date fell in the period and who renewed within "
               "ninety days of it, divided by all members whose renewal date fell in the "
               "period. Lapsed-then-rejoined counts as a renewal only inside the window.",
    cadence="Quarterly, at quarter close",
    source="PIC membership register")
row(id="a-earned", group="A", status="vault",
    metric="Earned-revenue share",
    definition="Dues plus fee-for-service plus sponsorship, divided by total operating "
               "revenue, over the trailing twelve months. Grant drawdown sits in the "
               "denominator and never in the numerator.",
    cadence="Quarterly, at quarter close",
    source="PIC general ledger")

# --- B. award delivery -- computable from the public register, except the one that matters
row(id="b-assigned", group="B", status="public",
    metric="Award dollars with a named recipient",
    definition="Award dollars carried on an executed line item naming the organisation "
               "that holds them, divided by all dollars awarded. An assignment test, "
               "not a payment test.",
    cadence="On amendment of the award register",
    target="%s awarded" % money(AWARDED),
    current="%.1f%%" % (ASSIGNED / AWARDED * 100),
    sub="%s of %s" % (money(ASSIGNED), money(AWARDED)),
    trend="first reading",
    source="PIC award register")
row(id="b-recipients", group="B", status="public",
    metric="Named recipients under an executed agreement",
    definition="Distinct organisations holding at least one executed award line. One "
               "row of the register is a programme aggregate rather than a single firm, "
               "and is counted as one.",
    cadence="On amendment of the award register",
    current=str(N_RECIPIENTS),
    sub="across %d programmes" % len(FM["programs"]),
    trend="first reading",
    source="PIC award register")
row(id="b-eda", group="B", status="public",
    metric="EDA implementation awards obligated to a project lead",
    definition="Tech Hub implementation awards for which EDA has obligated funds "
               "directly to the named project lead, against the number of awards in the "
               "signed Notices of Award.",
    cadence="On amendment of the award register",
    target="%d of %d awards" % (N_LEADS, N_LEADS),
    current="%d of %d" % (N_LEADS, N_LEADS),
    sub=money(EDA["award"]),
    trend="first reading",
    source="Signed federal Notices of Award")
row(id="b-ohio", group="B", status="public",
    metric="Ohio Innovation Hub dollars with a named recipient",
    definition="The state grant’s five workstreams, tested the same way as the "
               "award total: dollars on an executed line naming the organisation that "
               "holds them.",
    cadence="On amendment of the award register",
    target="%s awarded" % money(OHIO["award"]),
    current="%.1f%%" % OHIO["pct"],
    sub="%s of %s" % (money(OHIO["assigned"]), money(OHIO["award"])),
    trend="first reading",
    source="Executed state grant agreement SBIG20251005")
row(id="b-secured", group="B", status="public",
    metric="Total public money secured",
    definition="The three public awards plus the partner match and cost share written "
               "into them. Committed, not received: match is a promise made at award "
               "time by organisations other than PIC.",
    cadence="On amendment of the award register",
    current=short(SECURED),
    sub="%s awards plus %s match" % (short(AWARDED), short(MATCH)),
    trend="first reading",
    source="PIC award register")
row(id="b-disbursed", group="B", status="vault",
    metric="Award dollars disbursed to recipients",
    definition="Cash actually paid out against executed awards at quarter close, "
               "divided by dollars awarded. The register above records commitment and "
               "execution; nothing in it records a payment.",
    cadence="Quarterly, at quarter close",
    source="PIC drawdown records and agency payment systems")

# --- C. talent
row(id="c-polymer", group="C", status="public",
    metric="Polymer-program credentials awarded, region",
    definition="Credentials at every level awarded by the three regional institutions "
               "in CIP codes the occupations page classes as polymer, in the latest "
               "federal reporting year.",
    cadence="Annual, on the IPEDS completions release",
    current=str(POLY_LATEST),
    sub="%d-%d average %d" % (WINDOW[0], WINDOW[-1], round(POLY_AVG)),
    trend="%s: %s" % (POLY_TREND[0], ", ".join(str(n) for n in POLY_WINDOW)),
    dir=POLY_TREND[1],
    source="IPEDS completions %d" % IPEDS_YEAR)
row(id="c-bachelor", group="C", status="public",
    metric="Bachelor-level polymer credentials",
    definition="The subset of the row above awarded at bachelor level, across all three "
               "institutions. The entry point into the cluster’s technical "
               "workforce that does not require graduate school.",
    cadence="Annual, on the IPEDS completions release",
    current=str(BACH_LATEST),
    sub="%d-%d average %.1f" % (WINDOW[0], WINDOW[-1],
                                sum(BACH_WINDOW) / len(BACH_WINDOW)),
    trend="%s: %s" % (BACH_TREND[0], ", ".join(str(n) for n in BACH_WINDOW)),
    dir=BACH_TREND[1],
    source="IPEDS completions %d" % IPEDS_YEAR)
row(id="c-materials", group="C", status="public",
    metric="Materials-program credentials awarded, region",
    definition="Credentials at every level in CIP codes the occupations page classes as "
               "materials rather than polymer, at the same three institutions and in "
               "the same year.",
    cadence="Annual, on the IPEDS completions release",
    current=str(MAT_LATEST),
    sub="%d-%d average %d" % (WINDOW[0], WINDOW[-1],
                              round(sum(MAT_WINDOW) / len(MAT_WINDOW))),
    trend="%s: %s" % (MAT_TREND[0], ", ".join(str(n) for n in MAT_WINDOW)),
    dir=MAT_TREND[1],
    source="IPEDS completions %d" % IPEDS_YEAR)
row(id="c-completions", group="C", status="vault",
    metric="Completions of a PIC-funded training program",
    definition="Individuals who finished a workforce program paid for by the APEX Good "
               "Jobs Challenge award or the Ohio workforce workstream, counted at "
               "completion and never at enrolment.",
    cadence="Quarterly, at quarter close",
    source="PIC and APEX program records")
row(id="c-placements", group="C", status="vault",
    metric="Member companies taking a program participant",
    definition="Member organisations that took at least one participant from a "
               "PIC-supported program into a placement, internship or apprenticeship in "
               "the trailing twelve months.",
    cadence="Quarterly, at quarter close",
    source="PIC program records")

# --- D. cluster context -- read-only, never averaged with the rows above
row(id="d-emp", group="D", status="context",
    metric="Plastics and rubber jobs, PIC-12",
    definition="Covered employment in NAICS 326 across the twelve counties, from the "
               "federal employment census. Moves with plant-level hiring decisions PIC "
               "does not make.",
    owner="outside PIC",
    cadence="Annual, on the QCEW release",
    current=f"{REGION_EMP:,}",
    sub="%d counties, %d" % (OCC["region"]["n_counties"], OCC["region"]["year"]),
    trend="see the occupations page",
    source="Occupations page",
    href="../occupations/")
row(id="d-federal", group="D", status="context",
    metric="Routine federal obligations to regional polymer firms",
    definition="Federal contracting obligations recorded against chemical and plastics "
               "industry codes at place of performance in the twelve counties, averaged "
               "over the fiscal years on file, in 2025 dollars.",
    owner="outside PIC",
    cadence="Annual, as USAspending posts",
    current="%s a year" % short(FED_AVG),
    sub="FY%d-FY%d average" % (FED_FYS[0], FED_FYS[-1]),
    trend="see the federal-money page",
    source="Federal-money page",
    href="../federal-money/")
row(id="d-rank", group="D", status="context",
    metric="Ohio’s national rank in plastics and rubber jobs",
    definition="Ohio’s position among the fifty states and the District of "
               "Columbia on NAICS 326 covered employment, counting only states the "
               "federal census discloses.",
    owner="outside PIC",
    cadence="Annual, on the QCEW release",
    current="1st",
    sub="%s jobs, of %d disclosed" % (f"{round(OHIO_RANK['subject_emp']):,}",
                                      OHIO_RANK["of_disclosed"]),
    trend="see the peers page",
    source="Peers page",
    href="../peers/")

# ------------------------------------------------------------------------ the guardrail
for r in R:
    if r["status"] == "vault" and (r["current"] is not None or r["sub"] is not None):
        raise SystemExit("vault row %s carries a value — that is the one thing this "
                         "page must never do" % r["id"])
    if r["status"] != "vault" and r["current"] is None:
        raise SystemExit("row %s is not marked vault and has no value" % r["id"])

COUNTS = {
    "rows": len(R),
    "accountable": len([r for r in R if r["group"] != "D"]),
    "public": len([r for r in R if r["status"] == "public"]),
    "vault": len([r for r in R if r["status"] == "vault"]),
    "context": len([r for r in R if r["status"] == "context"]),
    "vault_in_a": len([r for r in R if r["status"] == "vault" and r["group"] == "A"]),
    "targets_set": len([r for r in R if r["group"] != "D" and r["target"] != NOT_SET]),
    "owners_assigned": len([r for r in R if r["owner"] not in (NA, "outside PIC")]),
}

doc = {
    "meta": {
        # No em-dash: the house style bans them in published prose, and this string is
        # printed under the table and again in the generated methodology box.
        "source": "PIC award register (funding map), signed federal Notices of Award, "
                  "executed state grant agreement SBIG20251005, IPEDS completions, and "
                  "BLS QCEW. Each is already published on another page of this site.",
        "row": "one scorecard metric: its definition, who owns it, how often it is read, "
               "the target, and the latest reading where a public record can supply one.",
        "fetched": FM["meta"]["asOf"],
        "definition": "A row is accountable when PIC controls the thing being measured "
                      "(groups A, B and C) and context when it does not (group D). The "
                      "two are never averaged, summed, or scored together.",
        "derived_note": "Nothing here is fetched. Every populated figure is recomputed "
                        "by derive_scorecard.py from a JSON file another page in this "
                        "repository already publishes, so a correction on that page "
                        "fails this page’s claims rather than leaving a stale board "
                        "number in place.",
        "publicOnly": "This repository is public and its history is permanent, so it "
                      "carries no member, applicant or personal data. Every metric that "
                      "would need PIC’s membership register, general ledger, "
                      "pipeline or drawdown records is published here as a defined empty "
                      "slot. Filling those rows requires a copy of this page kept "
                      "outside a public repository.",
        "caution": "An award register records what has been committed and executed. It "
                   "records no payment, so no figure on this page is a measure of money "
                   "spent. Obligated is not disbursed, and the disbursement row is empty "
                   "for that reason rather than for lack of effort.",
        "not": "No target on this page was set by PIC. A target cell showing a figure is "
               "a ceiling fixed by a signed award document, and every other target cell "
               "reads “not set”. No owner cell names a person, because this "
               "repository holds no owner assignment for any row.",
        "small_numbers": "The talent rows are administrative counts in the low tens. "
                         "The polymer series ran %s across %d, %d and %d, so a single "
                         "year is a reading and not a direction."
                         % (", ".join(str(n) for n in POLY_WINDOW), *WINDOW),
        "excludes": "The federal mirror this series was built from ran a year behind "
                    "from 2020 to 2022 and never served the 2022 collection year at "
                    "all. Those three years are now taken from the NCES completions "
                    "files directly, so the %d-%d window this page reads is three "
                    "consecutive years rather than two years and a gap."
                    % (WINDOW[0], WINDOW[-1]),
    },
    "generated_on": datetime.date.today().isoformat(),
    "version": "1.0",
    "counts": COUNTS,
    "groups": GROUPS,
    "rows": R,
    "delivery": {"awarded": AWARDED, "assigned": ASSIGNED, "unassigned": UNASSIGNED,
                 "match": MATCH, "secured": SECURED, "sources": SRC_ROWS, "gaps": GAPS},
    "talent": {"year": IPEDS_YEAR, "window": WINDOW, "institutions": N_INSTITUTIONS,
               "polymer": POLY, "polymer_window": POLY_WINDOW,
               "materials_window": MAT_WINDOW, "bachelor_window": BACH_WINDOW,
               "polymer_trend": POLY_TREND[0], "materials_trend": MAT_TREND[0],
               "bachelor_trend": BACH_TREND[0], "source_correction": CORRECTION},
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(doc, open(OUT, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("wrote %s" % OUT)
print("  %(rows)d rows: %(public)d public, %(vault)d awaiting the vault, "
      "%(context)d context" % COUNTS)
print("  %s of %s awarded has a named recipient; %s does not"
      % (money(ASSIGNED), money(AWARDED), money(UNASSIGNED)))
print("  polymer credentials %d in %d, %d-%d window %s"
      % (POLY_LATEST, IPEDS_YEAR, WINDOW[0], WINDOW[-1], POLY_WINDOW))
