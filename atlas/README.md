# The Polymer Programs Atlas

**Where has polymer science been taught in the United States — every institution in the
federal record, 1991–2023, on one map?**

Sources: IPEDS completions by six-digit CIP (the polymer-programs-db census build of
2026-08-21) aggregated to institutions; IPEDS directory coordinates; both via the Urban
Institute Education Data API, keyless. Four hand rows for the confirmed census-invisible
institutions.

**What a dot is:** one institution — every program it ever filed under the three polymer
CIP codes, aggregated. Area = lifetime completions; dark = any program still conferring in
2023; light = no polymer-coded award in 2023; hollow diamond = confirmed to teach polymer
science under codes this census cannot see. **Institutions, never individuals** (standing decision
2026-08-19).

```
index.html          page shell
app.js              the map, the largest-records chart, and their table twins
claims.json         9 assertions — 7 machine-checked, 2 manual
data/viz-data.json  THE DATA (~150 KB, mostly basemap paths). Edit the builders, not this.
INTEGRATION-NOTE.md what the controller must wire before this page is reachable or shippable
```

## Rebuild the data

Two steps — aggregation + coordinates in Python, projection + basemap in Node:

```
cd ../_data/build
python derive_atlas.py       # census aggregation + IPEDS directory coords
                             # (cached in ipeds_coords.json; delete to refetch)
node project_atlas.mjs       # pre-projects everything into the AlbersUSA frame
                             # -> ../../atlas/data/viz-data.json
```

The projection constants are the us-atlas ones (975×610, scale 1300, translate
[487.5, 305]) — NOT d3's defaults; the build script says why.

## Read before quoting anything from this page

- **A floor, not a census** — the standard caveat travels with every count, and the
  diamonds put the blind spot on the map itself.
- **"Ever" and "still conferring" are different constructs** (33-year union vs one-year
  snapshot). The census documents the kill of "147 → 41" as a survival claim; this page
  shows both numbers and never their ratio.
- **State rankings depend on the unit.** Michigan leads on institutions ever (15 to
  Ohio's 14); Ohio leads on substantive programs (the programs page). Neither substitutes
  for the other.
- **Seven dots are city centroids** (they left the directory before its coordinate field
  starts in 2009); each says so in its hover. Leaving the directory is not closing: three
  of the seven rows are confirmed closures (Akron Machining Institute 2007; Acme Institute
  of Technology's two Wisconsin campuses 1995), two are still operating (Westlawn; the Red
  Wing campus of Minnesota State College Southeast), two are unestablished. One institution
  (Puerto Rico) sits outside the projection and is named beside the map.
- **The light flag is `active_programs == 0`**, which is "no completion filed under a
  polymer CIP code in 2023" and nothing more. Never label it "ended" or "closed": four
  light rows were confirmed still teaching the subject on 2026-09-01.
- **147 counts unitids, not institutions.** Penn State, NYU and Acme each hold two rows,
  so the distinct count is about 144 and the light count about 103. Disclosed in the
  methodology; collapsing them is a data change and the named next step.
- **No research layer yet, on purpose.** OpenAlex candidates are zero-verified and the
  API is metered; the absence is claimed on the page, not hidden.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/atlas/
node tools/bundle.mjs atlas             # → dist/atlas.html
```

## STALE AS OF 2026-08-26 — do not publish until re-projected

The census under this page was rebuilt on 2026-08-26 to quarantine 2020 (the federal
mirror had been republishing 2019's counts under that year; see `_data/build/ipeds_quarantine.py`
and the CORRECTIONS entry). `derive_atlas.py` re-ran cleanly and `_data/build/atlas_rows.json`
is CURRENT.

`atlas/data/viz-data.json` is NOT. The projection step, `_data/build/project_atlas.mjs`,
needs `d3-geo` and `topojson-client`, and neither is installed on this machine or reachable
through NODE_PATH, so it could not run.

**What is still right:** the headline totals. 147 institutions ever, 41 still conferring in
2023, 35 states. The rebuild reproduced all three exactly, and the page's seven claims
pass against them.

**What is stale:** per-institution `total_awards`, which are inflated by one doubled 2019,
and `last_year` for four institutions that read 2020 where the truth is 2019.

**To fix:** `npm i d3-geo topojson-client` (or install them globally), then
`node _data/build/project_atlas.mjs`, then re-run `verify_claims.py atlas`. The page is in
`$BLOCKED` in `stage/prepare.ps1`, so it cannot reach the public tree in the meantime.
