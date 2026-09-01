# Integration note — atlas

What the controller had to wire before this page was reachable or shippable. **It was all
done on 2026-08-31**, when the page was promoted to the public tree (PR #5): it is linked
from the front page, in the catalog, and deployed. This note is kept as the record of what
was required, with what actually happened marked against each item — not as a to-do list.

It is worth reading in that light. The page shipped through every gate below with a census
that counted 2019 twice, and the one thing that would have caught it, a re-run of the
projector, was impossible because the projector does not exist. See the README's
re-projection record.

## Wiring (mechanical)

1. **Index card** on the front page; pairs naturally with the programs story ("the map"
   beside "the argument").
2. **Catalog**: re-run `_data/build/build_catalog.py`. Done — `derive_atlas.py` is
   catalogued and `ipeds_directory` is registered in `_data/SOURCES.json`. `project_atlas.mjs`
   never was, because it does not exist; the catalog only inventories what is on disk, so its
   silence about a missing script is not a finding it can make.
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

- `data/viz-data.json` was derived from the sibling polymer-programs-db checkout (same seam
  as the programs page) plus `node_modules/us-atlas` at build time. Neither the checkout nor
  the projector that consumed it is present in this repository or the workshop clone, so the
  seam is now a wall: the committed JSON is the source of truth until someone rebuilds both
  ends. That is what made the 2026-08-26 quarantine undoable here for six days.
- The research layer (OpenAlex subfield 2507) is the named next step: verify the 23
  candidates in `polymer-programs-db/incoming/openalex_candidates.tsv` first, budget-aware
  (the API is metered — see API-REGISTRY), then add it as a second mark class with its own
  claims.
- Dot overlap in New England is real at national scale; if it ever matters editorially,
  the fix is an inset, not jitter — jittered coordinates would be fabricated geography.
