# Every Number Moves

**How much do published figures change after publication, and does the change matter for a
decision?**

Source: ALFRED, the archival vintage record behind FRED, 2019–2026.

**What a row is:** one series and one reference month, carrying every value ever published
for it

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
claims.json         22 falsifiable assertions: 20 re-run on every build, 2 manual
shots/              desktop.png, mobile.png
```

## Rebuild the data

```
cd ../_data/build
python derive_rest.py
```

Raw pulls live beside that script so a derivation can be re-run without re-fetching.

## Read before quoting anything from this page

- Revisions here are small (median 0.15% per revised month, largest total 1.41%) and that IS the finding. It
  licenses one narrow claim: the **level** of a producer-price series does not move much
  once published. It does **not** mean a fresh figure is "safe to act on" — an earlier
  version of this README said that, and the page itself now retracts it. A small median
  revision says nothing about whether a turning point survives.
- The month-over-month step is the part that does not survive: of 201 months that moved
  at least 0.1% from the month before, 14 later reversed direction between the first
  estimate and today, 12 of them in industrial chemicals. That comparison is derived on the page from the archived vintages (each
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

## Two things this page holds by hand, not by gate

- **Direction is separated by luminance, not only hue.** `DOWN` and `UP` in `app.js` are
  #C85F0C and #0C6473, relative luminance 0.205 against 0.104. The first build paired the
  orange with #1A8A9E at 0.209, and in grayscale the two directions were one gray. Any
  recolour has to keep roughly a 2:1 luminance ratio, or up and down stop being readable
  without color.
- **The stacked histogram's up/down annotation is cut to clear the zero rule.** At 375 the
  rule sits at x=198 and the annotation is right-anchored at 365, so the copy has 159 units
  to live in, and "first estimates run low" uses about 154 of them. `collide.mjs` measures
  the desktop layout only and will not catch a regression here; re-measure the two `txt()`
  calls in the `mob` branch if you reword them.
- **Chart-1's two direction labels are placed by hand against the extremes.** WPU06 runs
  +1.382% to -1.415%. On the wide layout the up label sits at the 1.53 level and the down
  label at -1.72, not -1.61, because at -1.61 it printed into the Sep 2021 callout anchored
  at ys(-1.415)+4. Re-check both if the data or `LIM` changes.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/revisions/
node ../tools/bundle.mjs revisions          # → ../dist/revisions.html
```
