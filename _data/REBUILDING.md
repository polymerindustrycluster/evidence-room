# What can actually be rebuilt, tested rather than claimed

Until 2026-08-31 this repository asserted that its raw data was "re-fetchable by
construction via `_data/build/fetch_*.py`". A second machine tried it from a clean clone
and could not. The assertion was never tested; this file records a test instead, and it
is the only honest form the claim can take.

**Historical method.** Run the producer, parse both its output and the committed file, compare block
by block, then revert. Formatting and `meta.fetched` are ignored; a difference in a data
block is a real difference. Anything not listed below was not tested and should be assumed
untested, not assumed working.

## Verified 2026-09-11: scoped chain geography repair

`_data/build/repair_chain.py` takes the held read-only SQLite extract, the existing
public chain projections and the two cached CBP 2023 responses in
`CACHE/build/chain-geography/`. Their byte receipts and manifest are committed in the
private input cache. A private-copy rebuild and repeat produced identical bytes;
`python -m unittest _data.build.test_chain_geography -v` ran 30 checks with
`CHAIN_SOURCE` set to the held SQLite source, including malformed-input controls.
See [chain/README.md](../chain/README.md) for commands and limits. This does not rebuild
company narratives or independently reacquire the application export.

The historical timeline is a public projection with source-linked editorial
corrections; its full producer remains in internal PIC-decks. See
[timeline/README.md](../timeline/README.md) before replacing that snapshot.

## Verified 2026-09-08: corrected source inputs

| Output or check | Current route | Result and boundary |
|-|-|-|
| `federal-money/data/federal.json` | `derive_federal.py --raw-dir CACHE/build` | All 224 signed industry-year rows independently reconcile to the complete category responses. Annual CPI is checked against saved monthly observations. |
| `federal-money/data/techhub.json` | `federal-money/derive_techhub.py` | Seven implementation awards reaggregate from the page's award register. This does not independently re-fetch that older register. |
| `realwage/data/realwage.json` | `derive_realwage.py --peers CACHE/build/peers-2024-boundaries.json --qcew-receipt CACHE/build/qcew-2024-verified-boundary-receipt.json --qcew-adoption-notice CACHE/build/qcew-2024-adoption.web.json --rpp-csv CACHE/build/rpp-2024/MARPP_MSA_2008_2024.csv --rpp-footnotes CACHE/build/rpp-2024/MARPP__Footnotes.html --rpp-receipt CACHE/build/rpp-2024/rpp-receipt.json --metro-counties CACHE/build/pic12-intersecting-cbsas-2023.csv --metro-counties-receipt CACHE/build/pic12-intersecting-cbsas-2023-receipt.json` | Matched 2024 geography: 155 disclosed matches and 227 suppressed rows. The producer verifies wage, price and county-membership inputs against their receipts, parses the BEA defining statement, and records every local metro or micropolitan area's disposition. |
| `cluster-health/data/workplaces.json` | `cluster-health/derive_health.py --workplaces-only --source-dir CACHE/build --check` | Exact held-input reproduction, complete county-year coverage and comparison windows. This does not rebuild the other health measures. |
| Programs and Atlas records | Read-only reconciliation with the held program census | Program annual series and all 147 Atlas institution totals reconcile. This is source verification, not proof of a complete Atlas rebuild path. |
| `sources/data/registry.json` | `derive_sources.py` | Uses the shared registry and page data. A separately dated LQ reference snapshot is retained in `sources/reference-lq-2025.json`; validation preserves that published reference, not a fresh upstream acquisition. |
| `cost-scissors/data/scissors.json` CPI dependency | `sync_scissors_deflator.py --check` (`--write` to synchronize) | Compares the copied deflator and explanation with verified federal CPI observations. Preserves all nominal price series; this is not a complete nominal-series rebuild. |

Here `CACHE` denotes the private `evidence-room-data` checkout; build-script names without
a page prefix are relative to `_data/build/`. Run commands from the public repository root.
The cache's `manifests/2026-09-08-evidence-corrections.json` records source URLs, byte sizes,
current hashes and replaced-input hashes. The new `federal_cpi.json` covers the federal
comparison and dependent source-guide/price-page examples; it does not replace the
separate long-history `cpi.json`.

The later `manifests/2026-09-08-verified-receipts.json` records original response bytes
and query receipts added to the two USAspending inputs. The producer replays hashes,
filters, contiguous page walks and compiled totals. The two manifests record successive
snapshots; neither claims the award-lifetime register was independently re-acquired.

