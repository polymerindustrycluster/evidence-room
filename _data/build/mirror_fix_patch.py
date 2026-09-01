# -*- coding: utf-8 -*-
"""Apply the IPEDS mirror correction to the two shipped files that carry it.

WHY A MIGRATION AND NOT A REBUILD, the same argument `quarantine_patch.py` makes.
`cluster-health/data/health.json` is one of the published data files that nothing in
either tree regenerates, so the committed JSON IS its source of truth. And
`occupations/data/viz-data.json` has a deriver whose seven other inputs (the employment
matrix, two OEWS vintages, O*NET, QCEW, the state projections) would all be re-fetched at
new vintages to fix one year of one panel, moving numbers this correction has nothing to
do with. A committed, idempotent patch keeps the reasoning in code, the edit reviewable
as a diff, and the blast radius at the defect. `derive_occupations.py` is fixed too, so a
real rebuild lands in the same place; this is what gets there without one.

`scorecard/data/scorecard.json` is NOT patched here. It recomputes its talent rows from
the occupations file, so run its own deriver after this:

    python3 _data/build/mirror_fix_patch.py
    cd scorecard && python3 derive_scorecard.py

WHAT IT CHANGES. Per `ipeds_mirror_fix.py`: the mirror's 2021 and 2022 labels move back to
2020 and 2021, the collection year the mirror never served arrives at 2022 from NCES, and
2023 stays where it is. The 2020 hole closes, because the year was never missing, only
misfiled. Everything the correction touches downstream is recomputed here rather than
edited: per-programme window averages, the three-year window, the standing tile's rank and
position, and the tile's year-on-year move.

IDEMPOTENT. Each file gets a `source_correction` block; a file that already has one is
left alone. Run it twice and the second run says so.

Run: python3 _data/build/mirror_fix_patch.py [--check]
"""
import collections
import json
import os
import statistics
import sys

import ipeds_mirror_fix as MF

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
CHECK = "--check" in sys.argv
MARK = {"applied": "2026-08-31", "by": "_data/build/mirror_fix_patch.py",
        "why": MF.CAPTION,
        "source": "NCES IPEDS completions C2021_A-C2024_A, via fetch_ipeds_nces.py"}


