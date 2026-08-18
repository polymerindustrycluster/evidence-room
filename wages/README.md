# Does The Cluster Pay Better

**Do polymer jobs pay more than the counties they sit in?**

Source: BLS QCEW annual averages, 2015–2025.

**What a row is:** one (year, county, NAICS) cell; `weekly_wage` is average weekly wage per covered job — not a salary and not per person

```
index.html      page shell
app.js          charts and interaction
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
- Withheld cells are absent, which is why there are 58 rows and not 84.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/wages/
node ../tools/bundle.mjs wages          # → ../dist/wages.html
```
