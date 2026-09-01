# The Polymer Programs Atlas

**Where has polymer science been taught in the United States — every institution in the
federal record, 1991–2023, on one map?**

Sources: IPEDS completions by six-digit CIP (the polymer-programs-db census build of
2026-08-21) aggregated to institutions; IPEDS directory coordinates; both via the Urban
Institute Education Data API, keyless. Four hand rows for the confirmed census-invisible
institutions.

**What a dot is:** one institution — every program it ever filed under the three polymer
CIP codes, aggregated. Area = lifetime completions; dark = any program still conferring in
2023; light = all ended in the record; hollow diamond = confirmed to teach polymer science
under codes this census cannot see. **Institutions, never individuals** (standing decision
2026-08-19).

```
index.html          page shell
app.js              the map, the largest-records chart, and their table twins
claims.json         7 assertions — 5 machine-checked, 2 manual
data/viz-data.json  THE DATA (~150 KB, mostly basemap paths). Its builder does not
                    exist; corrections go through _data/build/atlas_reprojection_patch.py.
INTEGRATION-NOTE.md what the controller had to wire; all of it was done on 2026-08-31
```

## Rebuild the data

Two steps were designed — aggregation + coordinates in Python, projection + basemap in
Node:

```
cd ../_data/build
python derive_atlas.py       # census aggregation + IPEDS directory coords
                             # (cached in ipeds_coords.json; delete to refetch)
node project_atlas.mjs       # MISSING — read the next paragraph before believing this
```

**`project_atlas.mjs` does not exist**, and neither does `derive_atlas.py`'s input. Not in
this repository, not in the workshop clone, not anywhere on the machine that carried this
page here: the projector was named as the rebuild route from the day the page was written
and nothing has ever run it, and `derive_atlas.py` reads a `polymer-programs-db/programs.sqlite`
that is in neither tree either. That is why the correction below sat undone for six days,
the last of them on a live page: the fix the old banner prescribed could not be carried out
by anyone who read it. So `data/viz-data.json` is a shipped file with no producer, in the sense
`_data/REBUILDING.md` means, and it is corrected the way the other two such files are: by a
committed, idempotent, re-runnable patch — `_data/build/atlas_reprojection_patch.py`, which
carries a `--check` that re-derives its table from the endpoint and fails on drift.

The projection constants in the shipped file are the us-atlas ones (975×610, scale 1300,
translate [487.5, 305]) — NOT d3's defaults. Whoever writes the projector will need them.

## Read before quoting anything from this page

- **A floor, not a census** — the standard caveat travels with every count, and the
  diamonds put the blind spot on the map itself.
- **"Ever" and "still conferring" are different constructs** (33-year union vs one-year
  snapshot). The census documents the kill of "147 → 41" as a survival claim; this page
  shows both numbers and never their ratio.
- **State rankings depend on the unit.** Michigan leads on institutions ever (15 to
  Ohio's 14); Ohio leads on substantive programs (the programs page). Neither substitutes
  for the other.
- **Seven dots are city centroids** (pre-2009 closures — the directory's coordinate field
  starts in 2009); each says so in its hover. One institution (Puerto Rico) sits outside
  the projection and is named beside the map.
- **No research layer yet, on purpose.** OpenAlex candidates are zero-verified and the
  API is metered; the absence is claimed on the page, not hidden.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/atlas/
node tools/bundle.mjs atlas             # → dist/atlas.html
```

## Re-projected 2026-09-01 — the 2026-08-26 quarantine is now applied

**What was stale.** The census under this page was rebuilt on 2026-08-26 to quarantine
2020: the federal mirror had been republishing 2019's counts under that year
(`_data/build/ipeds_quarantine.py`, and the CORRECTIONS entry). Every other page built on
that mirror dropped the year. This one did not, because its own rebuild stopped at the
projector that does not exist. It carried the duplicate for six days, and was public with it
for the last of them: the page was promoted to the public tree on 2026-08-31 (commit
`fd9bb7b`) with the stale data and this banner both still in place. The mechanism the banner
said was holding it back, `$BLOCKED` in `stage/prepare.ps1`, does not exist in either tree —
nothing was blocking anything, and a banner is not a gate.

**How it was checked before it was changed.** The whole 1991–2023 census was re-pulled from
the same endpoint `derive_atlas.py` reads — `completions-cip-6`, the three polymer CIP
codes, `race=99&sex=99`, `majornum=1` from 2000 (the filter does not exist before it) — and
reproduced the shipped file exactly: all 147 institutions, and every `programs`,
`active_programs`, `total_awards`, `first_year`, `last_year` and `levels` on every one of
them, with no mismatches. That is what makes subtracting one year from it a correction
rather than a guess.

**What moved.** Removing the duplicated 2020:

- lifetime completions across the record: **20,859 → 20,052** — the 807 completions of 2019
  counted a second time, spread across 44 institutions
- the deepest record, UMass Lowell: **2,929 → 2,830**
- the three deepest records together: **7,651 of 20,859 (36.7%) → 7,401 of 20,052 (36.9%)**
- `last_year` **2020 → 2019** for the four institutions frozen on the phantom year:
  Peninsula College (WA), Northwest State Community College (OH), Wayne State University
  (MI) and Mid Michigan College (MI)
- eighth and ninth place in the twelve-largest chart swap: Penn College (651 → 623) passes
  Case Western (654 → 613), a three-award gap becoming a ten-award gap the other way. No
  other order changes anywhere in the twelve, and the twelve are the same twelve

**What did not change, and why that is not luck.** Every 2020 row has a 2019 twin, so no
institution, no programme and no award level exists only in the duplicated year. 147
institutions, 41 still conferring, 35 jurisdictions, every per-institution programme count,
every `first_year` and every `levels` string are unchanged by construction — and the patch
asserts each of them rather than trusting the argument. The projected coordinates are
untouched: they are a function of latitude and longitude, and a year label cannot move one.

**What is still wrong here and is not fixed.** `ipeds_mirror_fix.py` found the duplicate was
the first of three years the mirror filed a year late, and that NCES `C2023_A` is served
nowhere. That correction has only been derived for three institutions and six CIP codes;
this page is national and 33 years deep, so it carries the same one-year lag as the programs
page does. Removing the duplicate is the part that is derivable today, and leaving it in
because a larger correction exists would be the worse of the two errors.
