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
app.js              the standing chart, the movement chart, the five tiles, the closer
derive_health.py    THE DERIVATION. Reads six pages' data files, writes data/health.json
data/health.json    DERIVED (52 KB). Edit derive_health.py, never this file
claims.json         36 falsifiable assertions, all re-run on every build, none manual
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
python3 ../_data/build/mirror_fix_patch.py   # REQUIRED: re-applies the IPEDS mirror correction
node ../tools/bundle.mjs cluster-health
```

**`derive_health.py` alone does not reproduce the shipped file.** The Talent tile carries
the IPEDS mirror correction, which `_data/build/mirror_fix_patch.py` applies on top and
which the deriver knows nothing about. Running the deriver by itself silently reverts the
talent standing to ten mis-filed years and drops the `source_correction` block. The patch
is idempotent, so running it after every derive is safe and skipping it is not.

`derive_health.py` fetches nothing and reads nothing outside this repository. If a source
page's data changes, re-run it, then re-run the claims: **the assertions re-derive their
figure from the SOURCE page's file, not from `health.json`**, so a stale derived file
fails the gate rather than shipping.

## Read before quoting anything from this page

- **The usual-move yardstick is a HISTORY measure, not a REVISION measure.** It says how
  far a series has moved between published years. It does not say how far the year just published will
  move once the agency restates it. This repository has measured that for exactly three
  producer-price indexes, on the revisions page (median 0.15% of the level, largest
  1.42%), and for none of the employment, degree or spending series here. Do not carry
  the price-index numbers across to the others; the revisions page retracted a weaker
  version of exactly that claim.
- **No tile reports distance from a target, because PIC has set none.** Every baseline on
  the page is either the measure's own past or the national share. If PIC ever sets a
  target, that is a new field and a new sentence, not a re-reading of these.
- **Two of the five tiles read their LEVEL and their MOVEMENT on different bases, and say
  so.** Scale reports every county figure the bureau published (24,030) and measures the
  move on the counties published in every year (23,457). Distinctiveness does the same
  from 2026-09-01: the level is the published composite (5.96x) and the move and the range
  are the five counties published in all eleven years (7.68x). The two are readings on
  different geographies, neither is a correction of the other, and neither may be quoted
  without its basis. **Why it changed:** `lq.json`'s composite divides the jobs of the
  counties that report by the workforce of all twelve, because BLS withholds an industry
  cell and never a county's total employment. So the published ratio sags whenever
  disclosure thins, and this tile had been reading that sag as economics. Paint's 2025
  "fall" from 6.40x to 5.96x is Lorain going withheld; on the counties published in both
  years the composite rose, and on the fixed five it reached an eleven-year high. The
  movement chart's longest bar was that artefact and is now employment.
- **STANDING and MOVEMENT are two questions and the page keeps them in two bands.** The
  standing chart puts each level on its own published range, lowest year at the left and
  highest at the right, and marks which end is the better one for the region. The movement
  chart says how far this year's step was against how far that measure usually steps. A
  reader who was given only the second came away with a volatility meter: bar length was
  the size of a move, colour was rose-or-fell, and the longest bar belonged to the one
  measure the page itself says has no better end. Neither chart may be described as a
  verdict on the cluster, and the five are never combined into one, because a composite
  needs weights nobody has set.
- **A position in a range is not a grade, and Job quality is the standing proof.** It sits
  at the top of its own eleven-year range and is under the national rate for the same work
  in every one of those years. Claim `standing-pay-top-of-range-is-not-parity` fails the
  build if the ratio ever reaches 1.0, at which point the note that uses this row as its
  worked example has to be rewritten rather than left standing.
- **Merit direction is DECLARED in `derive_health.py`, never inferred from the data.**
  Four measures carry `better_end: "high"`; Distinctiveness carries `None` and is drawn
  grey. Claim `standing-merit-is-declared-not-inferred` fails if a fifth appears or if any
  measure's better end becomes the low one, because the axis states the rule once for the
  whole chart.
- **Two totals for one year, both correct, each labelled.** `24,030` is every county
  figure BLS published for 2025; `23,457` is the 21 figures published in every year since
  2015, and it is the only basis that supports the three-year fall. A level and a trend
  need different bases. Neither is a correction of the other and neither may travel
  without its basis named; claim `two-bases-for-the-same-year` holds both.
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
- **Capital is money SIGNED AND ASSIGNED, and this page states no disbursed amount at
  all — not even a zero.** `$51.0M` is what is written into signed awards naming
  organizations; `$54.1M` is the announced federal total; the difference is a workforce
  award with no published recipient breakdown. How much has been DRAWN DOWN is a different
  quantity and the public record cannot show it: award and execution are published,
  drawdown is not, so a fully assigned award that has paid out nothing and one that has
  paid out everything are the same document. The page shipped "signed, none of it spent",
  which a reader finished believing was a measured zero. `_data/FIGURES.json` registers
  `award_disbursed` as NOT PUBLICLY OBSERVABLE, `tools/figures.mjs` fails the build on any
  page that gives it a value, and claim `no-disbursed-amount-anywhere` guards the derived
  file the page renders from.
- **FY2026 is a partial year** and is excluded from every average, and from the capital
  standing rail. When it closes, the seven-closed-year baseline becomes eight and claims
  `capital-baseline` and `standing-capital` fail on purpose.
- **The contracting figures are printed to hundredths of a million because the subtraction
  is on the page.** At one decimal the tile read "rose to $39.0M from $22.5M ... up
  $16.4M", and both ends were correctly rounded while 39.0 minus 22.5 is 16.5. A reader
  ran the only check available to them and the sentence failed it. Claim
  `capital-move-subtracts` asserts that the three printed figures close at the precision
  they are printed at; if a revision breaks that, rewrite the sentence, do not re-round
  it.

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
   from the argument: if the count reaches five, the movement band's framing is no longer
   the finding and the band needs rewriting rather than re-rendering. Check the standing
   band the same way: its lede and legend state that four of the five have a better end
   and that the better end is the right-hand one for all four, which is one sentence
   covering five rows and stops being true the moment a merit direction changes.

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
- **Those two hues are the CHART's, and nothing else on the page may spend them.** The
  driver-strip values used `--ink`, which is the UP teal, so two falls printed in the
  colour the legend assigns to a rise. They are neutral now, and the verdict pill is the
  reference line's charcoal rather than the DOWN rust, so "notable" and "which way" stay
  visually independent.
- **The record mark is an upright, never a band.** It used to be a filled region from zero
  to the widest earlier move, which every bar sits inside by construction, so its caption
  read as "nothing unusual here" against row labels saying the opposite. A single mark
  carries the same fact with no inside or outside to misread.
- **The axis carries no `×`.** That glyph is spent on the row labels, where it means
  multiples of a national share or wage. The axis is multiples of a normal year's move,
  which is a different quantity, so it is written in words.