`manifests/2026-09-08-geography-boundaries.json` adds the QCEW adoption and source-boundary
receipts and the Census county delineations used to check Cleveland and Wayne County.
`manifests/2026-09-08-geography-custody.json` adds the explicitly annotated QCEW extract
and verified receipt, preserving the original extract and earlier receipt. The annotation
records its parent hash and changes no rows. `fetch_peers.py --boundary-notice NOTICE
--annotate-existing OLD --output NEW` reproduces it without a network request. The retained
notice is web-tool-rendered official source text, not original HTTP response bytes; its
hash establishes custody of that representation, not the truth of an agency statement.
`manifests/2026-09-08-geography-membership.json` adds the county-to-CBSA extract and its
receipt from the held Census workbook. This separates metropolitan from micropolitan
areas and identifies overlap from canonical PIC-12 counties. The existing RPP receipt
is now a required input and is checked against the actual price CSV and footnote bytes.
`build/programs-announcements/` preserves the EDA bulletin and documentary acquisition
receipts privately; the original Ohio report remains in the provenance-recorded corpus.

Source regressions now run in `node tools/all.mjs`: missing second-page tire obligations,
signed adjustments, invalid pagination, missing CPI months, changed metro boundaries,
wrong state membership, incomplete annual coverage and suppressed zeros. They catch
named defects; they do not certify every upstream source or sentence.

For a fresh price acquisition, `fetch_rpp.py --output-dir NEW_DIRECTORY` retrieves the
official MARPP archive and writes extracted CSV, footnotes and a receipt. An existing
output directory is rejected. Compare new inputs before replacing a snapshot: upstream
revisions and release-year changes can legitimately move results.

## Verified 2026-08-31

| Page data file | Producer | Result |
|-|-|-|
| `patents/data/patents.json` | `derive_patents.py` | **Exact.** Parsed output identical. |
| `location-quotient/data/lq.json` | `derive_lq.py` | Data exact (`naics`, `areas`, `cells`, `composite` all identical). `meta` prose is older than the page. |
| `churn/data/churn.json` | `derive_rest.py` | Data exact; `meta` prose older. |
| `federal-money/data/federal.json` | `derive_rest.py` | Data exact; `meta` prose older. |
| `federal-money/data/awards.json` | `fetch_fed_awards.py` → `derive_fed_awards.py` | **Exact by construction** — committed from the first end-to-end run, 2026-08-31. The fetch is keyless, so a clean clone can re-run it; a refetch will differ wherever USAspending has since restated an award, and the fetcher fails loudly below its 4,000-row probe floor rather than writing a truncated register. |
| `revisions/data/revisions.json` | `derive_rest.py` | Data exact; `meta` prose older. |
| `wages/data/wages.json` | `derive_rest.py` | Data exact; `meta` prose older. |
| `cost-scissors/data/scissors.json` | `derive_rest.py` | **Stale.** Output has no `deflator` block; the page ships one. |
| `laborshed/data/bench.json` | `derive_laborshed_bench.py` | **Stale.** `regions` differs from the shipped file. |
| `occupations/data/viz-data.json` | `derive_occupations.py` | Rebuilt in anger on 2026-08-31; see that commit. |
| `peers/data/peers.json` | `derive_peers.py` | Rebuilt 2026-08-31. Needs `peers.json` in the build cache; `fetch_peers.py` now ships. |

Read the middle rows carefully. **A producer that reproduces the numbers can still be
behind the page.** Four pages regenerate their data exactly but carry `meta` prose written
before the editorial passes, and two drop or change a block outright. Running them without
comparing would silently downgrade published pages. That is worse than not running them,
which is why this table exists rather than a green checkmark.

## Verified 2026-09-01

| Page data file | Producer | Result |
|-|-|-|
| `churn/data/bench.json` | `fetch_qwi_bench.py` → `derive_churn_bench.py` | **Exact by construction** — written by its producers on the first end-to-end run, 2026-09-01, and re-running overwrites the same shapes. The fetch is NOT keyless: `CENSUS_API_KEY` is required, and without it the API answers HTTP 200 with an HTML "Missing Key" page rather than an error, so a lenient caller writes an empty series that reads downstream exactly like a real zero. The fetcher refuses to write unless its all-ages control reproduces `churn/data/churn.json`'s own last four quarters to the job (71,771 / 6,626 / 7,157), which is a check against an answer already known rather than a check against itself. A refetch will differ wherever QWI has since re-benchmarked, which it does periodically and substantially. |
| `programs/data/viz-data.json`, `layers.control.base` only | `fetch_ipeds_control_baserate.py` | **Exact by construction** — the block was written by its producer on the first end-to-end run, from the keyless Urban Institute completions endpoint, and re-running it overwrites the same key with the same shape. The producer will not write at all until it reproduces the page's already-published survival control (48%) from the live API, so a drifted pull fails loudly instead of quietly replacing one control with another. Everything else in this file still comes from the sibling census through `derive_programs.py` and is **untested here**; a refetch will differ wherever Urban has since restated a back year. |

