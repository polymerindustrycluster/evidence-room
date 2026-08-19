"""IPEDS completions — the talent pipeline with a denominator.

The workforce case rests on "these are good jobs" and "we need people". The second half
has never had a number attached. IPEDS records every degree conferred, by institution and
by six-digit CIP code, so the question "how many polymer-relevant graduates does this
region actually produce a year" is answerable from a free API.

WHAT A ROW IS
  One (institution, year, CIP-6, award level, race, sex, majornum) count of DEGREES
  CONFERRED. Not people — a double-major appears under majornum 1 and 2, so rows are
  filtered to majornum=1 to count each graduate once. Not job-seekers either: a graduate
  may leave the region, and IPEDS cannot see that.

Served by the Urban Institute's Education Data API, which wraps IPEDS. No key needed.
"""
import json, os, time, urllib.request, collections

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
API = "https://educationdata.urban.org/api/v1/college-university/ipeds"
YEARS = list(range(2012, 2024))

# Six-digit CIP codes a polymer employer would recognize. Grouped so the page can show
# a narrow core and a wider adjacent set rather than one arguable total.
# EVERY CODE BELOW WAS VERIFIED TO RETURN DATA. Two earlier entries did not exist and
# silently contributed nothing, which is the worst way for a CIP list to be wrong — a
# dead code looks identical to a real code with no graduates.
#   140320 -> 143201  a transposition of the real Polymer/Plastics Engineering code.
#                     This one mattered: 14.3201 is where Case Western's Department of
#                     Macromolecular Science and Engineering reports. Omitting it produced
#                     the false finding that one Akron department confers essentially every
#                     polymer degree in the region.
#   143101 -> 401001  Materials Science is in the 40 (physical sciences) series, not 14.
# Guard for the future: a core code returning zero for every year and every institution is
# not evidence of no graduates, it is evidence of a bad code. Check it against a known
# program before believing it.
CIP = {
    # --- core: the degree is about polymers
    "143201": ("Polymer/plastics engineering", "core"),
    "400507": ("Polymer chemistry", "core"),
    "150607": ("Plastics and polymer engineering technology", "core"),
    # --- adjacent: materials, the field polymer work is staffed from
    "141801": ("Materials engineering", "adjacent"),
    "400510": ("Materials chemistry", "adjacent"),
    "401001": ("Materials science", "adjacent"),
    "141901": ("Mechanical engineering", "adjacent"),
    "140701": ("Chemical engineering", "adjacent"),
    "400501": ("Chemistry, general", "adjacent"),
    "151701": ("Energy systems technology", "adjacent"),
}
AWARD = {3: "Associate", 5: "Bachelor", 7: "Master", 17: "Doctorate", 18: "Doctorate",
         19: "Doctorate"}

# Race coding is the Urban API's, NOT raw IPEDS, and it was PINNED EMPIRICALLY rather than
# assumed — an assumed mapping first produced "43% American Indian/Alaska Native", which is
# how you know a guess is wrong. The check: Ohio chemistry (CIP 400501) 2023 puts code 1 at
# 60.5% of all awards, code 6 at a single award, and code 5 at none. Only one assignment
# fits — 1 is White, 6 is Pacific Islander, 5 is American Indian. Re-run that check before
# trusting these labels against a future vintage of the API.
RACE = {1: "White", 2: "Black", 3: "Hispanic", 4: "Asian", 5: "Am. Indian/AK Native",
        6: "Pacific Islander", 7: "Two or more", 8: "Nonresident (intl.)", 9: "Unknown"}
SEX = {1: "Men", 2: "Women"}
# Two independent partitions of the same total. race=N/sex=99 sums to the total across
# races; race=99/sex=N sums to it across sexes. Aggregating each separately is safe;
# crossing them is not offered by this endpoint at CIP-6.
demo = []


def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                        timeout=120) as r:
                return json.loads(r.read().decode())
        except Exception as e:
            if i == tries - 1:
                print(f"    {type(e).__name__}: {str(e)[:70]}", flush=True)
                return None
            time.sleep(2)


# ------------------------------------------------- 1. Ohio institutions
print("directory")
d = get(f"{API}/directory/2021/?fips=39")
inst = {r["unitid"]: r for r in (d or {}).get("results", [])}
print(f"  {len(inst)} Ohio institutions")

# PIC-12 counties, so the regional cut matches the federal-data pages
PIC12_COUNTIES = {"Ashtabula", "Cuyahoga", "Geauga", "Lake", "Lorain", "Mahoning",
                  "Medina", "Portage", "Stark", "Summit", "Trumbull", "Wayne"}
