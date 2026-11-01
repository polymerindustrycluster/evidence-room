# How To Rebuild This

**Can another region rebuild this work for itself?** The page title reads “You can rebuild this for your own region. The codes are the hard part, and they are all on this page.”

Source: `_data/SOURCES.json` (the source registry) and `_data/catalog.json` (the generated inventory of build scripts), joined to five shipped page files:
wages (concentration reading, industry-code arithmetic), occupations (the education-boundary
example), peers (disclosure rates), revisions (how far series move after publication) and
laborshed (the measured gap). Registry read 2026-09-08, as of 2026-09-11. Status in the
data: PUBLISHED.

**What a row is:** one source in the register: its endpoint, the exact filter values applied,
whether it needs a key, how you get it, its licence, and every page here that rests on it.
`pages` reads the same relation the other way.

```
index.html               page shell
styles.css               page-local CSS
app.js                   renders the register and worked figures from data/registry.json (nothing in the register is typed here)
data/registry.json       THE DATA (123 KB). Edit the builder, not this.
reference-lq-2025.json   dated LQ reference snapshot, read 1 September 2026
ROADMAP.md               what shipped, what is deferred, and how each deferred piece gets built
claims.json              35 assertions, re-run by _data/build/verify_claims.py
```

There is no `shots/` folder.

## Rebuild

```
cd ../_data/build
python derive_sources.py     # writes ../../sources/data/registry.json
```

Run `build_catalog.py` first only if the inventory of scripts changed. It regenerates
`_data/catalog.json` and `_data/CATALOG.md`. The derivation reads the registry, the catalog
and the five page files above, so it needs a populated checkout, not only this folder. It does not fetch from
any upstream. `reference-lq-2025.json` is a retained snapshot: validation preserves it, and a
fresh upstream acquisition is not part of this build (`_data/REBUILDING.md`).

On macOS, `catalog.json` cannot be regenerated, because the build outputs it inventories are
absent there. After editing any `fetch_`, `derive_` or `build_` script, `verify_consistency.py`
reports a catalog-mtime error. That is a known exception, not a content failure.

## Read before quoting anything from this page

- **This page hands over method, not data.** It republishes no source. Following it gives
  you the same numbers for your own region, not these.
- **The register lists only sources behind analyses published here.** Totals as generated:
  31 sources, 23 pages, 59 build scripts. Six sources have no endpoint (internal records
  such as the vault and grant agreements); five need a key (cbp, fred, qwi,
  scorecard_fos_polymer, uspto). Eight pages rest on a single source.
- **How you get a source is derived from the endpoint’s shape, not declared.** The tests
  run in order and the order decides some answers: no endpoint is an internal record, then a
  file extension is a bulk download, then an `api` path segment is an API request, then a
  directory is a bulk download, and the rest is a portal query. The rule is printed in
  `meta.definition` so a reader can disagree with a label.
- **The plain-language “what it cannot tell you” lines are hand-written editorial text.** The build fails if a source lacks one.
- **A licence and a set of terms are different things.** Two sources state a licence that
  conditions use: O*NET (CC BY 4.0) and IPEDS via the Urban Institute portal (ODC-By 1.0).
  Both credits print in the page footer. Federal series state terms instead, quoted on each entry.
- **The double-count arithmetic reads `wages/data/wages.json`,** not this folder’s data.
  Change wages and this page must be rebuilt.

## Corrections naming this page

`CORRECTIONS.md`: dated wording on present-tense claims (2026-10-05); the grant documents as
sources; and churn’s false QCEW credit (2026-10-07), after which QCEW feeds eight of 23
pages, not nine.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/sources/
node ../tools/bundle.mjs sources        # → ../dist/sources.html
python ../_data/build/verify_claims.py sources
```
