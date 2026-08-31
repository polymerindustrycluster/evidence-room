# -*- coding: utf-8 -*-
"""Strip the CRM pipeline from the chain page's shipped data, per John, 2026-08-31.

The page was always meant to be public; the membership-status taxonomy rode along from the
CRM by oversight. What may ship: a binary member highlight (a chamber publishes its member
directory). What may never ship: pipeline states — that a named company is a `prospect`,
was `passed` on, or is `historical`. Publishing those burns the relationships the register
is built from.

Also found while de-tagging, and worse: `viz-data.json`'s 2025 white-paper list NAMED FOUR
UNFUNDED APPLICANTS (Avient, Redhouse, Gray/CWRU, Synthomer automotive). Naming an
unsuccessful applicant is not something a funder gets to do — it is the reason the
oversubscribed page is restricted. Unfunded rows keep their id and TRL band and lose the
name.

Idempotent; run with --check to see the changes without writing.
"""
import io, json, sys, collections

CHECK = "--check" in sys.argv

def load(p): return json.load(io.open(p, encoding="utf-8"), object_pairs_hook=collections.OrderedDict)
def save(p, d):
    if CHECK: return
    io.open(p, "w", encoding="utf-8", newline="\n").write(json.dumps(d, indent=1, ensure_ascii=False) + "\n")

changed = []

p = "chain/data/chain-data.json"
d = load(p)
n_member = n_detagged = 0
for c in d["companies"]:
    if "ms" in c:
        if c["ms"] == "current":
            c["member"] = True
            n_member += 1
        c.pop("ms")
        n_detagged += 1
if n_detagged:
    changed.append(f"{p}: {n_detagged} rows de-tagged, {n_member} carry member:true")
    d.setdefault("meta", collections.OrderedDict())["membership_note"] = (
        "Member is a binary highlight of PIC's published membership. The register carries "
        "no pipeline states: whether a company was ever prospected, or declined, is not a "
        "fact this page holds.")
save(p, d)

p = "chain/data/viz-data.json"
d = load(p)
n_unnamed = 0
for r in d.get("wp2025", []):
    if not r.get("funded") and r.get("name") not in (None, "Unfunded proposal"):
        r["name"] = "Unfunded proposal"
        n_unnamed += 1
if n_unnamed:
    changed.append(f"{p}: {n_unnamed} unfunded 2025 proposals de-identified")
save(p, d)

for c in changed: print("  " + c)
if not changed: print("  nothing to do (already applied)")
