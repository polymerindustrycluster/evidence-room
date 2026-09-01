"""The IPEDS mirror ran three years late, then caught up by skipping one. One list,
imported by everything that reads completions for the three regional institutions.

WHAT THE 2026-08-26 QUARANTINE SAW, AND WHAT IT MISSED. `ipeds_quarantine.py` found that
the Urban Institute mirror served 2019's award counts again under year=2020, byte for
byte, and dropped the year. That was right, and it was one symptom of a longer fault.
Re-derived on 2026-08-31 against the NCES completions files themselves (C2014_A through
C2024_A, keyless, `fetch_ipeds_nces.py`), for the three institutions and six CIP codes
this site tracks AND for the national totals of two of those codes:

    Urban year   serves NCES   should serve   status
    ...   2019      C2020_A       C2020_A     correct
          2020      C2020_A       C2021_A     one year stale (the duplicate already found)
          2021      C2021_A       C2022_A     one year stale
          2022      C2022_A       C2023_A     one year stale
          2023      C2024_A       C2024_A     correct, and C2023_A is served nowhere

Urban's own convention is the FALL of the academic year, so its year Y is NCES `C{Y+1}_A`:
year 2023 is awards conferred in 2023-24. That convention holds through 2019 and again at
2023. Between them the loader sat one collection year behind, and the jump back into step
at 2023 stepped over `C2023_A` entirely. The national check rules out anything regional:
US totals for CIP 14.3201 read 330, 330, 360, 325, 264 at Urban years 2019-2023 against
NCES 330, 360, 325, 290, 264 at C2020-C2024. The 290 is nowhere in the mirror.

WHY THIS MATTERS MORE THAN THE DUPLICATE DID. A duplicated year is a flat spot. A skipped
year is an ABSENCE the series cannot show: the occupations page published two years below
its half-of-the-old-pace rule when there were three, printed the third-most-recent count
as the latest, and averaged a three-year window whose first year belonged one column to
the left. The half-rule, the 118-179 range and the 142-a-year average all survive the
correction unchanged, which is exactly why nothing caught it.

WHAT THIS MODULE DOES. Translates Urban's labels into the year each one actually carries,
and supplies the one collection year the mirror never served. `LAG` moves the stale years
back into place; `BACKFILL` is `C2023_A`, taken from NCES and named by the same convention
the rest of the series uses (Urban's fall-of-academic-year label 2022).

DEGREES, NOT CERTIFICATES. `C2023_A` also carries two postbaccalaureate certificates
(Akron, 40.0507, award level 6). They are not in `BACKFILL`. No other year of this series
contains a certificate, the page counts degrees, and one year of a ten-year series
counting a category the other nine do not is a worse error than a count two low. The
excluded rows are named in `EXCLUDED` so the choice is auditable rather than invisible.

HOW TO LIFT IT. Re-run `fetch_ipeds_cip.py` and `fetch_ipeds_nces.py` and then
`python3 _data/build/ipeds_mirror_fix.py --check`, which re-derives the whole table from
the two files and fails on any disagreement. If Urban reloads the endpoint, `LAG` and
`BACKFILL` both empty out, the numbers on three pages move again, and that is a
CORRECTIONS.md entry, not a silent rebuild.

WHAT IS STILL BROKEN AND IS NOT FIXED HERE. The programs page draws a 1991-2023 national
and Ohio series from the same mirror, so its 2020, 2021 and 2022 columns carry the same
one-year lag and it is missing C2023_A too. Correcting it means re-fetching thirty-three
years for ten CIP codes from NCES and rebuilding a page this correction does not touch.
It is recorded here so the next reader finds it, and it is not repaired by this module.
"""

# Urban year -> the year it should be filed under, or None to drop it. A stale year is
# not wrong data; it is the right data under the wrong name. 2020 is the exception: it
# serves the same table as 2019 and so has no name of its own left to take.
LAG = {2020: None, 2021: 2020, 2022: 2021}

# NCES C2023_A, degrees only, filed under the label the rest of the series uses.
# (unitid, cip, urban award_level, award, awards)
BACKFILL_YEAR = 2022
BACKFILL = [
    (201645, "143201", 7, "Bachelor", 11),
    (201645, "143201", 9, "Master", 10),
    (201645, "143201", 22, "Doctorate", 6),
    (201645, "141801", 7, "Bachelor", 6),
    (201645, "141801", 9, "Master", 5),
    (201645, "141801", 22, "Doctorate", 7),
    (203517, "401001", 9, "Master", 3),
    (200800, "143201", 9, "Master", 4),
    (200800, "143201", 22, "Doctorate", 8),
    (200800, "400507", 9, "Master", 8),
    (200800, "400507", 22, "Doctorate", 15),
]
# Kept out of BACKFILL on purpose; see DEGREES, NOT CERTIFICATES above.
EXCLUDED = [(200800, "400507", 8, "Post-bacc cert", 2)]

