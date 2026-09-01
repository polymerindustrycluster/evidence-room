# A Number We Own

**Which polymer industry is this region most concentrated in, and can we prove it without a licence?**

Answer, from the free BLS file: paint and coatings, at 5.96x the national share in 2025, ahead of the rubber products (2.44x) the region is named for. Paint is the strongest of the three codes this page counts as the cluster (3252, 3255, 326) and has run above every other series drawn here in every year since 2015.

**Six series are drawn and they are not one ranking.** 3261 and 3262 are slices of 326; adding them to it counts the same jobs twice. 325 is context, outside the cluster. Any sentence that ranks "six industries" is wrong even when every number in it is right — see CORRECTIONS.md, 2026-08-29. The opening strip draws the three cluster codes as the ranking and sets the other three apart under headings that say why, with block membership read from `naics[].register` rather than typed.

Source: BLS QCEW open data, annual averages, 2015–2025, 14 areas (12 PIC counties plus Ohio and the United States).

**What a row is:** one (year, area, NAICS) annual-average cell; `emp` counts JOBS covered by unemployment insurance, not people and not companies.

```
index.html      page shell and all prose
app.js          charts, the industry picker, and the copy that travels with it
styles.css      page-local CSS: figure chrome, industry key, disclosure band, mobile re-layout
claims.json     30 guards; 29 machine-checked, 1 manual (the two headquarters facts)
data/lq.json    THE DATA (229 KB). Values come from the builder; the prose in `meta`
                (definition, composite_note) is edited here, because it is published
                verbatim into the methodology box.
```

## Rebuild the data

```
cd ../_data/build
python derive_lq.py
```

Raw pulls live beside that script so a derivation can be re-run without re-fetching.

## Derived in the page, not in the file

The **fixed five-county paint series** (section 2) is computed in `app.js` from `data/lq.json`, not from a second data file. Two steps:

1. Recover the national paint share for a year by inverting any disclosed county cell: `nat = (emp / local_total) / lq`. Every disclosed county in a year agrees on `nat` to seven significant figures, which is the check that this is the bureau's own arithmetic rather than a reconstruction.
2. Sum `emp` and `local_total` over the counties BLS discloses for NAICS 3255 in **all** eleven years (Cuyahoga, Lake, Medina, Stark, Summit) and divide by `nat`.

That set is a subset of PIC-12 chosen for continuity across years. It is not a second footprint, and the page says so beside the chart. Claim `lq-paint-fixed-base` re-runs the same arithmetic in Python.

## House rule this page now holds to: direction, not formula

Every number here except the job and establishment counts is a ratio, and a ratio is where
a page goes unreadable while every figure in it stays correct. Three conventions, and they
are load-bearing for any future edit:

1. **Axis titles carry the reading, never the arithmetic.** Every location-quotient axis
   reads `↑ more concentrated here than in the country`. The formula
   (`LQ = local share ÷ national share`) lives in the methodology box.
2. **Reference lines are labelled by what crossing them means.** `1.0× · above it, more
   concentrated here`, not `1.0× is the national share`. The residual chart's axis is a
   deviation axis and says which side is which.
3. **Plain language leads at first use; the technical unit follows.** The H1 says "six
   times as big a share of the jobs here as it is of the country's" and the standfirst
   supplies "5.96×". Later references may use `5.96×` alone.

Terms translated at first contact, in-line: cell (one industry in one county in one year),
establishment (one physical site, not a company; reader prose says "separate sites"),
composite (spelled out as "the line above adds up whichever counties…"), base (spelled out
as "the jobs behind it"). If you reintroduce one of these bare, the page regresses.

## Revision note, 2026-08-28 — what a naive-reader pass changed

No number on the page moved. A reviewer who saw only the rendered page could state exactly
what 5.96x measures and could not say whether it was good news, and could not say how big
any of it was. Both were omissions, so these are clarifications and not corrections:

1. **Direction of merit, stated.** The standfirst now says what a high reading does imply
   (more coatings work per job here than the country has) and what it does not (that the
   industry is big), the first hero card repeats it, and the closer gives the verdict as a
   verdict ("we read 5.96x as..."), attributed rather than smuggled in as a fact.
2. **A magnitude to stand the ratios on.** New claim `lq-cluster-size`: 24,030 cluster jobs
   out of 1,701,857 in PIC-12, paint 4,259 of them. It replaced the "11 of 11" hero card,
   which repeated a sentence already printed three times above the fold.
3. **"The register" is gone from reader prose.** It was a defined term defined nowhere.
   Core / detail / context each arrive with the one example that shows why they exist.
4. **The grid sorts by paint.** Sorted by plastics-and-rubber, Cuyahoga — the only outlined
   cell, the subject of the whole section — was the last row. Guarded by `lq-grid-sort`.
