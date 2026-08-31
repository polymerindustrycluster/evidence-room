"""College Scorecard — the first EARNINGS data in the stack, and a hard limit.

IPEDS says how many degrees were CONFERRED. It cannot say what a graduate earns or whether
a program is worth entering. Scorecard carries earnings keyed on CIP, and its institution
IDs ARE IPEDS UNITIDs, so it joins straight onto ipeds.json with no fuzzy matching.

WHAT A ROW IS
  Institution rows: one (institution, year) median earnings figure for FEDERALLY AIDED
  students, 6 and 10 years after ENTRY -- not after graduation, and not all students.
  Program rows:     one (institution, CIP-4, credential level) award count and, where not
                    suppressed, a median earnings figure 2 years after completion.

THE LIMIT, MEASURED 2026-08-16 -- READ BEFORE PLANNING ANYTHING ON THIS
  Program-level earnings for polymer are NOT AVAILABLE and will not become available.
  Suppression is a small-cell rule and it is monotonic in program size, across the four
  NEO institutions (977 CIP-4 programs):

      awards      programs   with earnings
      1-9              626        59   (  9% )
      10-29            184        74   ( 40% )
      30-99            123        95   ( 77% )
      100+              44        39   ( 89% )

  Every polymer program in the region sits in the 1-9 band: Akron CIP 1432 confers 4 and 8
  at two levels; CWRU 11, 10 and 6. So the 9% band is where the cluster's own pipeline
  lives, and every polymer earnings figure came back suppressed.

  SECOND LIMIT: Scorecard publishes CIP-4, IPEDS publishes CIP-6. CIP 40.0507 "Polymer
  chemistry" -- a CORE code in fetch_ipeds.py, and where Akron's macromolecular programme
  reports -- rolls up into CIP-4 "4005 Chemistry" and is INVISIBLE here. Scorecard is
  strictly coarser than IPEDS for this cluster's defining field.

WHAT IT DOES GIVE
  Institution-level median earnings and cost of attendance, which is real, new, and the
  only price signal anywhere in this pipeline. Use it as institutional context, NEVER as
  evidence about polymer graduates.

FOOTPRINT: institutions, not counties. Do not merge with the county sources.
"""
import json, os, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
API = "https://api.data.gov/ed/collegescorecard/v1/schools"
K = {}
for l in open(os.path.expanduser("~/.env"), encoding="utf-8", errors="ignore"):
    if "=" in l and not l.startswith("#"):
        k, v = l.split("=", 1); K[k.strip()] = v.strip().strip('"').strip("'")

# Scorecard `id` IS the IPEDS UNITID -- the join to ipeds.json is exact, not fuzzy.
#
# EVERY ID BELOW WAS RESOLVED BY NAME AND VERIFIED, not recalled. The first version of this
# script guessed 202480 for Youngstown State. That is UNIVERSITY OF DAYTON -- a real
# institution, in Ohio, 200 miles away and in neither footprint. It returned a valid record
# with plausible earnings and sat in the output until a human read the name column.
# YSU is 206695. Same failure as the transposed CIP code and the guessed NCES cipid: a bad
# identifier that resolves is worse than one that 404s, because nothing errors.
INSTITUTIONS = {200800: "University of Akron", 201645: "Case Western Reserve University",
                203517: "Kent State University", 202134: "Cleveland State University",
                206695: "Youngstown State University"}
# Substring each resolved name must contain. The guard below is the one that was missing:
# "did an institution resolve" is not the question, "did the RIGHT one" is.
EXPECT = {200800: "akron", 201645: "case western", 203517: "kent state",
          202134: "cleveland state", 206695: "youngstown"}
INST_FIELDS = ("id,school.name,school.city,latest.student.size,"
               "latest.earnings.6_yrs_after_entry.median,"
               "latest.earnings.10_yrs_after_entry.median,"
               "latest.cost.attendance.academic_year,"
               "latest.completion.completion_rate_4yr_150nt")
PROG_FIELDS = ("latest.programs.cip_4_digit.code,latest.programs.cip_4_digit.title,"
               "latest.programs.cip_4_digit.credential.level,"
               "latest.programs.cip_4_digit.counts.ipeds_awards2,"
               "latest.programs.cip_4_digit.earnings.highest.2_yr.overall_median_earnings")
