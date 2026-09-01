# -*- coding: utf-8 -*-
"""Apply the IPEDS 2020 quarantine to the atlas, which is a shipped file with no producer.

WHY A PATCH AND NOT A REBUILD, the argument `quarantine_patch.py` and `mirror_fix_patch.py`
both make, with one addition of its own. `atlas/data/viz-data.json` is written by
`project_atlas.mjs`, and THAT SCRIPT DOES NOT EXIST -- not in this repository, not in the
workshop clone, not anywhere on the machine that carried the atlas here. The page's README
has been naming it as the fix since 2026-08-26, alongside a blocking mechanism
(`stage/prepare.ps1`) that does not exist either. So the committed JSON is the atlas's
source of truth in exactly the sense `_data/REBUILDING.md` means, and a correction to it is
a change to a source of truth: a hand edit would be unauditable, and writing the missing
projector means re-deriving a basemap this defect never touched.

WHAT WAS WRONG. `ipeds_quarantine.py` found on 2026-08-26 that the Urban Institute mirror
republished 2019's completions under year=2020, byte for byte. Every page built on that
mirror dropped the year; the atlas did not, because its own rebuild stopped at the missing
projector, and it was promoted to the public tree on 2026-08-31 with the duplicate still
in it. Until this ran it read 20,859 lifetime completions where the record holds 20,052 --
the difference is the 807 completions of 2019 counted a second time -- and four
institutions read a last conferring year of 2020 when the last year they actually
conferred is 2019.

WHAT DOES NOT MOVE, AND WHY THAT IS NOT LUCK. Every 2020 row has a 2019 twin, so no
institution, no programme and no award level exists only in the duplicated year. `ever`
(147), `active` (41), `states` (35), every `programs` and `active_programs` count, every
`first_year` and every `levels` string are therefore unchanged by construction, and this
script asserts each of them rather than trusting the argument. The projected coordinates
are untouched: they are a function of latitude and longitude, which the mirror's year
labels have nothing to do with.

WHERE THE NUMBERS COME FROM. `DELTA` is each institution's 2020 award count, which is its
2019 award count, re-derived from the same endpoint `derive_atlas.py` reads
(`completions-cip-6`, the three polymer CIP codes, race=99, sex=99, majornum=1). `--check`
re-pulls those three requests and fails on any disagreement, so the table cannot drift away
from the source it was taken from without saying so. The whole 1991-2023 census was pulled
the same way when this was written, and reproduced the shipped file exactly -- all 147
institutions, all six aggregate fields, no mismatches -- which is what makes subtracting one
year from it a correction rather than a guess.

IDEMPOTENT. The file gets a `source_correction` block; a file that already has one is left
alone. Run it twice and the second run says so.

HOW TO LIFT IT. If Urban reloads `completions-cip-6`, delete 2020 from
`ipeds_quarantine.QUARANTINED`, and this patch is retired rather than re-run: the atlas
would need a real rebuild, which needs the projector written. Note that the mirror fault is
longer than the duplicate -- `ipeds_mirror_fix.py` shows the 2021 and 2022 labels also sit a
collection year late nationally, and C2023_A is served nowhere. That correction has only
been derived for three institutions and six CIP codes; the atlas is national and 33 years
deep, so it carries the same lag as the programs page and is not repaired here. Removing the
duplicate is the part that IS derivable today, and leaving it in place because a larger
correction exists would be the worse of the two errors.

Run: python3 _data/build/atlas_reprojection_patch.py [--check]
"""
import collections
import json
import os
import sys
import urllib.request

import ipeds_quarantine as QZ

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
REL = "atlas/data/viz-data.json"
CHECK = "--check" in sys.argv

API = "https://educationdata.urban.org/api/v1/college-university/ipeds/completions-cip-6"
UA = {"User-Agent": "PIC-evidence-room/1.0 (jswanson@greaterakronchamber.org)"}
# The three polymer codes the census reads, verified against the NCES CIP 2020 file by
# fetch_ipeds_cip.py. A wrong code returns zero rows and no error (API-REGISTRY).
CIP = ("143201", "400507", "150607")
YEAR = 2020

MARK = {"applied": "2026-09-01", "by": "_data/build/atlas_reprojection_patch.py",
        "why": QZ.CAPTION,
        "source": "Urban Institute IPEDS completions-cip-6, year 2020, the three polymer "
                  "CIP codes, race=99 sex=99 majornum=1: the duplicated year, subtracted",
        "was": {"total_awards": 20859, "top_total_awards": 2929,
                "institutions_at_last_year_2020": 4}}

