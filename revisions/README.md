# Every Number Moves

**How much do published figures change after publication, and does the change matter for a
decision?**

Source: ALFRED — the archival vintages behind FRED, 2019–2026.

**What a row is:** one (series, reference month) with every value ever published for it

Three series, all named in the headline and all drawn:

| code | panel name | index |
| --- | --- | --- |
| WPU06 | Industrial chemicals | PPI commodity |
| WPU072 | Rubber and plastic products | PPI commodity |
| PCU326326 | Plastics and rubber plants | PPI industry |

```
index.html          page shell
styles.css          page-local CSS: figure chrome, stat band, mobile re-layout
app.js              charts and interaction
data/revisions.json THE DATA (154 KB). Edit the builder, not this.
claims.json         16 falsifiable assertions: 15 re-run on every build, 1 manual
shots/              desktop.png, mobile.png
```

## Rebuild the data

```
cd ../_data/build
python derive_rest.py
```

Raw pulls live beside that script so a derivation can be re-run without re-fetching.

## Read before quoting anything from this page

- Revisions here are small (median 0.15%, largest 1.42%) and that IS the finding. It
  licenses one narrow claim: the **level** of a producer-price series does not move much
  once published. It does **not** mean a fresh figure is "safe to act on" — an earlier
  version of this README said that, and the page itself now retracts it. A small median
  revision says nothing about whether a turning point survives.
- The month-over-month step is the part that does not survive: 14 of 201 comparable month
  pairs changed sign between the first print and today, 12 of them in industrial
  chemicals. That comparison is derived on the page from the archived vintages (each
  month's first print against whatever the previous month carried in the same vintage,
  versus the same step today), with a 0.1% floor on both readings so a flip between +0.02%
  and −0.01% is not counted. Claim `rev-mom-flips` guards all three counts.
- This does not generalise, and the page no longer claims a size for how far other sources
  move. QWI restates whole histories when it re-benchmarks (documented program behaviour,
  carried as the one manual claim, `qwi-restates-history`); how far those restatements
  actually move a published number is **unmeasured here**. Running this method against the
  employment series is the follow-up and the page's closing ask.
- **Open data need:** archived QWI and county-employment vintages. Nothing in this repo
  fetches them, so the closing ask cannot be quantified until they exist. Source: Census
  LEHD QWI, NAICS 326, the PIC-12 counties, one file per historical release (not the
  current API, which serves only the latest recomputation).

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/revisions/
node ../tools/bundle.mjs revisions          # → ../dist/revisions.html
```