# CIP-4 prefixes a polymer employer would recognise. 4005 is Chemistry and is included
# ONLY because 40.0507 polymer chemistry is invisible at this granularity -- it is a
# superset, never the cluster.
RELEVANT = ("1432", "1418", "1407", "1419", "4005", "4010", "1506")


def get(params, tries=3):
    url = API + "?" + urllib.parse.urlencode({**params, "api_key":
                                              K["COLLEGE_SCORECARD_API_KEY"]})
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                        timeout=90) as r:
                return json.loads(r.read())
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


# ---------------------------------------------------------------- national benchmark
# THE MOST VALUABLE THING THIS SOURCE GIVES. Filtering on cip_4_digit.code returns EVERY
# institution in the country conferring that field, which is the external benchmark the
# artifact gate demands at step 1 and that both council families said candidate #4 lacks.
# Without a national denominator, "the region's polymer degrees fell two thirds" cannot be
# distinguished from "the national field fell two thirds".
NATIONAL_CIP = "1432"   # polymer/plastics engineering


def national(cip):
    d = get({"latest.programs.cip_4_digit.code": cip, "fields": PROG_FIELDS +
             ",id,school.name,school.state,school.city", "per_page": 100})
    out = []
    for r in d.get("results", []):
        for p in (r.get("latest.programs.cip_4_digit") or []):
            if str(p.get("code")) != cip:
                continue
            out.append({
                "unitid": r["id"], "name": r.get("school.name"),
                "state": r.get("school.state"), "city": r.get("school.city"),
                "cip4": cip,
                "credential_level": (p.get("credential") or {}).get("level"),
                "awards": (p.get("counts") or {}).get("ipeds_awards2"),
                "median_earnings_2yr": ((p.get("earnings") or {}).get("highest", {})
                                        .get("2_yr", {}).get("overall_median_earnings"))})
    return d["metadata"]["total"], out


nat_total, nat_rows = national(NATIONAL_CIP)
if not nat_rows:
    raise SystemExit(f"FATAL: national filter on CIP {NATIONAL_CIP} returned nothing. It "
                     f"returned 20 institutions when probed 2026-08-16; a zero result is a "
                     f"filter-name bug, not a country that stopped teaching polymers.")
nat_awards = sum(r["awards"] or 0 for r in nat_rows)
oh_awards = sum(r["awards"] or 0 for r in nat_rows if r["state"] == "OH")
print(f"  NATIONAL CIP {NATIONAL_CIP}: {nat_total} institutions, {nat_awards} awards; "
      f"Ohio {oh_awards} ({oh_awards/nat_awards*100:.0f}%)", flush=True)

inst_rows, prog_rows = [], []
for uid, name in INSTITUTIONS.items():
    d = get({"id": uid, "fields": INST_FIELDS, "per_page": 1}).get("results") or []
    if not d:
        print(f"  {name}: NOT FOUND for unitid {uid}", flush=True)
        continue
    r = d[0]
    got = (r.get("school.name") or "").lower()
    if EXPECT[uid] not in got:
        raise SystemExit(
            f"FATAL: unitid {uid} resolved to {r.get('school.name')!r}, which does not "
            f"contain {EXPECT[uid]!r}. A wrong-but-valid ID returns a real institution with "
            f"plausible numbers and nothing errors — this exact check exists because 202480 "
            f"was guessed for Youngstown State and is University of Dayton.")
    inst_rows.append({
        "unitid": uid, "name": r.get("school.name"), "city": r.get("school.city"),
        "enrolled": r.get("latest.student.size"),
        "earn_6yr": r.get("latest.earnings.6_yrs_after_entry.median"),
        "earn_10yr": r.get("latest.earnings.10_yrs_after_entry.median"),
        "cost_year": r.get("latest.cost.attendance.academic_year"),
        "completion_4yr": r.get("latest.completion.completion_rate_4yr_150nt")})
    p = get({"id": uid, "fields": PROG_FIELDS, "per_page": 1})["results"][0]
    for prog in (p.get("latest.programs.cip_4_digit") or []):
        code = str(prog.get("code") or "")
        if not code.startswith(RELEVANT):
            continue
        e = ((prog.get("earnings") or {}).get("highest", {})
             .get("2_yr", {}).get("overall_median_earnings"))
        prog_rows.append({
            "unitid": uid, "institution": name, "cip4": code,
            "title": prog.get("title"),
            "credential_level": (prog.get("credential") or {}).get("level"),
            "awards": (prog.get("counts") or {}).get("ipeds_awards2"),
            "median_earnings_2yr": e, "earnings_suppressed": e is None})
    print(f"  {name[:38]:<40} 10yr={r.get('latest.earnings.10_yrs_after_entry.median')}, "
          f"{sum(1 for x in prog_rows if x['unitid'] == uid)} relevant programs", flush=True)
    time.sleep(0.5)