# unitid -> the institution's 2020 completions, which are its 2019 completions served a
# second time. Sums to 807, the whole of the duplicated year. Re-derived by --check.
DELTA = {
    166513: 99,   # University of Massachusetts-Lowell
    200800: 77,   # University of Akron Main Campus
    169910: 74,   # Ferris State University
    156107: 68,   # Wichita State University-Campus of Applied Sciences and Technology
    495767: 42,   # The Pennsylvania State University
    201645: 41,   # Case Western Reserve University
    235149: 38,   # Everett Community College
    173708: 34,   # Hennepin Technical College
    237011: 33,   # Western Washington University
    155681: 28,   # Pittsburg State University
    366252: 28,   # Pennsylvania College of Technology
    166629: 27,   # University of Massachusetts-Amherst
    176372: 27,   # University of Southern Mississippi
    170055: 25,   # Grand Rapids Community College
    205443: 23,   # Shawnee State University
    169798: 14,   # Eastern Michigan University
    170976: 14,   # University of Michigan-Ann Arbor
    213543: 12,   # Lehigh University
    236692: 10,   # Spokane Community College
    100858: 9,    # Auburn University
    437237: 9,    # IYRS School of Technology & Trades
    161208: 8,    # The Landing School
    233921: 7,    # Virginia Polytechnic Institute and State University
    237686: 7,    # West Virginia University at Parkersburg
    240417: 7,    # University of Wisconsin-Stout
    190415: 6,    # Cornell University
    172200: 5,    # Schoolcraft Community College District
    200332: 5,    # North Dakota State University-Main Campus
    129020: 4,    # University of Connecticut
    230162: 4,    # Davis Technical College
    236188: 4,    # Olympic College
    206011: 3,    # Terra State Community College
    171155: 2,    # Mid Michigan College
    204440: 2,    # Northwest State Community College
    236258: 2,    # Peninsula College
    110422: 1,    # California Polytechnic State University-San Luis Obispo
    111887: 1,    # Cerritos College
    131469: 1,    # George Washington University
    144740: 1,    # DePaul University
    156231: 1,    # Ashland Community and Technical College
    157711: 1,    # Somerset Community College
    166957: 1,    # Mount Wachusett Community College
    172644: 1,    # Wayne State University
    210605: 1,    # Community College of Allegheny County
}

# The four whose last conferring year in the shipped file is the phantom. 2020 duplicates
# 2019, so every one of them conferred in 2019 and the true last year is 2019 for all four.
LAST_YEAR_FIX = {
    236258: (2020, 2019),   # Peninsula College, WA
    204440: (2020, 2019),   # Northwest State Community College, OH
    172644: (2020, 2019),   # Wayne State University, MI
    171155: (2020, 2019),   # Mid Michigan College, MI
}


def pull(year, cip):
    url = f"{API}/{year}/?cipcode_6digit={cip}&race=99&sex=99&majornum=1"
    rows = []
    while url:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
            page = json.load(r)
        rows += page["results"]
        url = page.get("next")
    return rows


def rederive():
    """DELTA and the quarantine's premise, straight from the endpoint. Raises on drift."""
    got = collections.Counter()
    for cip in CIP:
        for r in pull(YEAR, cip):
            got[r["unitid"]] += r["awards_6digit"]
    got = {u: n for u, n in got.items() if n > 0}
    if got != DELTA:
        only_api = {u: n for u, n in got.items() if DELTA.get(u) != n}
        only_tbl = {u: n for u, n in DELTA.items() if got.get(u) != n}
        raise SystemExit(f"atlas_reprojection: DRIFT. The endpoint now serves a different "
                         f"{YEAR}. api={sorted(only_api.items())[:6]} "
                         f"table={sorted(only_tbl.items())[:6]}")
    prev = collections.Counter()
    for cip in CIP:
        for r in pull(YEAR - 1, cip):
            prev[r["unitid"]] += r["awards_6digit"]
    prev = {u: n for u, n in prev.items() if n > 0}
    if prev != DELTA:
        raise SystemExit(f"atlas_reprojection: {YEAR} is NO LONGER a copy of {YEAR - 1}. "
                         f"The quarantine's premise has changed; re-derive before patching.")
    return sum(DELTA.values())


