# -*- coding: utf-8 -*-
"""Re-copy footprints.META[key]["differs"] into the shipped data files that embed it.

WHY. PIC-12 and NEO-14 share ten counties: NEO-14 adds Crawford, Huron, Richland and
Tuscarawas and leaves out Ashtabula and Trumbull. The `differs` sentence every footprint
carried named only the four it adds, so a reader adding four to twelve got sixteen under a
label that says fourteen (CORRECTIONS.md, 2026-08-30, "The one this repository cannot
correct"). The sentence was fixed in pic-geo first, as the vendored-copy rule requires
(polymerindustrycluster/pic-geo PR #1, v1.0.1), and re-vendored into footprints.py.

WHY A PATCH AND NOT A REBUILD, the argument qcew_2025_vintage_patch.py makes. Every one of
these files is written by a fetch or derive script that copies META into its meta block,
and a rebuild would carry the new sentence. The build caches those scripts read are not in
this repository (see .gitignore and _data/REBUILDING.md), so a rebuild from a clone is not
possible, and a rebuild from the private cache would move every other field at once. The
files also carry three different older wordings of the same sentence, from three older
copies of META. A committed, idempotent patch changes the one field and nothing else, and
the next real rebuild writes the same value.

WHAT IT CHANGES. In every */data/*.json, each footprint block (a dict whose "key" is a
footprints.META key and whose "differs" is a copy of META's) gets META[key]["differs"]. Only that
string's bytes change: the file is edited in place, in the escaping style it was written
with, and the result is re-parsed and compared with the intended object before writing.

Run: python _data/build/footprint_meta_patch.py [--check]
--check exits 1, changing nothing, if any shipped footprint carries a stale sentence.
"""
import glob
import json
import os
import re
import sys

from footprints import META

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CHECK = "--check" in sys.argv
LITERAL = re.compile(r'("differs"\s*:\s*)("(?:[^"\\]|\\.)*")')


def blocks(o):
    """Every footprint block in a parsed file, at any depth, whose `differs` is a copy of
    META's. Every META wording, old and new, opens "Excludes "; a sentence a deriver
    wrote on purpose (derive_sources.py replaces it with the chain register's county set)
    is not a copy and is left alone."""
    if isinstance(o, dict):
        if (o.get("key") in META and isinstance(META[o["key"]], dict)
                and str(o.get("differs", "")).startswith("Excludes ")):
            yield o
        for v in o.values():
            yield from blocks(v)
    elif isinstance(o, list):
        for v in o:
            yield from blocks(v)


def files():
    out = []
    for p in sorted(glob.glob(os.path.join(ROOT, "*", "data", "*.json"))):
        if os.path.relpath(p, ROOT).split(os.sep)[0] in {"_data", "_shared", "dist", "node_modules"}:
            continue
        out.append(p)
    return out


stale_total, inspected, unreadable = 0, 0, []
for path in files():
    rel = os.path.relpath(path, ROOT)
    raw = open(path, encoding="utf-8").read()
    try:
        doc = json.loads(raw)
    except ValueError:
        unreadable.append(rel)
        continue
    found = list(blocks(doc))
    if not found:
        continue
    inspected += len(found)
    want = {b["differs"]: META[b["key"]]["differs"] for b in found
            if b["differs"] != META[b["key"]]["differs"]}
    if not want:
        continue
    stale_total += sum(1 for b in found if b["differs"] != META[b["key"]]["differs"])
    if CHECK:
        print(f"  {rel}: {len(want)} stale footprint sentence(s)")
        continue
    ascii_style = not any(ord(c) > 127 for c in raw)

    def sub(m):
        old = json.loads(m.group(2))
        if old not in want:
            return m.group(0)
        return m.group(1) + json.dumps(want[old], ensure_ascii=ascii_style)

    text = LITERAL.sub(sub, raw)
    for b in found:
        b["differs"] = META[b["key"]]["differs"]
    if json.loads(text) != doc:
        sys.exit(f"{rel}: in-place edit does not reproduce the intended object; nothing written")
    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write(text)
    print(f"  {rel}: footprint sentence re-copied from footprints.META")

print(f"{inspected} footprint block(s) inspected; {stale_total} stale"
      + (f"; could not parse: {', '.join(unreadable)}" if unreadable else ""))
sys.exit(1 if (CHECK and stale_total) or unreadable else 0)
