# -*- coding: utf-8 -*-
"""Apply the IPEDS mirror year correction to programs/data/viz-data.json.

WHY A PATCH. `derive_programs.py` reads the polymer-programs-db census (`programs.sqlite`),
which lives on the build machine, not in this tree. The committed viz-data.json is what
this machine has. Its year-keyed series are sums of the mirror's rows, so re-filing them
needs only the series themselves plus the one collection year the mirror never served,
C2023_A, read straight from NCES. `derive_programs.py` applies the same correction, through
`nces_polymer()` below, so a rebuild on the build machine lands in the same place.

WHAT IT CHANGES, per `ipeds_mirror_fix.py`: the mirror's "2021" and "2022" move back to 2020
and 2021, 2022 arrives from NCES C2023_A, and the mirror's "2020" (2019 republished) stays
dropped. Recomputed, never edited: the national series, its marks, the year-on-year falls
since the peak, and every Akron field.

WHAT IT CANNOT CHANGE. The per-programme columns (`total_awards`, `first_year`,
`last_year`, `status`, `span`) are computed by the census's own `build_db.py` from the
mirror's labels, without C2023_A. Everything built on them (the substantive spine, the
base rate, the Ohio and top-programme tables, the state counts) is named in
`source_correction.not_recomputed_here` and pinned by the `prog-not-recomputed` claim, so
that gap can neither close nor move silently.

POPULATION PROOF. Before re-filing, C2022_A's national polymer total (three CIP codes,
first major, all award levels, CTOTALT) must equal the committed mirror "2022". It does
(673), which is what lets one NCES file stand in for the mirror's missing year.

IDEMPOTENT: a file with a `source_correction` block is left alone.

Run: python3 _data/build/programs_mirror_patch.py [--check]
     NCES_ZIP_DIR=/path/with/C2022_A.zip+C2023_A.zip to skip the downloads.
"""
import collections
import csv
import io
import json
import os
import sys
import urllib.request
import zipfile

import ipeds_mirror_fix as MF

HERE = os.path.dirname(os.path.abspath(__file__))
REL = "programs/data/viz-data.json"
PATH = os.path.join(HERE, "..", "..", REL)
URL = "https://nces.ed.gov/ipeds/datacenter/data/C{year}_A.zip"
POLYMER = {"14.3201", "40.0507", "15.0607"}
UA = 200800
LEVEL = {"5": "bachelor", "7": "master", "17": "doctorate", "18": "doctorate", "19": "doctorate"}

# Read from per-programme columns (the census's program.* table, and control_cips.json and
# fetch_ipeds_control_baserate.py for the peer trades), none of which carries C2023_A.
NOT_RECOMPUTED = ["layers", "base", "states", "ohio", "top_tech"]


def nces_polymer(collection_year):
    """National and Akron polymer completions in one NCES collection file.

    Same population as the census: the three polymer CIP codes, first major only, every
    award level, CTOTALT. Returns {"national": n, "akron": n, "akron_by_level": {...}}.
    """
    name = f"C{collection_year}_A.zip"
    local = os.path.join(os.environ.get("NCES_ZIP_DIR", ""), name)
    if os.environ.get("NCES_ZIP_DIR") and os.path.exists(local):
        blob = open(local, "rb").read()
    else:
        req = urllib.request.Request(URL.format(year=collection_year),
                                     headers={"User-Agent": "evidence-room programs patch"})
        with urllib.request.urlopen(req, timeout=300) as r:
            blob = r.read()
    z = zipfile.ZipFile(io.BytesIO(blob))
    names = [n for n in z.namelist() if n.lower() == f"c{collection_year}_a.csv"]
    if len(names) != 1:
        raise SystemExit(f"FATAL: {name} holds {z.namelist()}, expected one unrevised CSV.")
    nat, ua, lv, rows = 0, 0, collections.Counter(), 0
    # utf-8-sig: the file is BOM-prefixed from C2023 on (see fetch_ipeds_nces.py TRAPS).
    for r in csv.DictReader(io.TextIOWrapper(z.open(names[0]), encoding="utf-8-sig")):
        if r["CIPCODE"].strip() not in POLYMER or r["MAJORNUM"].strip() != "1":
            continue
        n = int(r["CTOTALT"])
        nat += n
        rows += 1
        if int(r["UNITID"]) == UA:
            ua += n
            lv[LEVEL.get(r["AWLEVEL"].strip().lstrip("0"), "other")] += n
    if not rows:
        raise SystemExit(f"FATAL: {name} matched no polymer rows; the reader is broken.")
    return {"national": nat, "akron": ua, "akron_by_level": dict(lv)}


def refile(by_year, backfill):
    """{year: value} under the mirror's labels -> under the years the values carry."""
    out = {}
    for y, v in by_year.items():
        if y in MF.LAG:
            if MF.LAG[y] is None:
                continue
            y = MF.LAG[y]
        out[y] = v
    if MF.BACKFILL_YEAR in out:
        raise SystemExit(f"FATAL: {MF.BACKFILL_YEAR} already present after re-filing; "
                         f"the input is not a mirror-labelled series.")
    out[MF.BACKFILL_YEAR] = backfill
    return dict(sorted(out.items()))


