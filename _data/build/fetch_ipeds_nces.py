"""Polymer and materials completions straight from NCES, bypassing the Urban mirror.

WHAT IT ADDS. A keyless second reading of the same completions the Urban mirror serves,
named by the collection year NCES itself puts in the file name, so the mirror's year labels
can be checked rather than trusted. It is the evidence behind `ipeds_mirror_fix.py`.

WHY A SECOND SOURCE FOR A SERIES WE ALREADY FETCH. `fetch_ipeds_cip.py` reads the Urban
Institute's IPEDS mirror, which is convenient (keyless, JSON, one call a year) and wrong
about WHICH YEAR it is serving for three of the last four. `ipeds_mirror_fix.py` carries
the diagnosis and the correction table; this file is the evidence behind it. NCES
publishes the completions component as a zipped CSV per collection year with no key and
no rate limit, so the check costs a download and a filter.

WHAT ONE ROW IS. One (collection year, institution, CIP-6, award level) count of awards
conferred, sexes and races at their totals (`CTOTALT`), first major only (`MAJORNUM=1`),
for the three institutions that are the regional polymer pipeline and the six CIP codes
`fetch_ipeds_cip.py` already verified against the NCES CIP 2020 file.

THE YEAR IN THE FILE NAME IS THE COLLECTION YEAR. `C2023_A` is awards conferred between
1 July 2022 and 30 June 2023. Urban labels the same table 2022, the fall of that academic
year. Neither is wrong; they are different names for one table, and mixing them is how a
page loses a year. Everything here is named by the NCES collection year, and
`ipeds_mirror_fix.py` does the one translation.

TRAPS.
  - **The CSV is BOM-prefixed from C2023 on.** `UNITID` reads as `﻿UNITID` unless the
    file is opened `utf-8-sig`. A plain `utf-8` read silently matches no institution and
    reports zero completions for every year, which looks exactly like a program closing.
  - **`AWLEVEL` is zero-padded in some vintages and not in others** ("05" and "5" both
    appear across 2021-2024). Strip the padding before comparing.
  - **A revised file (`*_rv.csv`) ships inside the same zip** for years old enough to have
    one. This reads the unrevised file, which is what the Urban mirror also carries, so
    the two are comparable; a revision would show up here as a disagreement, which is the
    point of running it.
  - **AWLEVEL 6 is a postbaccalaureate certificate, not a degree.** It appears once in
    this window (Akron, 40.0507, C2023, two awards). The occupations page counts degrees,
    and no other year of its series contains a certificate, so `ipeds_mirror_fix.py`
    excludes it and says so rather than making one year of a ten-year series wider than
    the rest.

Run: python3 _data/build/fetch_ipeds_nces.py [first_year] [last_year]
"""
import collections
import csv
import io
import json
import os
import sys
import urllib.request
import zipfile

from contact import UA  # noqa: E402  (one address, see contact.py)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "ipeds_nces.json")
URL = "https://nces.ed.gov/ipeds/datacenter/data/C{year}_A.zip"

# The same six codes fetch_ipeds_cip.py verified against NCES CIP 2020. Dotted here
# because that is how the NCES files spell them.
CIP = {"14.3201": ("Polymer/Plastics Engineering", "polymer"),
       "40.0507": ("Polymer Chemistry", "polymer"),
       "15.0607": ("Plastics and Polymer Engineering Technology/Technician", "polymer"),
       "14.1801": ("Materials Engineering", "materials"),
       "40.1001": ("Materials Science", "materials"),
       "40.1002": ("Materials Chemistry", "materials")}
INST = {200800: "University of Akron", 203517: "Kent State University",
        201645: "Case Western Reserve University"}
# NCES award levels, and the Urban code each maps onto so the two sources can be merged
# row for row. 17/18/19 are the three doctorates and all three are "Doctorate" here, as
# they are in fetch_ipeds_cip.py.
AWARD = {"3": ("Associate", 4), "5": ("Bachelor", 7), "7": ("Master", 9),
         "17": ("Doctorate", 22), "18": ("Doctorate", 22), "19": ("Doctorate", 22),
         "1": ("Cert <1yr", 1), "2": ("Cert 1-2yr", 2), "4": ("Cert 2-4yr", 6),
         "6": ("Post-bacc cert", 8), "8": ("Post-master cert", 8),
         "10": ("Cert <12wk", 30), "11": ("Cert 12wk-1yr", 31)}
