# How Far The Research Reaches

**Who does the region bring in, and who brings the region in?**

Source: OpenAlex works, 2015–2024, in subfield 2507 (Polymers and Plastics), with an
authorship at the University of Akron or Case Western Reserve University. Pulled 2026-08-17.
Status in the data: **PROTOTYPE**.

**What a row is:** one partner institution. It carries the works on which that institution
appears alongside the region, split by whether a corresponding author sat here (LED) or
elsewhere (JOINED). Works with no corresponding-author flag are counted and assigned to neither.

```
index.html        page shell
styles.css        page-local CSS (a few lines)
app.js            map, partner ranking, led/joined split, impact figures; renders from data/reach.json
data/reach.json   THE DATA (445 KB). Edit the builder, not this.
claims.json       8 assertions, re-run by _data/build/verify_claims.py (1 is verify: manual)
```

There is no `shots/` folder.

## Rebuild

```
cd ../_data/build
python fetch_reach.py       # OpenAlex pull, writes reach.json in this folder
python derive_reach.py      # shapes it, quarantines implausible partners,
                            # writes ../../reach/data/reach.json
```

**Both inputs are held, not in the public checkout.** `_data/build/reach.json` (the raw
pull) is gitignored with every other `_data/build/*.json`. `derive_reach.py` also reads
`world.json` from the same folder, the Natural Earth 1:110m coastline backdrop (coastlines only, coordinates rounded to
three decimals). No script in `_data/build` produces `world.json`. So `derive_reach.py` cannot run
from a clean clone; `fetch_reach.py` can, against the live OpenAlex API, and will
return later counts than the shipped file.

## Read before quoting anything from this page

- **Two directions, never one.** LED means at least one corresponding author at Akron or Case
  Western: the region’s reach. JOINED means the region is on the paper and nobody here is
  corresponding: its standing. 985 of the 1,222 papers that name a corresponding author had
  one here (80.6%); 237 were joined; 226 name none (`rch-region-leads`).
- **Why corresponding, not first author.** In polymer chemistry the first author is usually the
  student who ran the experiment and the corresponding author the principal investigator.
- **The bound is a classification, not a keyword** (`rch-bound-is-a-classification`). An earlier
  keyword bound (4,037 works) swept in biomedical polymer research and put hospitals among the
  five largest partners. The subfield bound gives 1,448 works. Biomaterials (subfield 2502,
  1,176 works) is a separate subfield and is reported beside it, not merged.
- **Partner counts depend on the quarantine.** 633 institutions share a paper with the region;
  629 remain after four affiliation-parser artefacts are excluded, with their 10 works named
  (`rch-partner-bases`, `rch-quarantine-is-disclosed`). The quarantine is a hand-written
  denylist, so it catches only what someone has already noticed. A positive test (a partner
  must look like a research institution to be listed) is still owed.
- **Impact is a separate proposition.** FWCI is collected but never charted against
  collaboration. Of 1,364 papers with a citation percentile, 309 are in their field-year’s top
  tenth. The median FWCI is 1.10 and the mean 2.02, 1.8 times the median, so quote the median
  (`rch-median-not-mean`).
- **No raw citation counts are compared across years.** A 2015 paper has had a decade to
  accumulate citations and a 2024 paper months. This is guarded manually
  (`rch-no-raw-citations` is `verify: manual`), not by a runnable check.
- **The map is a backdrop,** never a data layer.

## Corrections naming this page

`CORRECTIONS.md`: a mean described as “more than double the median” (the ratio is 1.8); the
partner counts 633 and 629 printed without saying which was which; and the reach window
(2015–2024) wrongly appearing in collaboration’s reproduce-this filters.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/reach/
node ../tools/bundle.mjs reach          # → ../dist/reach.html
python ../_data/build/verify_claims.py reach
```
