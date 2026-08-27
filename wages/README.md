# Does The Cluster Pay Better

**Do polymer jobs out-pay the towns they sit in?**

Source: BLS QCEW annual averages, 2015–2025.

**What a row is:** one (year, county, NAICS) cell; `weekly_wage` is average weekly wage per covered job — not a salary and not per person

```
index.html      page shell
styles.css      page-local chrome: figure headers, county selector, stat band, mobile re-layout
app.js          charts and interaction (all derived numbers recomputed from data/wages.json)
data/wages.json    THE DATA (130 KB). Edit the builder, not this.
shots/          desktop.png, mobile.png
```

## Rebuild the data

```
cd ../_data/build
python derive_rest.py
```

Raw pulls live beside that script so a derivation can be re-run without re-fetching.

## Read before quoting anything from this page

- The comparison is against each county's own all-industry average, which controls for local cost and local labour markets. Beating the national average while trailing your own town is not a good job in that town.
- Average weekly wage moves with hours and occupational mix, not only pay rates. A plant on overtime looks like a pay rise.
- Withheld cells are absent, not zero, which is why 2025 has 51 rows and not 72 (6 tracked industries × 12 counties); across 2015–2025 a year carries 48–58 rows.
- **Parent/child overlap:** the data ship industry groups (325 chemical mfg, 326 plastics & rubber) alongside their disclosed sub-industries (3252, 3255, 3261, 3262), so a county can appear at both levels and the 51 cells are not additive. The page states this on the chart: counted once at each county's finest disclosed level, the tally is 27 of 35 above — the same roughly three-in-four share as the headline 40 of 51. Employment-weighted hero shares use the deduplicated set only.
- The national comparison (`vs_us`) is the counterweight, not a footnote: 44 of 51 cells pay below the same industry's U.S. average (median 0.88×).

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/wages/
node ../tools/bundle.mjs wages          # → ../dist/wages.html
```