def main():
    path = os.path.join(ROOT, REL)
    with open(path, encoding="utf-8") as f:
        doc = json.load(f, object_pairs_hook=collections.OrderedDict)
    if "source_correction" in doc:
        print(f"  {REL}: already corrected "
              f"({doc['source_correction'].get('applied')}), nothing to do")
        return 0
    if YEAR not in QZ.QUARANTINED:
        raise SystemExit(f"FATAL: {YEAR} is no longer quarantined. This patch subtracts a "
                         f"year the quarantine calls fabricated; if it is real, do not run.")

    rows = doc["dots"] + doc["off_projection"]
    before = {"awards": sum(d["total_awards"] for d in rows),
              "ever": doc["totals"]["ever"], "active": doc["totals"]["active"],
              "states": doc["totals"]["states"],
              "programs": sum(d["programs"] for d in rows),
              "active_programs": sum(d["active_programs"] for d in rows),
              "first_years": [d["first_year"] for d in rows],
              "levels": [d["levels"] for d in rows]}

    unseen = set(DELTA) - {d["unitid"] for d in rows}
    if unseen:
        raise SystemExit(f"FATAL: {sorted(unseen)} carry a duplicated year but are not on "
                         f"the page. A patch cannot add an institution; rebuild instead.")
    for d in rows:
        d["total_awards"] -= DELTA.get(d["unitid"], 0)
        if d["unitid"] in LAST_YEAR_FIX:
            was, now = LAST_YEAR_FIX[d["unitid"]]
            if d["last_year"] != was:
                raise SystemExit(f"FATAL: {d['name']} reads last_year {d['last_year']}, "
                                 f"not the {was} this patch was derived against.")
            d["last_year"] = now

    # The hero tile, the closer and one claim read D['top']; it is a projection of the
    # rows and is recomputed here rather than edited, so it cannot disagree with them.
    top = max(rows, key=lambda d: d["total_awards"])
    doc["top"] = collections.OrderedDict(
        [("name", top["name"]), ("unitid", top["unitid"]),
         ("total_awards", top["total_awards"])])

    after = {"awards": sum(d["total_awards"] for d in rows),
             "ever": doc["totals"]["ever"], "active": doc["totals"]["active"],
             "states": doc["totals"]["states"],
             "programs": sum(d["programs"] for d in rows),
             "active_programs": sum(d["active_programs"] for d in rows),
             "first_years": [d["first_year"] for d in rows],
             "levels": [d["levels"] for d in rows]}
    for k in ("ever", "active", "states", "programs", "active_programs",
              "first_years", "levels"):
        if before[k] != after[k]:
            raise SystemExit(f"FATAL: {k} moved. Removing a duplicated year cannot change "
                             f"it, so the premise or the data is wrong. Do not ship.")
    if before["awards"] - after["awards"] != sum(DELTA.values()):
        raise SystemExit("FATAL: the subtraction did not land on the duplicated year.")
    if any(d["last_year"] == YEAR for d in rows):
        raise SystemExit(f"FATAL: an institution still reads last_year {YEAR}.")
    if any(d["total_awards"] <= 0 for d in rows):
        raise SystemExit("FATAL: an institution lost its whole record. 2020 has a 2019 "
                         "twin, so that cannot happen; the table is wrong.")

    doc["source_correction"] = collections.OrderedDict(sorted(MARK.items()))
    doc["quarantined"] = {str(y): w for y, w in QZ.QUARANTINED.items()}
    doc["quarantine_caption"] = QZ.CAPTION
    doc["meta"]["source"] = doc["meta"]["source"].rstrip(". ") + \
        f". {QZ.CAPTION}, so the census under this page counts 1991–2023 without it."

    if not CHECK:
        # Written back the way its own producer wrote it, the rule mirror_fix_patch.py
        # states: indent 1, no trailing newline. Re-formatting here would bury a
        # forty-line correction in a three-thousand-line diff.
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=1, ensure_ascii=False)
    print(f"  {REL}: lifetime completions {before['awards']} -> {after['awards']} "
          f"across {len(DELTA)} institutions")
    print(f"  {REL}: last_year {YEAR} -> 2019 for {len(LAST_YEAR_FIX)} institutions")
    print(f"  {REL}: top {doc['top']['name']} {MARK['was']['top_total_awards']} -> "
          f"{doc['top']['total_awards']}")
    print(("CHECK ONLY, nothing written. " if CHECK else "") +
          f"quarantined years: {sorted(QZ.QUARANTINED)}")
    return 0


if __name__ == "__main__":
    if CHECK:
        print(f"  re-derived {rederive()} duplicated completions from the endpoint; "
              f"DELTA agrees and {YEAR} is still a copy of {YEAR - 1}")
    sys.exit(main())
