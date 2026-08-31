"""The hollowing: polymer education 1991-2023, derived for the programs page.

WHAT THIS READS. The polymer-programs-db project (a sibling checkout, not this repo) is
the census: `programs.sqlite`, rebuilt from `raw_ipeds_national.json` by its own
`build_db.py`, plus `control_cips.json` (the welding/machining/maintenance control pulled
with the same rule) and the College Scorecard join staged in its `incoming/`. This script
derives the page's viz-data from those three; it computes nothing novel and copies no
hand-typed number - every figure on the page must come out of a query here, so the claims
harness re-checks the database, not a transcription.

  python derive_programs.py          ->  ../../programs/data/viz-data.json

THE CONSTRUCTS, STATED ONCE (they gate every number on the page):
  substantive   total_awards > 10 over the program's life. 77 of 245 polymer-census
                institutions carry only a program at or below that line; a 1993 one-off
                certificate is not a department. The control was pulled with the SAME
                rule, which is what makes the spine a comparison and not a construct.
  active        status='active' in the census = a completion in 2023, the final year.
                One quiet year is routine ('unclear'); two or more is 'ended'.
  degree        level in (bachelor, master, doctorate).
  technician    level in (associate, certificate). Postgrad certificates and the 21
                NULL-level rows are in neither layer; they stay in the series totals.
  source='ipeds' everywhere - hand-added rows assert existence, not output.

If the sibling checkout is elsewhere, set PROGRAMS_DB to the sqlite path.
"""
import csv
import json
import os
import sqlite3
import sys

import ipeds_quarantine as QZ

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.environ.get("PROGRAMS_DB") or os.path.join(
    r"C:\Users\JohnSwanson\Documents\pic-github\polymer-programs-db", "programs.sqlite")
PDB = os.path.dirname(DB)
OUT = os.path.abspath(os.path.join(HERE, "..", "..", "programs", "data", "viz-data.json"))

DEGREE = ("bachelor", "master", "doctorate")
TECH = ("associate", "certificate")
SUBSTANTIVE = 10          # strictly greater than

cx = sqlite3.connect(DB)
cx.row_factory = sqlite3.Row
q = lambda sql, *a: [dict(r) for r in cx.execute(sql, a).fetchall()]


def check(label, got, want):
    ok = got == want
    print(f"  {'OK ' if ok else 'XX '} {label}: {got}" + ("" if ok else f"  (spec said {want})"))
    return ok


print(f"reading {DB}")

# ------------------------------------------------------------------ the series
series = QZ.drop(q("""SELECT y.year, SUM(y.awards) AS awards
              FROM program_year y JOIN program p USING (program_id)
              WHERE p.cip_group='polymer' AND p.source='ipeds'
              GROUP BY y.year ORDER BY y.year"""))
by_year = {r["year"]: r["awards"] for r in series}
peak_year = max(by_year, key=lambda y: by_year[y])
# the trough is the pre-peak minimum; after the peak the series is still falling and
# calling 2023 a "trough" would assert the fall has ended, which nobody knows
trough_year = min((y for y in by_year if y < peak_year), key=lambda y: by_year[y])
latest_year = max(by_year)
marks = {
    "first": {"year": min(by_year), "awards": by_year[min(by_year)]},
    "trough": {"year": trough_year, "awards": by_year[trough_year]},
    "peak": {"year": peak_year, "awards": by_year[peak_year]},
    "latest": {"year": latest_year, "awards": by_year[latest_year]},
}
marks["pct_off_peak"] = round(100 * (1 - marks["latest"]["awards"] / marks["peak"]["awards"]))
# COUNT ONLY WHAT CAN BE COMPARED, AND PUBLISH THE DENOMINATOR. A quarantined year costs
# two comparisons - the step into it and the step out of it - so the honest figure is
# "fell in N of the M years that can be compared", never "N of the last seven". Before
# 2026-08-26 this counted `y not in by_year` as a zero, which scored the missing step as
# a fall; the earlier "five of the seven" was that bug meeting the duplicated 2020.
_pairs = [(a, b) for a, b in QZ.comparable_pairs(range(peak_year, latest_year + 1))]
down_years = sum(1 for a, b in _pairs if by_year[b] < by_year[a])
down_of = len(_pairs)