5. **Floors and ceilings no longer read as a contradiction.** `meta.composite_note` names
   its subject in every clause. Both are floors, for two different reasons — see the
   2026-09-01 correction below, which reversed the ratio clause.
6. **Terms of art translated where the reader meets them**: withheld (first source line),
   cell (first sentence of the grid lede), QCEW/BLS/annual averages (provenance sentence),
   establishment retired in favour of "separate sites", PIC expanded in the top banner.
7. **The square-root scale moved above the plot** with a reading aid, out of grey type below
   it. Grid cells print the x. Chart 1's labels carry each series' 2015 value.

## Read before quoting anything from this page

- LQ = (local private NAICS employment / local TOTAL-all-ownership employment) divided by the same ratio nationally. The denominator is `own_code 0`, established empirically: it reproduces BLS's published `lq_annual_avg_emplvl` to a mean absolute error of 0.0025 across 667 cells, with no cell outside ±0.005. That bound is half of the last digit BLS prints, so the two figures are the same number as far as the bureau states it. The intuitive private-over-private denominator is wrong by 0.19 on average.
- 167 cells are withheld by BLS (`disclosure_code N`), carry `suppressed:true` and a null value, and are never zero.
- Paint is the industry the bureau hides most of: 5 of 12 counties are withheld in 2025, so the paint composite is built on 7 readings. **The paint composite's county set moves between years** (6 to 9 counties), which is why the page carries the fixed-base series. Lorain, 11.2x on 465 jobs in 2024, went withheld in 2025 and is most of the apparent fall from 6.40x to 5.96x.
- Withholding drops a county from the NUMERATOR only. `derive_lq.py` builds the composite denominator from `own_code 0` for every county in the footprint, and BLS does not withhold a county's total employment — only the industry cell inside it. So the withheld counties' whole workforce stays in the denominator while their industry jobs leave the numerator, and the composite ratio is a FLOOR that sags as disclosure thins. Checked, not argued: restricting the denominator to the counties that report raises paint from 5.96x to 7.47x in 2025 and raises the reading in every one of the eleven years, for resin as well as paint. Additive counts (jobs, establishments) are floors for the ordinary reason. Nothing on this page is a ceiling.
- The PIC-12 composite is summed from counties and is ours, not the bureau's. BLS publishes no location quotient for a custom geography.

## Corrections

- **2026-08-28, the grid's claim-title.** Three surfaces — the "Where the paint is" lede, the heatmap's figure title, and the SVG text alternative — said "Cuyahoga paint, 11.2x, is the darkest cell in the grid." The ramp is binned at `STEPS = [0,1,2,4,7,11]`, so **six** cells render in the identical darkest colour (Geauga resin 22.7x, Portage rubber 15.1x, Geauga plastics products 12.1x, Geauga all plastics 11.3x, Cuyahoga paint 11.2x, Portage all plastics 11.1x) and four of them are higher than the one the sentence named. The claim was refutable by looking two rows up. All three surfaces now carry what the evidence supports — of the cells in the darkest shade, Cuyahoga paint has the most jobs behind it — the walk-back is printed in the page footer at reader scale, and claim `lq-grid-darkest-shade` re-runs the binning so prose and encoding cannot part company again.
- **2026-08-28, `meta.composite_note`.** It read "so the composite is a floor," which is true of the summed job and establishment counts and false of the ratio the page plots. Rewritten to say which is which, and to carry the ceiling-not-floor reasoning that used to sit in the chart-1 caption.
- **2026-09-01, `meta.composite_note` again, and this README with it.** The 2026-08-28 rewrite above got the direction backwards. It asserted that a withheld county "leaves the numerator and the denominator together" and concluded the ratio "reads more plausibly as a ceiling." Neither is what the code does: the composite denominator is `own_code 0` summed over all twelve counties and is never suppressed, so a withheld county leaves the numerator and stays in the denominator. The ratio is a floor that SAGS with disclosure. Restricting the denominator to the reporting counties raises the reading in all eleven years for both paint and resin, which is the check the 2026-08-28 sentence should have had to pass. The consequence was not confined to this page: `cluster-health` read the moving composite as a real movement and published paint's 2025 disclosure artefact as a fall of 0.44, the longest bar on its movement chart and a standing dot "fourth lowest of eleven." Both are now taken from the fixed-set series.

## Open items for the next pass

- Claim `lq-coatings-anchor` is MANUAL. Attach the SEC annual-report cover-page links for Sherwin-Williams (Cleveland) and RPM International (Medina) before re-publishing.
- The reciprocal link is missing: this page links out to `../peers/`, and `peers/` does not link back.
- The hub card in `index/app.js` still carries the old title and question. It should read as the paint finding.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/location-quotient/
node ../tools/bundle.mjs location-quotient          # → ../dist/location-quotient.html
```