def marks_of(by_year):
    """The same anchors derive_programs.py computes, from a corrected series."""
    peak = max(by_year, key=lambda y: by_year[y])
    trough = min((y for y in by_year if y < peak), key=lambda y: by_year[y])
    first, latest = min(by_year), max(by_year)
    m = {k: {"year": y, "awards": by_year[y]} for k, y in
         (("first", first), ("trough", trough), ("peak", peak), ("latest", latest))}
    m["pct_off_peak"] = round(100 * (1 - by_year[latest] / by_year[peak]))
    pairs = list(zip(range(peak, latest), range(peak + 1, latest + 1)))
    assert all(a in by_year and b in by_year for a, b in pairs), "a year is missing"
    return m, sum(1 for a, b in pairs if by_year[b] < by_year[a]), len(pairs)


def akron_backfill_check(c2023):
    """Programs counts every award level; occupations counts degrees. Same file, same 37."""
    shared = (sum(n for u, *_, n in MF.BACKFILL if u == UA)
              + sum(n for u, *_, n in MF.EXCLUDED if u == UA))
    if c2023["akron"] != shared:
        raise SystemExit(f"FATAL: Akron C2023_A all levels {c2023['akron']} != "
                         f"ipeds_mirror_fix BACKFILL+EXCLUDED {shared}.")


def patch(D, c2022, c2023):
    by_year = {r["year"]: r["awards"] for r in D["series"]}
    if c2022["national"] != by_year[2022]:
        raise SystemExit(f"FATAL: C2022_A national {c2022['national']} != mirror '2022' "
                         f"{by_year[2022]}; the populations differ and C2023_A cannot "
                         f"stand in for the missing year.")
    akron_backfill_check(c2023)
    if 2020 in by_year:
        raise SystemExit("FATAL: the committed series carries a 2020; expected it quarantined.")
    by_year = refile(by_year, c2023["national"])
    D["series"] = [{"year": y, "awards": v} for y, v in by_year.items()]
    D["marks"], D["down_years_last7"], D["down_years_of"] = marks_of(by_year)

    ua = D["ua"]
    ua_series = refile({int(y): v for y, v in ua["series"].items()}, c2023["akron"])
    ua["series"] = {str(y): v for y, v in ua_series.items()}
    ua["recent"] = {str(y): v for y, v in ua_series.items() if y >= 2016}
    ua["peak_recent"] = max(ua["recent"].values())
    ua["latest"] = ua_series[max(ua_series)]
    ua["pct_off"] = round(100 * (1 - ua["latest"] / ua["peak_recent"]))
    old = dict(zip(range(2016, 2024), ua["bachelor_2016_2023"]))
    if old[2020] is not None:
        raise SystemExit("FATAL: Akron's bachelor 2020 slot is filled; expected quarantined.")
    old.pop(2020)
    bach = refile(old, c2023["akron_by_level"].get("bachelor", 0))
    ua["bachelor_2016_2023"] = [bach[y] for y in range(2016, 2024)]

    D.pop("quarantined", None)
    D.pop("quarantine_caption", None)
    D["source_correction"] = {
        "applied": "2026-11-02", "by": "_data/build/programs_mirror_patch.py",
        "why": MF.CAPTION,
        "source": "NCES IPEDS completions C2023_A (2022) and C2022_A (population check)",
        "years_refiled": {str(k): v for k, v in MF.LAG.items()},
        "year_backfilled": MF.BACKFILL_YEAR,
        "national_2022": c2023["national"], "akron_2022": c2023["akron"],
        "not_recomputed_here": NOT_RECOMPUTED,
        "not_recomputed_why": "per-programme columns from the census's build_db.py, "
                              "still on the mirror's labels and without C2023_A",
    }
    D["meta"]["source"] = D["meta"]["source"].replace(
        "via the Urban Institute Education Data API",
        "via the Urban Institute Education Data API, with its 2021 and 2022 re-filed a year "
        "back and 2022 taken from the NCES completions files")
    return D


def selftest():
    """The re-filing on a toy series: a hole at 2020, labels late by one."""
    got = refile({2019: 1, 2021: 2, 2022: 3, 2023: 4}, 9)
    assert got == {2019: 1, 2020: 2, 2021: 3, 2022: 9, 2023: 4}, got
    m, down, of = marks_of({2016: 10, 2017: 9, 2018: 11, 2019: 8})
    assert (m["peak"]["year"], down, of) == (2018, 1, 1), (m, down, of)


if __name__ == "__main__":
    selftest()
    check = "--check" in sys.argv
    D = json.load(open(PATH, encoding="utf-8"), object_pairs_hook=collections.OrderedDict)
    if "source_correction" in D:
        print(f"{REL}: already corrected")
        sys.exit(0)
    D = patch(D, nces_polymer(2022), nces_polymer(2023))
    s = {r["year"]: r["awards"] for r in D["series"] if r["year"] >= 2019}
    print(f"{REL}: national {s}; Akron {[(y, D['ua']['series'][str(y)]) for y in range(2019, 2024)]}; "
          f"fell in {D['down_years_last7']} of {D['down_years_of']}")
    if check:
        print("CHECK ONLY, nothing written.")
    else:
        with open(PATH, "w", encoding="utf-8") as f:
            json.dump(D, f, indent=1, ensure_ascii=False)
            f.write("\n")