print("series:")
check("1991", marks["first"]["awards"], 476)
# The census README says "2006: 380 (trough)". The actual minimum is 379 in 2007, with
# 2006 at 380 - a near-tie, and the README picked the wrong year of it. Corrected here;
# the source docs carry a correction note dated 2026-08-21.
check("trough 2007", (marks["trough"]["year"], marks["trough"]["awards"]), (2007, 379))
check("peak 2016", (marks["peak"]["year"], marks["peak"]["awards"]), (2016, 970))
check("2023", marks["latest"]["awards"], 617)
check("pct off peak", marks["pct_off_peak"], 36)

# ------------------------------------------------------------------- the spine
def layer(levels):
    r = q(f"""SELECT COUNT(*) AS ever,
                     SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS still
              FROM program WHERE cip_group='polymer' AND source='ipeds'
              AND total_awards > ? AND level IN ({','.join('?' * len(levels))})""",
          SUBSTANTIVE, *levels)[0]
    r["survive_pct"] = round(100 * r["still"] / r["ever"])
    return r


deg, tech = layer(DEGREE), layer(TECH)
ctl = json.load(open(os.path.join(PDB, "control_cips.json"), encoding="utf-8"))
ctl_ever = sum(v["ever"] for v in ctl["summary"].values())
ctl_still = sum(v["active"] for v in ctl["summary"].values())
control = {"ever": ctl_ever, "still": ctl_still,
           "survive_pct": round(100 * ctl_still / ctl_ever),
           "cips": ctl["meta"]["cips"], "rule": ctl["meta"]["rule"]}

print("spine (substantive only):")
check("degree", (deg["ever"], deg["still"], deg["survive_pct"]), (77, 37, 48))
check("technician", (tech["ever"], tech["still"], tech["survive_pct"]), (73, 20, 27))
check("control", (ctl_ever, ctl_still, control["survive_pct"]), (6648, 3185, 48))

# -------------------------------------------------------- the base rate, all-in
allt = q(f"""SELECT program_id, total_awards, first_year, last_year,
                    (last_year - first_year + 1) AS span
             FROM program WHERE cip_group='polymer' AND source='ipeds'
             AND level IN ({','.join('?' * len(TECH))})""", *TECH)
base = {
    "ever": len(allt),
    "le10_awards": sum(1 for r in allt if r["total_awards"] <= 10),
    "le5_years": sum(1 for r in allt if r["span"] <= 5),
    "both": sum(1 for r in allt if r["total_awards"] <= 10 and r["span"] <= 5),
}
for k in ("le10_awards", "le5_years", "both"):
    base[k + "_pct"] = round(100 * base[k] / base["ever"])

print("base rate (ALL technician programs, no threshold):")
check("ever", base["ever"], 168)
check("<=10 awards", base["le10_awards"], 95)
check("<=5 years", base["le5_years"], 91)
check("both", base["both"], 75)

# Ohio's never-took-off list, by name - the concrete beat
ohio_tech = q(f"""SELECT institution, award, level, first_year, last_year, total_awards,
                         status, (last_year - first_year + 1) AS span
                  FROM v_program WHERE cip_group='polymer' AND source='ipeds'
                  AND state='OH' AND level IN ({','.join('?' * len(TECH))})
                  ORDER BY total_awards DESC""", *TECH)
# "Never took off" is the awards test alone: ten or fewer completions over the program's
# whole life, span regardless - UA's 2013-18 certificate ran six years and conferred five,
# and a span cap would misfile it as having taken hold.
never = [r for r in ohio_tech if r["total_awards"] <= 10]
print("ohio technician:")
check("ever", len(ohio_tech), 22)
check("never took off", len(never), 13)

# --------------------------------------------- what working looks like (>=100)
top = q(f"""SELECT institution, state, first_year, last_year, total_awards, status, award
            FROM v_program WHERE cip_group='polymer' AND source='ipeds'
            AND total_awards >= 100 AND level IN ({','.join('?' * len(TECH))})
            ORDER BY total_awards DESC""", *TECH)
