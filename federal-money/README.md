# The Other Federal Money

**What federal money lands on polymer work here anyway?**

Source: USAspending.gov spending_by_category, place of performance, FY2019–FY2026.

**What a row is:** one (fiscal year, category, code) obligation total

```
index.html      page shell
app.js          charts and interaction
data/federal.json  THE DATA (10 KB). Edit the builder, not this.
shots/          desktop.png, mobile.png
```

## Rebuild the data

```
cd ../_data/build
python derive_rest.py
```

Raw pulls live beside that script so a derivation can be re-run without re-fetching.

## Read before quoting anything from this page

- Place of performance is where work happens, not where a company is headquartered.
- An obligation is not an outlay — it is money committed, which may be spent across years or de-obligated.
- Two scopes live in the file and are never summed: polymer-NAICS rows (charted) and all-industry county rows (context only, an order of magnitude larger).
- FY2026 is partial and not comparable to closed years.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/federal-money/
node ../tools/bundle.mjs federal-money          # → ../dist/federal-money.html
```