if not inst_rows:
    raise SystemExit("FATAL: no institutions resolved. Scorecard `id` is the IPEDS UNITID; "
                     "a zero result is a bad unitid, not a closed university.")
if not any(r["earn_10yr"] for r in inst_rows):
    raise SystemExit("FATAL: every institution-level earnings figure is null. That is the "
                     "one thing this source exists to provide -- check the field path "
                     "before writing scorecard.json.")

sup = [p for p in prog_rows if p["earnings_suppressed"]]
out = {"meta": {
    "source": "U.S. Dept of Education College Scorecard via api.data.gov",
    "row": "institution rows = one (institution) median earnings for FEDERALLY AIDED "
           "students N years after ENTRY, not after graduation and not all students. "
           "program rows = one (institution, CIP-4, credential level).",
    "join": "Scorecard `id` IS the IPEDS UNITID, so this joins ipeds.json exactly. No fuzzy "
            "matching is needed or acceptable.",
    "polymer_earnings_unavailable": "Program-level earnings for polymer are SUPPRESSED and "
                                    "will stay so. Suppression is a small-cell rule, "
                                    "monotonic in size: of 977 CIP-4 programs at the four "
                                    "main NEO institutions, 9% of those conferring 1-9 "
                                    "awards publish earnings, against 89% of those "
                                    "conferring 100+. Every polymer programme in the region "
                                    "confers under 12.",
    "granularity_loss": "Scorecard publishes CIP-4; IPEDS publishes CIP-6. CIP 40.0507 "
                        "polymer chemistry -- a CORE code in fetch_ipeds.py and where "
                        "Akron's macromolecular programme reports -- rolls into '4005 "
                        "Chemistry' and is INVISIBLE here. 4005 is carried as a superset "
                        "and is never the cluster.",
    "earnings_caveat": "Median earnings cover FEDERALLY AIDED students only, measured from "
                       "ENTRY not graduation, so they mix completers with non-completers "
                       "and exclude anyone who never took federal aid.",
    "not_a_footprint": "Institutions, not counties. Never merge with the county sources.",
    "national_benchmark": f"`national` holds EVERY US institution conferring CIP "
                          f"{NATIONAL_CIP}, polymer/plastics engineering — {nat_total} of "
                          f"them, {nat_awards} awards in the latest year. This is the "
                          f"external benchmark: a regional decline means nothing without it. "
                          f"Ohio is {oh_awards} awards ({oh_awards/nat_awards*100:.0f}%) "
                          f"from 2 institutions.",
    "engineering_vs_chemistry": "CIP 1432 is polymer/plastics ENGINEERING. At this code CWRU "
                                "out-confers Akron. Akron's macromolecular strength reports "
                                "under CIP 40.0507 polymer CHEMISTRY, which Scorecard cannot "
                                "see at 4-digit granularity — so this file must never be "
                                "read as 'who is bigger in polymers'. It answers 'who is "
                                "bigger in polymer ENGINEERING', which is a different "
                                "question and the two institutions answer differently.",
    "counts": {"institutions": len(inst_rows), "programs": len(prog_rows),
               "programs_suppressed": len(sup),
               "national_institutions": nat_total, "national_awards": nat_awards,
               "ohio_awards": oh_awards},
    "fetched": time.strftime("%Y-%m-%d")},
    "institutions": inst_rows, "programs": prog_rows, "national": nat_rows}

p = os.path.join(HERE, "scorecard.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"wrote {p} {round(os.path.getsize(p)/1024)} KB — {len(inst_rows)} institutions, "
      f"{len(prog_rows)} relevant programs, {len(sup)} with earnings suppressed")