def load(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return json.load(f, object_pairs_hook=collections.OrderedDict)


def save(rel, doc, compact=False):
    """Write it back the way its own producer writes it.

    occupations/data/viz-data.json ships minified because its deriver writes it that
    way; re-indenting it here would bury a twelve-line correction in a three-thousand-line
    diff and make the next reviewer read a reformat instead of a fix.
    """
    if CHECK:
        return
    with open(os.path.join(ROOT, rel), "w", encoding="utf-8") as f:
        if compact:
            json.dump(doc, f, separators=(",", ":"), ensure_ascii=False)
        else:
            json.dump(doc, f, indent=1, ensure_ascii=False)
            f.write("\n")


changed = []

# ------------------------------------------------------------------- occupations
rel = "occupations/data/viz-data.json"
occ = load(rel)
if "source_correction" in occ:
    changed.append(f"{rel}: already corrected")
else:
    # The mirror's rows, rebuilt from the shipped per-programme maps and re-filed.
    back = collections.defaultdict(dict)
    for u, cip, lvl, award, n in MF.BACKFILL:
        back[(MF.INST[u], cip, award)][MF.BACKFILL_YEAR] = n
    for p in occ["programs"]:
        by = {int(y): v for y, v in p["by_year"].items()}
        moved = {}
        for y, v in by.items():
            if y in MF.LAG:
                if MF.LAG[y] is None:
                    continue
                moved[MF.LAG[y]] = v
            else:
                moved[y] = v
        if MF.BACKFILL_YEAR in moved:
            raise SystemExit(f"FATAL: {p['institution']} {p['cip']} {p['award']} already "
                             f"carries {MF.BACKFILL_YEAR}; the mirror may have reloaded.")
        moved.update(back.pop((p["institution"], p["cip"], p["award"]), {}))
        p["by_year"] = {str(y): v for y, v in sorted(moved.items())}
    if back:
        raise SystemExit(f"FATAL: backfilled programmes not on the page: {sorted(back)}. "
                         f"A new programme cannot be added by a patch; rebuild instead.")

    latest = max(int(y) for p in occ["programs"] for y in p["by_year"])
    window = [latest - 2, latest - 1, latest]
    for p in occ["programs"]:
        p["latest"] = p["by_year"].get(str(latest), 0)
        p["window_avg"] = round(sum(p["by_year"].get(str(y), 0) for y in window) / 3, 1)
    occ["programs"] = [p for p in occ["programs"] if any(p["by_year"].get(str(y)) for y in window)]

    def total(group, year):
        return sum(p["by_year"].get(str(year), 0) for p in occ["programs"] if p["group"] == group)

    pt = occ["program_totals"]
    pt["latest_year"] = latest
    pt["window"] = window
    pt["polymer_awards_latest"] = sum(p["latest"] for p in occ["programs"]
                                      if p["group"] == "polymer")
    # FROM THE COUNTS, NEVER BY ADDING ROUNDED AVERAGES. Summing the thirteen rounded
    # per-programme window averages gave 80.4 where the three years average 80.3, the same
    # rounded-shares mistake the staffing panel corrected in its own note.
    pt["polymer_awards_window_avg"] = round(sum(total("polymer", y) for y in window) / 3, 1)
    pt["n_programs"] = len(occ["programs"])
    series = {y: (total("polymer", y), total("materials", y))
              for y in sorted({int(y) for p in occ["programs"] for y in p["by_year"]})}
    if series != MF.TOTALS:
        raise SystemExit(f"FATAL: corrected series {series} != ipeds_mirror_fix.TOTALS.")

    occ.pop("quarantined", None)
    occ["source_correction"] = dict(MARK, years_refiled={str(k): v for k, v in MF.LAG.items()},
                                    year_backfilled=MF.BACKFILL_YEAR)
    occ["gaps"] = {"kind": "correction+sparse",
                   "reason": MF.CAPTION + "; a programme with no completions in a year has no row"}
    occ["meta"]["years"]["ipeds_latest"] = latest
    occ["meta"]["years"]["ipeds_window"] = window
    occ["meta"]["source"] = occ["meta"]["source"].replace(
        "IPEDS completions by CIP via the Urban Institute",
        "IPEDS completions by CIP via the Urban Institute, with 2020 to 2022 taken from "
        "the NCES completions files directly")
    changed.append(f"{rel}: {len(occ['programs'])} programmes, {window} window, "
                   f"latest {pt['polymer_awards_latest']}, "
                   f"window average {pt['polymer_awards_window_avg']}")
save(rel, occ, compact=True)

# ----------------------------------------------------------------- cluster-health
rel = "cluster-health/data/health.json"
h = load(rel)
if "source_correction" in h:
    changed.append(f"{rel}: already corrected")
else:
    poly = {y: p for y, (p, _) in MF.TOTALS.items()}
    h["completions"] = [{"year": y, "polymer": p, "materials": m}
                        for y, (p, m) in sorted(MF.TOTALS.items())]
    # WAS `completions_flat_pairs: [2020]`, the duplicate-year detector's own output. It
    # now finds nothing, and an empty list at the top level of a published file publishes
    # as a finding of zero (verify_consistency's empty-data rule). The count moves into
    # the correction block as a scalar, so "the detector ran and found none" stays on the
    # record without a bare [] standing in for it.
    repeats = [b for a, b in zip(sorted(poly), sorted(poly)[1:]) if poly[a] == poly[b]]
    h.pop("completions_flat_pairs", None)
    tile = next(t for t in h["tiles"] if t["id"] == "talent")
    st, years = tile["standing"], sorted(poly)
    vals = [poly[y] for y in years]
    lo, hi = min(vals), max(vals)
    st["series"] = [{"year": y, "value": poly[y]} for y in years]
    st["value"] = poly[years[-1]]
    st["year"] = years[-1]
    st["n_years"] = len(years)
    st["span"] = [years[0], years[-1]]
    st["low"] = {"year": next(y for y in years if poly[y] == lo), "value": lo}
    st["high"] = {"year": next(y for y in years if poly[y] == hi), "value": hi}
    st["rank_from_low"] = sorted(vals).index(st["value"]) + 1
    st["position"] = round((st["value"] - lo) / (hi - lo), 3) if hi > lo else 0
    WORDS = {1: "lowest", 2: "second lowest", 3: "third lowest", 4: "fourth lowest"}
    N = {9: "nine", 10: "ten", 11: "eleven", 12: "twelve"}
    st["rank_words"] = (f"{WORDS.get(st['rank_from_low'], str(st['rank_from_low']) + 'th lowest')}"
                        f" of {N.get(st['n_years'], st['n_years'])}")
    st["basis"] = f"the same three institutions, {years[0]} to {years[-1]}. {MF.CAPTION}."
    tile["value"] = str(st["value"])

    steps = [(b, poly[b] - poly[a]) for a, b in zip(years, years[1:])]
    prior = [abs(c) for _, c in steps[:-1]]
    med = statistics.median(prior)
    band = tile["band"]
    band["latest_year"] = years[-1]
    band["latest"] = steps[-1][1]
    band["abs_latest"] = abs(steps[-1][1])
    band["median_prior"] = med
    band["max_prior"] = max(prior)
    band["n_prior"] = len(prior)
    band["beats"] = sum(1 for p in prior if p < abs(steps[-1][1]))
    band["typicals"] = round(abs(steps[-1][1]) / med, 4)
    band["max_typicals"] = round(max(prior) / med, 4)
    band["verdict"] = "above" if band["typicals"] > 1 else "ordinary"
    band["steps"] = [{"year": y, "change": c, "typicals": round(abs(c) / med, 4)}
                     for y, c in steps]

    move = steps[-1][1]
    off_high = round((1 - st["value"] / hi) * 100)
    tile["direction"] = collections.OrderedDict([
        ("value", move), ("pct", round(move / poly[years[-2]] * 100, 1)),
        ("words", f"up {move} on the year, and {off_high} percent below its "
                  f"{st['high']['year']} high" if move > 0 else
                  f"down {abs(move)} on the year, and {off_high} percent below its "
                  f"{st['high']['year']} high"),
        ("short_move", f"up {move} degree{'' if abs(move) == 1 else 's'}" if move > 0 else
                       f"down {abs(move)} degree{'' if abs(move) == 1 else 's'}"),
        ("of", "on the year"), ("streak", None)])
    h.pop("quarantined", None)
    h.pop("quarantine_caption", None)
    h["source_correction"] = dict(MARK, repeated_years_after_fix=len(repeats),
                                  was_flat_pairs=[2020])
    changed.append(f"{rel}: talent standing -> {st['n_years']} years, "
                   f"'{st['rank_words']}', move {tile['direction']['short_move']}")
save(rel, h)

for c in changed:
    print("  " + c)
print(("CHECK ONLY, nothing written. " if CHECK else "") +
      "now re-run: cd scorecard && python3 derive_scorecard.py")
