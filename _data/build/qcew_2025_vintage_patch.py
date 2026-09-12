# -*- coding: utf-8 -*-
"""Stamp the 2025 QCEW re-read into the two shipped files whose derivers cannot say it.

WHY A PATCH AND NOT A REBUILD, the same argument `mirror_fix_patch.py` makes. On
2026-09-11 the 2025 annual averages for Ohio, the United States and the twelve PIC counties
were re-read from the bureau's area files after the first publication of that year was found
revised (80 of 154 cells moved; receipt: qcew_refresh.json beside the canonical qcew.json).
`location-quotient/data/lq.json` and `cluster-health/data/workplaces.json` carry the re-read
rows but still say `fetched: 2026-08-14`, so each page's data-as-of line predates a row it
carries. The location-quotient deriver no longer reproduces the shipped file's metadata text
(the file carries a longer, hand-polished definition than the script writes), and a
regenerated file fails the style gate, so a rebuild would trade one defect for another. A
committed, idempotent patch keeps the reasoning in code and the edit reviewable as a diff.

WHAT IT CHANGES. In each file's `meta`: `fetched` becomes 2026-09-11, and `source` gains one
clause naming the re-read, its date and its scope. Nothing else. The dashboard,
`cluster-health/data/health.json`, takes the latest of its inputs' fetched dates and needs no
patch; re-run `cluster-health/derive_health.py` then `mirror_fix_patch.py` after this.

IDEMPOTENT. A file whose source already carries the clause is left alone; run it twice and
the second run says so. Files are written back at the indentation they were read with.

Run: python _data/build/qcew_2025_vintage_patch.py [--check]
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CHECK = "--check" in sys.argv

REREAD_DATE = "2026-09-11"
CLAUSE = ("; the 2025 rows for Ohio, the United States and the twelve counties re-read from "
          "the bureau on 2026-09-11 after the first publication of that year was found revised")
FILES = ["location-quotient/data/lq.json", "cluster-health/data/workplaces.json"]


def indent_of(text):
    lines = text.split("\n")
    if len(lines) < 3:
        return None
    return len(lines[1]) - len(lines[1].lstrip(" ")) or None


exit_code = 0
for rel in FILES:
    path = os.path.join(ROOT, rel)
    raw = open(path, encoding="utf-8").read()
    doc = json.loads(raw)
    meta = doc["meta"]
    if CLAUSE in meta.get("source", ""):
        print(f"  {rel}: already stamped ({meta.get('fetched')})")
        continue
    if CHECK:
        print(f"  {rel}: NOT stamped (fetched {meta.get('fetched')})")
        exit_code = 1
        continue
    meta["source"] = meta["source"].rstrip(".") + CLAUSE
    meta["fetched"] = REREAD_DATE
    ind = indent_of(raw)
    text = json.dumps(doc, indent=ind, ensure_ascii=False,
                      separators=None if ind else (",", ":"))
    assert json.loads(text) == doc
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text + ("\n" if raw.endswith("\n") else ""))
    print(f"  {rel}: stamped fetched {REREAD_DATE}, source clause added")
sys.exit(exit_code)
