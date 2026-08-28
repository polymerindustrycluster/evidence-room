# Cluster Health

**How is the Northeast Ohio polymer cluster doing?** Five measures, each read against a
stated baseline and against how far that same measure normally moves in a year, each
handing the reader to the page that shows the working.

This is the Evidence Room's front door and a **maintained data product**, not an article.
It carries an update commitment: see "The update contract" below before changing anything.

Sources: no fetches. Every figure is recomputed from the shipped `data/*.json` of six
pages in this repository.

**What a row is:** one measure in one year, carrying its level, the baseline it is read
against, and every year-over-year change the same measure has made in its published
history.

```
index.html          page shell, headline, section prose, figure chrome
styles.css          page-local CSS: the tile rows, the four-across hero, mobile re-layout
app.js              the movement chart, the five tiles, the stat band, the closer
derive_health.py    THE DERIVATION. Reads six pages' data files, writes data/health.json
data/health.json    DERIVED (52 KB). Edit derive_health.py, never this file
claims.json         23 falsifiable assertions, all re-run on every build, none manual
```

## The five measures, and where each one comes from

| Tile | Measure | Source page | Source file |
| --- | --- | --- | --- |
| Scale | Jobs in NAICS 3252 + 3255 + 326, PIC-12 | `wages/` | `data/wages.json` |
| Distinctiveness | Employment share against the national share | `location-quotient/` | `data/lq.json` |
| Job quality | Pay against the county, and against the same industry nationally | `wages/` | `data/wages.json` |
| Talent supply | Polymer degree completions at three universities | `occupations/` | `data/viz-data.json` |
| Capital | Federal awards written into signed awards, and routine contracting | `funding-map/`, `federal-money/` | `data/funding.json`, `data/federal.json` |

The revision calibration in the tinted band comes from `revisions/data/revisions.json`.

## Rebuild

```
python3 derive_health.py          # from anywhere; writes data/health.json
node ../tools/bundle.mjs cluster-health
```

`derive_health.py` fetches nothing and reads nothing outside this repository. If a source
page's data changes, re-run it, then re-run the claims: **23 of the 23 assertions
re-derive their figure from the SOURCE page's file, not from `health.json`**, so a stale
derived file fails the gate rather than shipping.

## Read before quoting anything from this page

- **The movement band is a HISTORY band, not a REVISION band.** It says how far a series
  has moved between published years. It does not say how far the year just published will
  move once the agency restates it. This repository has measured that for exactly three
  producer-price indexes, on the revisions page (median 0.15% of the level, largest
  1.42%), and for none of the employment, degree or spending series here. Do not carry
  the price-index numbers across to the others; the revisions page retracted a weaker
  version of exactly that claim.
- **No tile reports distance from a target, because PIC has set none.** Every baseline on
  the page is either the measure's own past or the national share. If PIC ever sets a
  target, that is a new field and a new sentence, not a re-reading of these.
- **Three of the five measures are built from county cells that BLS withholds.** The
  disclosed set changes year to year, so the SCALE direction is read from the balanced
  panel (the 21 industry-county cells present in all eleven years), never from the raw
  annual totals. The level printed is the disclosed total and is a floor.
- **The resin driver on the Scale tile is partly a disclosure event.** A county returned
  to disclosure between the two years, from four to five, so part of the +461 is the
  bureau publishing more rather than employers hiring more. The claim
  `scale-drivers` guards the disclosed-county counts precisely so that sentence cannot
  survive the counts changing.
- **The Talent tile never divides completions by openings.** The completions are three
  named universities; the only openings estimate available is a state projection for an
  eighteen-county region. Two footprints, so the ratio is a fiction and the tile prints
  both levels side by side instead. If a projection on the twelve counties ever ships,
  compute the ratio and delete this note.
- **IPEDS 2019 and 2020 carry an identical count for every one of the thirteen programs.**
  That is a property of the source file, not of the schools. Claim
  `talent-two-years-identical` holds it, and it should be resolved upstream in
  `occupations/` rather than smoothed over here.
- **Capital is money committed, not money spent.** The funding map's own disclosure says
  disbursement timing is not shown. `$51.0M` is what is written into signed awards naming
  organizations; `$54.1M` is the announced federal total; the difference is a workforce
  award with no published recipient breakdown.
- **FY2026 is a partial year** and is excluded from every average. When it closes, the
  seven-closed-year baseline becomes eight and claim `capital-baseline` fails on purpose.

## The update contract (archetype 4)

This page is a maintenance commitment. Four things have to happen on every refresh:

1. **Re-derive, never edit.** Run `derive_health.py`, then the gates. No figure on this
   page is authored; if a number needs changing, the script or a source page changes.
2. **Re-run the claims and read the failures as a work list.** A failing claim is either a
   sentence that has gone stale or a source page that has moved. `capital-baseline` and
   `how-many-moved-more-than-usual` are the two designed to fail on schedule.
3. **Log an UPDATE, not a correction.** A routine refresh that moves a figure is an
   update with a data-vintage stamp. Only a figure that was WRONG goes in
   `CORRECTIONS.md`. Treating refreshes as corrections teaches readers to ignore the
   corrections log.
4. **Re-check the verdict counts by eye.** Three sentences print how many measures moved
   more than usual (standfirst, chart title, `how-many-moved-more-than-usual`). They are
   all generated from one field, so they cannot drift from each other, but they CAN drift
   from the argument: if the count reaches five, the H2 "The loudest number here is
   ordinary" is no longer the finding and the band needs rewriting rather than
   re-rendering.

Version this page's method, not just its data: the movement-band rule (median of the
earlier absolute changes, the largest of them, and the count of earlier moves this one
beats) is the product. Any change to it is dated and explained here, never silent.

## Known gaps

- **The source registry row for this page is wrong in `_data/SOURCES.json`.** It lists
  `bea_rpp` and `oews`, which this page never reads, and omits `odjfs`, which supplies the
  annual-openings figure on the Talent tile. The correct set is
  `["qcew", "ipeds", "odjfs", "usaspending", "fred"]`. The row was added outside this
  folder and this page cannot edit it; the "Reproduce this" block will over-claim until
  someone does.
- **No measure of output, productivity, exports, private investment or company
  formation.** No page in this room ships one yet, and five measures are not the health of
  an economy. The page says so in its own limitations.
- **The local half of the Job quality tile has no shipped history.** `wages.json` carries
  the county all-industry ratio for the latest year only, so only the national side gets a
  movement band. Adding the ratio to the wages trend rows would close it.
- **The revision band for employment, degrees and spending is unmeasured.** Assembling
  archived QCEW and QWI vintages is the highest-value single addition to this page, and it
  is already the revisions page's closing ask.

## Two things this page holds by hand, not by gate

- **The movement chart's normalised axis.** Five measures in five units cannot share a
  value axis, so the axis is "how far this measure usually moves in a year" and each bar
  is this year's change divided by that. The bar's own right-hand label is in the
  measure's native unit and never a percent: five percents off five denominators on one
  chart invite a comparison that is not available.
- **Direction is separated by luminance, not only hue.** `UP` and `DOWN` in `app.js` are
  `#0C6473` and `#C85F0C`, relative luminance 0.104 against 0.205. Any recolour has to
  keep roughly that 2:1 ratio, or up and down become one gray in grayscale. The verdict
  pill states its reading in words for the same reason.
