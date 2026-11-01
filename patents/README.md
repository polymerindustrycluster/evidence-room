# American polymer patenting fell by a fifth. Ohio fell with it.

**Does the region still invent?**

Source: USPTO Open Data Portal (api.uspto.gov), patent applications search, CPC class C08
(organic macromolecular compounds), filing years 2015–2026. Status in the data: PUBLISHED.
Read on 2026-08-30 and 2026-08-31 (`meta.fetched`, `meta.as_of`).

**What a row is:** one filing year. It holds the count of C08 patent applications with an
inventor correspondence address in Ohio, in the US, and in each of four anchor cities
(Akron, Cleveland, Canton, Youngstown). Applications filed, not patents granted.

```
index.html          page shell
styles.css          page-local CSS
app.js              charts and table views, drawn from data/patents.json
data/patents.json   THE DATA (4 KB). Edit the builder, not this.
claims.json         8 assertions, re-run by _data/build/verify_claims.py
```

`claims.json` reads two files: this page’s `patents.json` and the occupations page’s
`viz-data.json`, which the pipeline note uses to restate the talent page’s degree decline.
There is no `shots/` folder.

## Rebuild

```
cd ../_data/build
python fetch_patents.py     # NEEDS USPTO_API_KEY (free, account.uspto.gov), read from
                            # ~/.env or ../.env. Writes _data/patents.json and
                            # patents/data/patents.json in one run.
```

`fetch_patents.py` is the only script that writes this page’s file. Its docstring records that
PatentsView shut down on 2026-03-20 and that Patent Public Search returned HTTP 500 on every
query, so the Open Data Portal is the one working route. A refetch needs the network and
a key, and will move the recent years as the publication lag closes.

Do not confuse it with `derive_patents.py`. That script reads a private `_patents_raw.jsonl`
(gitignored) and writes `_data/build/patents.json`, a different analysis of applications
credited to firms elsewhere. Its output has `series`, `exporters` and `local`; the page’s file has
`rows`, `bases` and `trend_complete_years`. `_data/REBUILDING.md` lists `derive_patents.py` as this
page’s producer. That attribution does not match the shipped file; it is logged on the readmes
board.

## Read before quoting anything from this page

- **Applications are not grants.** Every count is something somebody filed.
- **Recent years are undercounted by construction.** An application publishes about eighteen
  months after filing. 2023 is the last complete year (`meta.last_complete_year`); 2024 onward
  is fetched and drawn hollow rather than dropped. The 2023 figure is 342 for Ohio. Do not
  read the 2024–2026 bars as a collapse (`pat-lag-flagged`).
- **An address is not a laboratory.** The geography is the correspondence address on the
  filing. The first record the script returned was an Akron company’s filing with the inventor
  resident in Luxembourg. By inventor address Ohio has 8,854 applications all-time;
  by applicant address, 3,948 (`pat-two-bases`). The page counts inventors, because its
  question is whether invention happens here.
- **The four cities are anchors, not the PIC-12 footprint.** The filing carries a city and no
  county. City counts make no ranking claim (`pat-cities-no-claim`) and are never a regional total.
- **C08 is one definition of polymer,** a choice like every code choice on this site. Patents
  measure disclosure, so firms that keep process know-how as trade secret do not appear.
- **Degrees and filings are separate facts.** The pipeline note restates the degree decline
  from the talent page’s own data. Two institutions’ degrees and a state’s filings are not the input
  and output of one process (CORRECTIONS.md, “Inputs and outputs of invention”).

## Corrections naming this page

All in the repo-root `CORRECTIONS.md`: the inputs-and-outputs wording; two chart titles that
carried no claim; “roughly halved, alike” (Ohio non-polymer filings fell 12 percent, polymer
25); and one verb that carried two very different declines. Each is dated there and guarded
by a claim here.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/patents/
node ../tools/bundle.mjs patents        # → ../dist/patents.html
python ../_data/build/verify_claims.py patents
```
