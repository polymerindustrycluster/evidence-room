# The Churn Engine

**Is the workforce stable, or just flat?**

Source: Census Quarterly Workforce Indicators, seasonally adjusted, NAICS 326, 2012Q1–2025Q3.

**What a row is:** one (county, year, quarter) cell. `Emp` is a STOCK at quarter start; hires and separations are FLOWS during the quarter — they never share an axis with employment

```
index.html      page shell
app.js          charts and interaction
data/churn.json    THE DATA (8 KB). Edit the builder, not this.
shots/          desktop.png, mobile.png
```

## Rebuild the data

```
cd ../_data/build
python derive_rest.py
```

Raw pulls live beside that script so a derivation can be re-run without re-fetching.

## Read before quoting anything from this page

- 2025Q4 is dropped, not drawn as zero — QWI has not published it.
- QWI counts jobs, not people: a person moving between two plants in the same county appears as one separation and one hire, so churn includes movement *within* the cluster.
- Quarters where a county is withheld are floors; `counties` on each row says how many of 14 are in the sum.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/churn/
node ../tools/bundle.mjs churn          # → ../dist/churn.html
```
