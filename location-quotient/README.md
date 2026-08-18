# A Number We Own

**How concentrated is the polymer cluster, and can we prove it without a license?**

Source: BLS QCEW open data, annual averages, 2015–2025, 16 areas.

**What a row is:** one (year, area, NAICS) annual-average cell; `emp` counts JOBS covered by unemployment insurance — not people, not companies

```
index.html      page shell
app.js          charts and interaction
data/lq.json       THE DATA (235 KB). Edit the builder, not this.
shots/          desktop.png, mobile.png
```

## Rebuild the data

```
cd ../_data/build
python derive_lq.py
```

Raw pulls live beside that script so a derivation can be re-run without re-fetching.

## Read before quoting anything from this page

- LQ = (local private NAICS employment / local TOTAL-all-ownership employment) ÷ the same ratio nationally. The denominator is `own_code 0`, established empirically — it reproduces BLS's published `lq_annual_avg_emplvl` to MAE 0.0025 across 726 cells. The intuitive private-over-private is wrong by 0.19 on average.
- 190 cells are withheld by BLS (`disclosure_code N`) and carry `suppressed:true` with a null value — never zero.
- The NEO-14 composite is summed from counties and is ours, not BLS's; BLS publishes no LQ for a custom geography. Suppressed counties are excluded, so the composite is a floor.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/location-quotient/
node ../tools/bundle.mjs location-quotient          # → ../dist/location-quotient.html
```