DEGREE_LEVELS = {"5", "7", "17", "18", "19"}


def year_rows(year):
    """Every matching row of one collection year, or None if NCES does not serve it."""
    try:
        req = urllib.request.Request(URL.format(year=year), headers=UA)
        with urllib.request.urlopen(req, timeout=300) as r:
            blob = r.read()
    except Exception as e:
        print(f"  C{year}_A: {type(e).__name__}: {str(e)[:70]}", flush=True)
        return None
    z = zipfile.ZipFile(io.BytesIO(blob))
    names = [n for n in z.namelist() if not n.lower().endswith("_rv.csv")]
    if len(names) != 1:
        raise SystemExit(f"FATAL: C{year}_A.zip holds {names}, expected one unrevised CSV.")
    got = []
    with z.open(names[0]) as f:
        for row in csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig")):
            try:
                unitid = int(row["UNITID"])
            except (TypeError, ValueError, KeyError):
                continue
            if unitid not in INST:
                continue
            cip = row["CIPCODE"].strip()
            if cip not in CIP or row["MAJORNUM"].strip() != "1":
                continue
            try:
                awards = int(float(row["CTOTALT"] or 0))
            except ValueError:
                awards = 0
            if not awards:
                continue
            lvl = row["AWLEVEL"].strip().lstrip("0")
            label, urban = AWARD.get(lvl, (f"level {lvl}", None))
            got.append({"collection_year": year, "unitid": unitid, "inst": INST[unitid],
                        "cip": cip.replace(".", ""), "label": CIP[cip][0],
                        "group": CIP[cip][1], "awlevel": lvl, "award": label,
                        "urban_award_level": urban, "is_degree": lvl in DEGREE_LEVELS,
                        "awards": awards})
    if not got:
        raise SystemExit(f"FATAL: C{year}_A matched no rows. Six verified CIP codes at "
                         f"three institutions do not all vanish in one year; suspect the "
                         f"BOM trap in the docstring before believing this.")
    return got


def main():
    first = int(sys.argv[1]) if len(sys.argv) > 1 else 2014
    last = int(sys.argv[2]) if len(sys.argv) > 2 else 2024
    rows, served = [], []
    for y in range(first, last + 1):
        got = year_rows(y)
        if got is None:
            continue
        rows.extend(got)
        served.append(y)
        print(f"  C{y}_A: {len(got)} rows", flush=True)
    if not rows:
        raise SystemExit("FATAL: no collection year downloaded.")
    out = {"meta": {
        "source": "NCES IPEDS completions component, C{year}_A, the unrevised file",
        "url": URL,
        "row": "one (collection year, institution, CIP-6, award level) count of awards "
               "conferred, CTOTALT, first major only",
        "year_is": "the NCES COLLECTION year: C2023_A is awards conferred 1 July 2022 to "
                   "30 June 2023. The Urban mirror labels the same table 2022.",
        "institutions": {str(u): n for u, n in INST.items()},
        "cips": [{"code": c.replace(".", ""), "title": t, "group": g}
                 for c, (t, g) in CIP.items()],
        "degree_levels": sorted(DEGREE_LEVELS),
        "years": served},
        "rows": rows}
    json.dump(out, open(OUT, "w", encoding="utf-8"), separators=(",", ":"))
    print(f"\nwrote {OUT}  {len(rows)} rows, C{served[0]}..C{served[-1]}")
    tot = collections.Counter()
    for r in rows:
        tot[(r["group"], r["collection_year"], r["is_degree"])] += r["awards"]
    print("collection year   polymer (degrees / all)   materials (degrees / all)")
    for y in served:
        pd, pa = tot[("polymer", y, True)], tot[("polymer", y, True)] + tot[("polymer", y, False)]
        md, ma = tot[("materials", y, True)], tot[("materials", y, True)] + tot[("materials", y, False)]
        print(f"  C{y}_A            {pd:>4} / {pa:<4}              {md:>4} / {ma:<4}")


if __name__ == "__main__":
    main()