## Historical 2026-09-01 inventory: missing producer paths

The following list records the earlier search, not a current absence claim. The current
table above supplies producer paths for the source guide and Tech Hub data. The earlier
search used a control pattern that was required to match and did:

`atlas/data/viz-data.json` ·
`cluster-health/data/tide.json` ·
`timeline/data/timeline.json` · `timeline/data/heritage.json` ·
`sources/data/registry.json` · `wages/data/mfg.json` ·
`federal-money/data/techhub.json` · `index/data/states.json` ·
`accountability/data/*.json`

**Added 2026-09-01.** `atlas/data/viz-data.json`. Its README named `project_atlas.mjs` as
the producer from the day the page was written; that file has never existed in either tree,
and `derive_atlas.py`, the step before it, reads a `polymer-programs-db/programs.sqlite`
that is not in either tree either. The list missed it because the control-pattern search ran
against files the repository ships, and a page promoted on 2026-08-31 arrived after it. The
heading has carried a count since it was written and the count stopped matching the list; it
is dropped here rather than replaced with a number that will drift again.

**Corrected 2026-09-01.** `cluster-health/data/health.json` was on this list and does not
belong on it: `cluster-health/derive_health.py` produces it, from the shipped data files of
six sibling pages, and re-running it reproduces every block except the one the IPEDS mirror
correction patches on afterwards. The list said the search used "a control pattern that was
required to match and did", which is the right method and did not save it here. Rebuild that
file with `python3 cluster-health/derive_health.py` followed by
`python3 _data/build/mirror_fix_patch.py`; the deriver alone reverts the Talent tile.

For these the committed JSON **is** the source of truth. Nothing regenerates it, so a
defect in one cannot be fixed upstream and has to be edited in place. This is the standing
reason the 2020 IPEDS quarantine is code-complete and data-incomplete: `cluster-health` and
`scorecard` carry their own IPEDS series with the duplicated 2020 still in them, and there
is no deriver to re-run.

The atlas was the fourth, and was the one that reached readers: it shipped publicly on
2026-08-31 with the duplicated year inside it, because its README told anyone who wanted to
fix it to run a script that does not exist. It is corrected as of 2026-09-01 by
`_data/build/atlas_reprojection_patch.py`, on the same pattern as `quarantine_patch.py` and
`mirror_fix_patch.py`. **A missing producer is not only a rebuild problem. It is a
correction-delivery problem**, and this file is where that should have been visible.

## Fetch failures observed 2026-08-31

- `fetch_oews.py` — 403 from BLS. It already sends a full browser User-Agent, so the
  error message's "header completeness" explanation is wrong for this case. The pull is
  a bulk file (`oesm24ma.zip`), not the API, which is the more likely lead.
- `fetch_odjfs_projections.py` — `SSL: CERTIFICATE_VERIFY_FAILED` against local certs.

Both had cached output in the build cache. These endpoints were not re-tested in the
2026-09-08 correction pass; historical failures are not a current availability verdict.

## Where the build cache lives

`_data/build/*.json` is gitignored here and shared between machines through
**[evidence-room-data](https://github.com/polymerindustrycluster/evidence-room-data)**,
private. Supply the pinned files a producer needs. Older recipes copied `build/*.json`
into `_data/build/`; the matched-price recipe above additionally reads the CSV and
footnotes in `build/rpp-2024/`. Four files never
enter it on any path: `metroverse.json` (CC BY-NC-SA and
D&B-derived), `ohsos_bulk.json` (Secretary of State filing records) and `_sbir_awards.csv`
(carries PI email addresses) and `_ohsos_snapshots.jsonl`. The 2026-08-31 check found no
published-page producer reading these excluded files.

## Credentials

`fetch_scorecard.py` needs `COLLEGE_SCORECARD_API_KEY`, read from `~/.env`. No script in
this repository contains a key; all of them read from that file.