def county_of(r):
    c = (r.get("county_name") or "").replace(" County", "").strip()
    return c
regional = {u: r for u, r in inst.items() if county_of(r) in PIC12_COUNTIES}
print(f"  {len(regional)} in the PIC-12 counties")

# ------------------------------------------- 2. completions for those CIPs
rows = []
for year in YEARS:
    got = 0
    for cip, (label, group) in CIP.items():
        url = (f"{API}/completions-cip-6/{year}/?cipcode_6digit={cip}&fips=39"
               f"&majornum=1")
        d = get(url)
        if not d:
            continue
        for r in d.get("results", []):
            aw0 = r.get("awards_6digit") or 0
            u0 = r["unitid"]
            # demographic partitions, captured before the totals filter drops them
            if aw0 and group == "core":
                if r.get("sex") == 99 and r.get("race") in RACE:
                    demo.append({"year": year, "cip": cip, "unitid": u0,
                                 "inst": (inst.get(u0) or {}).get("inst_name", str(u0)),
                                 "regional": u0 in regional, "dim": "race",
                                 "label": RACE[r["race"]], "awards": aw0})
                if r.get("race") == 99 and r.get("sex") in SEX:
                    demo.append({"year": year, "cip": cip, "unitid": u0,
                                 "inst": (inst.get(u0) or {}).get("inst_name", str(u0)),
                                 "regional": u0 in regional, "dim": "sex",
                                 "label": SEX[r["sex"]], "awards": aw0})
            # race=99 and sex=99 are the "total" rows; taking them avoids double counting
            if r.get("race") != 99 or r.get("sex") != 99:
                continue
            aw = r.get("awards_6digit")
            if not aw:
                continue
            u = r["unitid"]
            rows.append({
                "year": year, "unitid": u,
                "inst": (inst.get(u) or {}).get("inst_name", str(u)),
                "county": county_of(inst.get(u) or {}),
                "regional": u in regional,
                "cip": cip, "label": label, "group": group,
                "award_level": r.get("award_level"),
                "award": AWARD.get(r.get("award_level"), "Other"),
                "awards": aw,
            })
            got += 1
        time.sleep(0.15)
    print(f"  {year}: {got} rows  (running total {len(rows)})", flush=True)

out = {"meta": {
    "source": "IPEDS completions, via the Urban Institute Education Data API",
    "url": "https://educationdata.urban.org/api/v1/college-university/ipeds/completions-cip-6/",
    "row": "one (institution, year, CIP-6, award level) count of DEGREES CONFERRED. "
           "majornum=1 only, so a double-major is counted once. race=99/sex=99 total "
           "rows only, so demographic detail is not double counted.",
    "not": "Not people who stayed. IPEDS cannot see whether a graduate takes a job in "
           "the region, in the industry, or at all. This is production, not supply.",
    "cip_groups": {"core": "the degree is about polymers",
                   "adjacent": "materials and chemistry — the fields polymer work is "
                               "staffed from, but most of these graduates go elsewhere"},
    "geography": "Ohio, with a PIC-12 regional flag on each institution",
    "years": [YEARS[0], YEARS[-1]],
    "fetched": "2026-08-14"},
  "demographics_note": "Two independent partitions of the same award total — by race with "
    "sex held at total, and by sex with race held at total. They are never crossed. The "
    "race labels are the Urban API's coding, pinned empirically (see RACE in fetch_ipeds.py), "
    "not assumed from the IPEDS codebook. 'Nonresident (intl.)' is a visa status IPEDS "
    "reports in the race field, not a race — it displaces every other category it overlaps.",
  "cips": [{"code": c, "label": l, "group": g} for c, (l, g) in CIP.items()],
  "demographics": demo,
  "rows": rows}
p = os.path.join(HERE, "ipeds.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"\nwrote {p}  {round(os.path.getsize(p)/1024)} KB  {len(rows)} rows")
by = collections.Counter()
for r in rows:
    by[(r["group"], r["year"])] += r["awards"]
for g in ("core", "adjacent"):
    line = "  ".join(f"{y}:{by[(g,y)]}" for y in YEARS if by[(g, y)])
    print(f"  Ohio {g:9s} {line}")
reg = collections.Counter()
for r in rows:
    if r["regional"]:
        reg[(r["group"], r["year"])] += r["awards"]
for g in ("core", "adjacent"):
    line = "  ".join(f"{y}:{reg[(g,y)]}" for y in YEARS if reg[(g, y)])
    print(f"  PIC12 {g:9s} {line}")
