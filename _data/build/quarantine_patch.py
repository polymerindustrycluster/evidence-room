# -*- coding: utf-8 -*-
"""Apply the IPEDS quarantine to the two shipped files that have no producer.

WHY THIS IS A MIGRATION AND NOT A DERIVER. `cluster-health/data/health.json` and
`scorecard/data/scorecard.json` are two of the nine published data files that nothing in
either tree regenerates (see _data/REBUILDING.md). For those files the committed JSON IS
the source of truth, so a correction to them is a change to a source of truth. Hand-editing
one is unauditable and unrepeatable; writing full derivers means reverse-engineering eight
upstream sources to fix one defect. A committed, idempotent, re-runnable patch is the
honest shape in between: the reasoning lives in code, the edit can be reviewed as a diff,
and running it twice is a no-op.

WHAT IT FIXES. The Urban Institute mirror republished 2019 award counts under year=2020.
`derive_occupations.py` drops them at load; these two files were built before that existed
and still carry the fabricated year. cluster-health counts it as one of the ten years in a
published standing tile. scorecard renders it in a sparkline, though every figure scorecard
PUBLISHES already reads its 2021-2023 window, so its finding was never affected -- it
detected the duplication (dup_1920 = 11) and compensated, and only the shipped series is
wrong.

SUPERSEDED FOR BOTH FILES, 2026-08-31, AND KEPT FOR THE RECORD. `ipeds_mirror_fix.py`
found that the duplicated 2020 was the first of three years the mirror filed a year late,
and re-derived all of them from NCES; `mirror_fix_patch.py` writes a `source_correction`
block into each file it corrects. This script now refuses to touch a file carrying one,
because dropping 2020 from a corrected series would delete a real year. It is not deleted
because the quarantine is still live for the programs page, which reads the same mirror
and has not been re-derived.

Run: python _data/build/quarantine_patch.py [--check]
"""
import collections
import json
import os
import sys

import ipeds_quarantine as QZ

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
CHECK = "--check" in sys.argv
Q = sorted(QZ.QUARANTINED)


def load(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return json.load(f, object_pairs_hook=collections.OrderedDict)


def save(rel, doc):
    if CHECK:
        return
    with open(os.path.join(ROOT, rel), "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")


def declare(node):
    """The block verify_series.declared() reads, so the hole is OK rather than a HOLE."""
    node["quarantined"] = {str(y): w for y, w in QZ.QUARANTINED.items()}
    node["quarantine_caption"] = QZ.CAPTION


def drop_years(rows, key="year"):
    return [r for r in rows if r.get(key) not in Q]


changed = []


def corrected(doc, rel):
    """True if mirror_fix_patch.py has already re-filed this file's IPEDS years."""
    if "source_correction" not in doc and "source_correction" not in doc.get("talent", {}):
        return False
    changed.append(f"{rel}: superseded by mirror_fix_patch.py, left alone")
    return True


# ---------------------------------------------------------------- cluster-health
rel = "cluster-health/data/health.json"
h = load(rel)
SKIP_HEALTH = corrected(h, rel)
before = len(h["completions"])
h["completions"] = h["completions"] if SKIP_HEALTH else drop_years(h["completions"])
if len(h["completions"]) != before:
    changed.append(f"{rel}: completions {before} -> {len(h['completions'])} rows")

# ONLY the IPEDS-derived tile. The quarantine is a statement about one federal mirror's
# completions file, NOT about the year 2020. Five standing tiles on this page carry a 2020
# point and four of them -- jobs, paint, pay, contracting -- are real BLS and USASpending
# data for a real year. A first draft of this script matched "any series containing a
# quarantined year" and reported that it would rewrite all five, which would have deleted
# four years of good data to fix one bad one. That is why --check exists and why the
# selection below is an explicit allowlist rather than a shape heuristic.
IPEDS_TILES = {"polymer degrees a year"}

for tile in ([] if SKIP_HEALTH else h.get("tiles", [])):
    st = tile.get("standing")
    if not isinstance(st, dict) or not isinstance(st.get("series"), list):
        continue
    if st.get("basis_short") not in IPEDS_TILES:
        continue
    if not any(p.get("year") in Q for p in st["series"]):
        continue
    st["series"] = drop_years(st["series"])
    vals = [p["value"] for p in st["series"]]
    lo, hi = min(vals), max(vals)
    st["n_years"] = len(st["series"])
    st["low"] = {"year": next(p["year"] for p in st["series"] if p["value"] == lo), "value": lo}
    st["high"] = {"year": next(p["year"] for p in st["series"] if p["value"] == hi), "value": hi}
    st["rank_from_low"] = sorted(vals).index(st["value"]) + 1
    st["position"] = round((st["value"] - lo) / (hi - lo), 3) if hi > lo else 0
    WORDS = {1: "lowest", 2: "second lowest", 3: "third lowest"}
    N = {9: "nine", 10: "ten", 11: "eleven", 12: "twelve"}
    st["rank_words"] = (f"{WORDS.get(st['rank_from_low'], str(st['rank_from_low']) + 'th lowest')}"
                        f" of {N.get(st['n_years'], st['n_years'])}")
    # The span still runs 2014-2023; the record inside it has a hole, and the basis says so.
    st["basis"] = st["basis"].rstrip(".") + f". {QZ.CAPTION}."
    changed.append(f"{rel}: {st['basis_short']!r} standing -> {st['n_years']} years, "
                   f"'{st['rank_words']}'")
if not SKIP_HEALTH:
    declare(h)
    save(rel, h)

# ---------------------------------------------------------------- scorecard
rel = "scorecard/data/scorecard.json"
s = load(rel)
tal = s["talent"]
if not corrected(s, rel):
    before = len(tal["polymer"])
    tal["polymer"] = drop_years(tal["polymer"])
    if len(tal["polymer"]) != before:
        changed.append(f"{rel}: talent.polymer {before} -> {len(tal['polymer'])} rows")
    declare(tal)
    save(rel, s)

for c in changed:
    print("  " + c)
if not changed:
    print("  nothing to do (already applied)")
print(("CHECK ONLY, nothing written. " if CHECK else "") +
      f"quarantined years: {Q}")
