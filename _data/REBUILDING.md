# What can actually be rebuilt, tested rather than claimed

Until 2026-08-31 this repository asserted that its raw data was "re-fetchable by
construction via `_data/build/fetch_*.py`". A second machine tried it from a clean clone
and could not. The assertion was never tested; this file records a test instead, and it
is the only honest form the claim can take.

**Method.** Run the producer, parse both its output and the committed file, compare block
by block, then revert. Formatting and `meta.fetched` are ignored; a difference in a data
block is a real difference. Anything not listed below was not tested and should be assumed
untested, not assumed working.

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

## Six published files have no producer anywhere

Not in this repository and not in the internal tree. Searched with a control pattern that
was required to match and did.

`cluster-health/data/tide.json` ·
`timeline/data/timeline.json` · `timeline/data/heritage.json` ·
`sources/data/registry.json` · `wages/data/mfg.json` ·
`federal-money/data/techhub.json` · `index/data/states.json` ·
`accountability/data/*.json`

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

## Fetchers that do not currently work

- `fetch_oews.py` — 403 from BLS. It already sends a full browser User-Agent, so the
  error message's "header completeness" explanation is wrong for this case. The pull is
  a bulk file (`oesm24ma.zip`), not the API, which is the more likely lead.
- `fetch_odjfs_projections.py` — `SSL: CERTIFICATE_VERIFY_FAILED` against local certs.

Both have cached output in the build cache, so the pages build. Neither is re-fetchable
today, and no gate notices.

## Where the build cache lives

`_data/build/*.json` is gitignored here and shared between machines through
**[evidence-room-data](https://github.com/polymerindustrycluster/evidence-room-data)**,
private, 82 pulls. Clone it and copy `build/*.json` into `_data/build/`. Four files never
enter it on any path: `metroverse.json` (CC BY-NC-SA and
D&B-derived), `ohsos_bulk.json` (Secretary of State filing records) and `_sbir_awards.csv`
(carries PI email addresses) and `_ohsos_snapshots.jsonl`. Verified 2026-08-31: no producer of any **published** page
reads any of the three.

## Credentials

`fetch_scorecard.py` needs `COLLEGE_SCORECARD_API_KEY`, read from `~/.env`. No script in
this repository contains a key; all of them read from that file.
