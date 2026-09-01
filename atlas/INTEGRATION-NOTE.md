# Integration note — atlas

What the controller must wire before this page is reachable or shippable. The page renders
standalone (`python -m http.server 8899` → `/atlas/`), passes its claims gate (5 auto + 2
manual), and is deliberately NOT linked, catalogued, or deployed.

## Wiring (mechanical)

1. **Index card** on the front page; pairs naturally with the programs story ("the map"
   beside "the argument").
2. **Catalog**: re-run `_data/build/build_catalog.py` (derive_atlas.py / project_atlas.mjs
   are new scripts; sources registered in `_data/SOURCES.json` under `ipeds_directory`).
3. **Gates**: `npm run gates` before any deploy.
4. **polymer-programs-map repo**: its README points here now. If the Atlas deploys under
   that repo's own identity, ship `dist/atlas.html` there — the bundle is self-contained.

## Publication gates (not mechanical — do not skip)

5. **The Navigator's lane rule** applies exactly as it does to the programs story:
   Ohio-relevant education/workforce content, co-authorship before publication. Same Jean
   conversation, same gate.
6. **Cross-model council at publish time** (standing rule).
7. **The two manual claims** (invisible-four, no-research-layer) need a human reviewer of
   record before deploy.

## Known seams

- `data/viz-data.json` derives from the sibling polymer-programs-db checkout (same seam as
  the programs page) plus `node_modules/us-atlas` at build time.
- The research layer (OpenAlex subfield 2507) is the named next step: verify the 23
  candidates in `polymer-programs-db/incoming/openalex_candidates.tsv` first, budget-aware
  (the API is metered — see API-REGISTRY), then add it as a second mark class with its own
  claims.
- Dot overlap in New England is real at national scale; if it ever matters editorially,
  the fix is an inset, not jitter — jittered coordinates would be fabricated geography.
