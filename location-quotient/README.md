# A Number We Own

**Which polymer industry is this region most concentrated in, and can we prove it without a licence?**

Answer, from the free BLS file: paint and coatings, at 5.96x the national share in 2025, ahead of the rubber products (2.44x) the region is named for. Paint has led all six industries in every year since 2015.

Source: BLS QCEW open data, annual averages, 2015–2025, 14 areas (12 PIC counties plus Ohio and the United States).

**What a row is:** one (year, area, NAICS) annual-average cell; `emp` counts JOBS covered by unemployment insurance, not people and not companies.

```
index.html      page shell and all prose
app.js          charts, the register picker, and the copy that travels with it
styles.css      page-local CSS: figure chrome, register key, disclosure band, mobile re-layout
claims.json     22 guards; 21 machine-checked, 1 manual (the two headquarters facts)
data/lq.json    THE DATA (229 KB). Edit the builder, not this.
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

## Read before quoting anything from this page

- LQ = (local private NAICS employment / local TOTAL-all-ownership employment) divided by the same ratio nationally. The denominator is `own_code 0`, established empirically: it reproduces BLS's published `lq_annual_avg_emplvl` to a mean absolute error of 0.0025 across 667 cells, with no cell outside ±0.005. That bound is half of the last digit BLS prints, so the two figures are the same number as far as the bureau states it. The intuitive private-over-private denominator is wrong by 0.19 on average.
- 167 cells are withheld by BLS (`disclosure_code N`), carry `suppressed:true` and a null value, and are never zero.
- Paint is the industry the bureau hides most of: 5 of 12 counties are withheld in 2025, so the paint composite is built on 7 readings. **The paint composite's county set moves between years** (6 to 9 counties), which is why the page carries the fixed-base series. Lorain, 11.2x on 465 jobs in 2024, went withheld in 2025 and is most of the apparent fall from 6.40x to 5.96x.
- Withholding drops a county from the numerator and the denominator together, and the withheld counties are the small ones, so an incomplete composite reads more plausibly as a ceiling than a floor. Only additive counts (jobs, establishments) are floors when cells go missing. Ratios are neither.
- The PIC-12 composite is summed from counties and is ours, not the bureau's. BLS publishes no location quotient for a custom geography.

## Open items for the next pass

- Claim `lq-coatings-anchor` is MANUAL. Attach the SEC annual-report cover-page links for Sherwin-Williams (Cleveland) and RPM International (Medina) before re-publishing.
- The reciprocal link is missing: this page links out to `../peers/`, and `peers/` does not link back.
- The hub card in `index/app.js` still carries the old title and question. It should read as the paint finding.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/location-quotient/
node ../tools/bundle.mjs location-quotient          # → ../dist/location-quotient.html
```