INST = {200800: "University of Akron", 203517: "Kent State University",
        201645: "Case Western Reserve University"}
CIP = {"143201": ("Polymer/Plastics Engineering", "polymer"),
       "400507": ("Polymer Chemistry", "polymer"),
       "150607": ("Plastics and Polymer Engineering Technology/Technician", "polymer"),
       "141801": ("Materials Engineering", "materials"),
       "401001": ("Materials Science", "materials"),
       "401002": ("Materials Chemistry", "materials")}

# What the corrected regional series reads, degrees only, by the label the pages print.
# Held here so a patch, a claim or a reader can check a page against one list.
TOTALS = {2014: (125, 20), 2015: (143, 26), 2016: (179, 22), 2017: (162, 34),
          2018: (145, 29), 2019: (118, 23), 2020: (124, 20), 2021: (54, 29),
          2022: (62, 21), 2023: (63, 33)}

# What a page says when it has to name the correction in one clause.
CAPTION = ("2020 to 2022 are taken from the NCES completions files: the federal mirror "
           "this series is otherwise built from ran a year behind and skipped one")


def note(prefix="Note"):
    """One sentence for a methodology block."""
    return (f"{prefix}: the Urban Institute IPEDS mirror served its 2020, 2021 and 2022 "
            f"labels one collection year late and never served C2023_A at all, so those "
            f"three years are re-filed and the missing one is taken from NCES directly")


def backfill_rows():
    """The missing collection year, in the row shape fetch_ipeds_cip.py produces."""
    return [{"year": BACKFILL_YEAR, "unitid": u, "inst": INST[u], "cip": c,
             "label": CIP[c][0], "group": CIP[c][1], "award_level": lvl,
             "award": award, "awards": n}
            for u, c, lvl, award, n in BACKFILL]


def apply_rows(rows, key="year"):
    """Re-file Urban's rows onto the years they actually carry, and add the missing one.

    Drops the duplicated label, moves the two stale labels back one, leaves every other
    year alone, and appends BACKFILL. Idempotent only on a fresh Urban pull: run it once,
    at load, exactly where ipeds_quarantine.drop() used to be called.
    """
    out = []
    for r in rows:
        y = r[key]
        if y in LAG:
            if LAG[y] is None:
                continue
            r = dict(r)
            r[key] = LAG[y]
        out.append(r)
    if any(r[key] == BACKFILL_YEAR for r in out):
        raise SystemExit(f"FATAL: the mirror now serves {BACKFILL_YEAR} itself. Re-run "
                         f"ipeds_mirror_fix.py --check before trusting either source.")
    return out + backfill_rows()


def _check():
    """Re-derive LAG, BACKFILL and TOTALS from the two fetched files. Exits 1 on drift."""
    import collections
    import json
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    try:
        nces = json.load(open(os.path.join(here, "ipeds_nces.json"), encoding="utf-8"))
    except OSError:
        raise SystemExit("run fetch_ipeds_nces.py first (it writes ipeds_nces.json)")
    ncy = collections.Counter()
    for r in nces["rows"]:
        if r["is_degree"]:
            ncy[(r["group"], r["collection_year"])] += r["awards"]
    bad = []
    for label, (poly, mat) in sorted(TOTALS.items()):
        c = label + 1                      # the collection year that label carries
        got = (ncy[("polymer", c)], ncy[("materials", c)])
        # Before 2021 the page's series drops programmes that conferred nothing in its
        # window, so its totals sit at or below the institutions' true totals.
        if label >= 2021 and got != (poly, mat):
            bad.append(f"  {label} (C{c}_A): page says {(poly, mat)}, NCES says {got}")
        if label < 2021 and (got[0] < poly or got[1] < mat):
            bad.append(f"  {label} (C{c}_A): page says {(poly, mat)}, above NCES {got}")
    back = collections.Counter()
    for r in nces["rows"]:
        if r["collection_year"] == BACKFILL_YEAR + 1 and r["is_degree"]:
            back[(r["unitid"], r["cip"], r["urban_award_level"], r["award"])] += r["awards"]
    mine = collections.Counter({(u, c, lvl, a): n for u, c, lvl, a, n in BACKFILL})
    if back != mine:
        bad.append(f"  BACKFILL disagrees with C{BACKFILL_YEAR + 1}_A: "
                   f"{sorted((back - mine).items())[:4]} / {sorted((mine - back).items())[:4]}")
    if bad:
        print("ipeds_mirror_fix: DRIFT\n" + "\n".join(bad))
        return 1
    print(f"ipeds_mirror_fix: clean. {len(BACKFILL)} backfilled rows, "
          f"{len(TOTALS)} labelled years agree with NCES C{min(TOTALS) + 1}..C{max(TOTALS) + 1}.")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(_check() if "--check" in sys.argv else
             print((__doc__ or "").strip().split("\n\n")[1]) or 0)
