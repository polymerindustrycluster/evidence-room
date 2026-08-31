# Integration note — programs

What the controller must wire before this page is reachable or shippable. The page renders
standalone today (`python -m http.server 8899` → `/programs/`), passes its claims gate
(9 auto + 2 manual), and is deliberately NOT linked, catalogued, or deployed.

## Wiring (mechanical)

1. **Index card.** Add the story to the front page (`index/`) with the one-sentence spine:
   "Polymer education did not shrink evenly — it hollowed out from the bottom." Rebuild via
   `_data/build/derive_index.py` if the index is data-driven.
2. **Catalog.** Re-run `_data/build/build_catalog.py` so `_data/catalog.json` and
   `_data/CATALOG.md` carry the page and its three source registrations
   (`ipeds_programs_census`, `ipeds_control_cips`, `scorecard_fos_polymer` — already in
   `_data/SOURCES.json`).
3. **Gates.** `npm run gates` for the full battery (bundle, render, collide, claims,
   consistency, columns, centres) before any deploy.
4. **Shots.** Capture `shots/desktop.png` and `shots/mobile.png` once the page is final.

## Publication gates (not mechanical — do not skip)

5. **The Navigator's lane rule.** This is Ohio-relevant workforce content. PIC owns the
   data; PIC does not own the interpretation of what Northeast Ohio should do about it.
   The census's own story spec says it plainly: **co-authorship before publication, not
   after.** The Jean Barbato conversation is the gate for taking this live.
6. **Cross-model council before publish** (standing rule): the page's claims and framing
   go to the council gate at publication time, not before.
7. **The two manual claims** (`prog-no-rebuild-case`, `prog-anchor-tension`) need a human
   reviewer of record before deploy — they rest on documents, not on the dataset.

## Known seams

- `data/viz-data.json` is derived from a sibling checkout (`polymer-programs-db`), not
  from `_data/build` fetchers alone. The deriver prints cross-checks for every number the
  page states and fails loudly if the sibling DB is missing. If the census repo ever goes
  public, the raw JSON could move in-repo and close the seam.
- The UA sub-award figure ($7.1M Tech Hub) in the anchor note is from PIC project records,
  not a public corpus document — the manual claim says so. If a public source lands in
  `ohio-econdev-corpus/12_eda-tech-hubs/`, cite it instead.
- 2024 IPEDS returns HTTP 500 as of 2026-08-21; the census probes on every build, so the
  series self-extends — and several claims will then rightly fail until re-derived and
  re-worded. That is the harness working, not breaking.