print("top technician programs (>=100 lifetime):")
check("count", len(top), 16)
check("Ferris first", (top[0]["institution"].split()[0], top[0]["total_awards"]),
      ("Ferris", 1253))

# ----------------------------------------------------------------- the anchor
UA = 200800  # University of Akron Main Campus
ua_total = QZ.drop(q("""SELECT y.year, SUM(y.awards) AS awards
                FROM program_year y JOIN program p USING (program_id)
                WHERE p.unitid=? AND p.cip_group='polymer' AND p.source='ipeds'
                GROUP BY y.year ORDER BY y.year""", UA))
ua_by_level = q("""SELECT p.level, y.year, SUM(y.awards) AS awards
                   FROM program_year y JOIN program p USING (program_id)
                   WHERE p.unitid=? AND p.cip_group='polymer' AND p.source='ipeds'
                   GROUP BY p.level, y.year""", UA)
lv = {}
for r in ua_by_level:
    lv.setdefault(r["level"], {})[r["year"]] = r["awards"]
ua_recent = {r["year"]: r["awards"] for r in ua_total if r["year"] >= 2016}
ua = {
    "series": {r["year"]: r["awards"] for r in ua_total},
    "recent": ua_recent,
    "peak_recent": max(ua_recent.values()),
    "latest": ua_recent[latest_year],
    "pct_off": round(100 * (1 - ua_recent[latest_year] / max(ua_recent.values()))),
    "masters_2016": lv.get("master", {}).get(2016), "masters_2023": lv.get("master", {}).get(2023, 0),
    "doctorate_2016": lv.get("doctorate", {}).get(2016), "doctorate_2023": lv.get("doctorate", {}).get(2023, 0),
    # A quarantined year is None, never 0. Zero means "nobody graduated"; None means
    # "the record cannot say", and on a page whose whole point is a collapsing count the
    # difference is the difference between a finding and a fabrication.
    "bachelor_2016_2023": [None if y in QZ.QUARANTINED else lv.get("bachelor", {}).get(y, 0)
                           for y in range(2016, 2024)],
}
print("University of Akron (unitid 200800):")
check("2016..2023", [None if y in QZ.QUARANTINED else ua_recent.get(y, 0)
                     for y in range(2016, 2024)],
      [114, 114, 109, 77, None, 87, 32, 44])
check("masters 2016->2023", (ua["masters_2016"], ua["masters_2023"]), (66, 16))
check("doctorate 2016->2023", (ua["doctorate_2016"], ua["doctorate_2023"]), (45, 26))
check("bachelor 2016..2023", ua["bachelor_2016_2023"], [3, 1, 0, 3, None, 0, 0, 2])

# ------------------------------------------------------------------ the states
states = q(f"""SELECT i.state,
                      COUNT(*) AS ever,
                      SUM(CASE WHEN p.status='active' THEN 1 ELSE 0 END) AS still
               FROM program p JOIN institution i USING (unitid)
               WHERE p.cip_group='polymer' AND p.source='ipeds' AND p.total_awards > ?
               GROUP BY i.state ORDER BY ever DESC""", SUBSTANTIVE)
print(f"states: {len(states)} with a substantive polymer program ever; "
      f"top: {[(s['state'], s['ever'], s['still']) for s in states[:5]]}")

# ------------------------------------------------- what it pays (Scorecard join)
pay_rows = []
with open(os.path.join(PDB, "incoming", "college-scorecard",
                       "scorecard_fos_polymer_tidy.csv"), encoding="utf-8") as f:
    for r in csv.DictReader(f):
        # census_match='1' or Penn State appears twice: the Scorecard attaches the same
        # field-of-study values to Behrend (the census campus) AND Main Campus, and the
        # duplicate row would read as a sixth institution.
        if (r["vintage"] == "latest" and r["cip4"] == "1432"
                and r["credential_title"] == "Bachelor's Degree"
                and r["census_match"] == "1"):
            g = lambda k: float(r[k]) if r.get(k) not in (None, "",) else None
            if any(g(k) for k in ("earn_1yr_median", "earn_4yr_median",
                                  "debt_stgp_evalinst_median")):
                pay_rows.append({
                    "institution": r["scorecard_name"], "state": r["state"],
                    "earn_1yr": g("earn_1yr_median"), "earn_4yr": g("earn_4yr_median"),
                    "debt": g("debt_stgp_evalinst_median"),
                    "earn_4yr_national": g("earn_4yr_median_national"),
                    "earn_4yr_p25_national": g("earn_4yr_p25_national"),
                    "earn_4yr_p75_national": g("earn_4yr_p75_national"),
                })
pay_rows.sort(key=lambda r: -(r["earn_4yr"] or r["earn_1yr"] or 0))
print("scorecard, CIP 14.32 bachelor's, any unsuppressed value:")
check("institutions", len(pay_rows), 5)

# ------------------------------------------------------------------------ meta
meta = {
    "title": "The hollowing of polymer education",
    "question": "Which layer of polymer education contracted, by how much, and against what baseline?",
    "source": "IPEDS completions by six-digit CIP, 1991–2023, via the Urban Institute Education Data API; the polymer-programs-db census build of 2026-08-21",
    "sources": "College Scorecard field-of-study files (earnings and debt by institution × program); the same IPEDS pull re-run for six peer technician CIPs as a control",
    "url": "https://educationdata.urban.org/api/v1/college-university/ipeds/completions-cip-6",
    "fetched": "2026-08-21",
    "span": "1991–2023",
    "cip": "Polymer group: 14.3201 Polymer/Plastics Engineering, 40.0507 Polymer Chemistry, 15.0607 Plastics and Polymer Engineering Technology. Control: 48.0508, 48.0501, 15.0613, 47.0303, 15.0303, 15.0805.",
    "row": "One row is one (institution, program CIP, award level) with a completions count for every year it conferred, 1991–2023. Programs are enumerated from the union of all years: a single year undercounts, because a program with no completions that year is invisible in it.",
    "definition": "Substantive means more than ten completions over the program's life; the control was pulled with the same rule, the same years and the same active test, which is what makes the survival comparison a comparison. Active means a completion in 2023, the final year of the series; a program quiet for one year is 'unclear', for two or more 'ended'.",
    "excludes": "Counts only programs institutions chose to file under three polymer CIP codes in IPEDS. Rubber and coatings have no CIP and cannot be separated; programs housed under chemistry or chemical engineering (UChicago, Dartmouth, Rutgers and Brown are confirmed cases) are invisible; non-degree training is out of scope; 2024 is missing. A floor, not a census.",
    "caution": "'Ended' in the federal record is not 'closed' on the ground: institutions keep teaching under other codes, and three of nine named closures failed a catalogue check in this project's own history. No named-casualty list appears here without one.",
    "note": "Certificate award levels were renumbered by IPEDS in 2020; uncorrected, the renumbering manufactures a wave of phantom 2018–19 closures. Codes are canonicalised before any counting, and the phantom wave was written up and retracted in the census's own story spec.",
    "small_numbers": "The earnings panel rests on the five institutions the Scorecard publishes unsuppressed for polymer engineering bachelor's degrees: 84% of cells are privacy-suppressed and suppression tracks program size, so the five are the biggest programs, not a sample.",
    "size_control": "Per-state counts are substantive programs only. A state at zero is filing behaviour, not a confirmed absence: Illinois, North Carolina and Texas all teach polymers under codes this census cannot see.",
}

D = {
    "meta": meta,
    "series": [{"year": r["year"], "awards": r["awards"]} for r in series],
    "marks": marks,
    "down_years_last7": down_years,
    "down_years_of": down_of,
    "quarantined": {str(y): why for y, why in QZ.QUARANTINED.items()},
    "quarantine_caption": QZ.CAPTION,
    "layers": {"degree": deg, "technician": tech, "control": control,
               "substantive_min": SUBSTANTIVE},
    "base": base,
    "ohio": {"tech_ever": len(ohio_tech), "never_took_off": len(never),
             "programs": ohio_tech},
    "top_tech": top,
    "ua": ua,
    "states": states,
    "pay": pay_rows,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(D, open(OUT, "w", encoding="utf-8"), indent=1)
print(f"wrote {OUT} ({os.path.getsize(OUT):,} bytes)")
