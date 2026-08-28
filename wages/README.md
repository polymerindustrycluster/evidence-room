# Does The Cluster Pay Better

**Do polymer jobs out-pay their towns?**

Source: BLS QCEW annual averages, 2015–2025. Coverage: the PIC-12 footprint — twelve
Northeast Ohio counties (Ashtabula, Cuyahoga, Geauga, Lake, Lorain, Mahoning, Medina,
Portage, Stark, Summit, Trumbull, Wayne).

**What a row is:** one (year, county, NAICS) cell; `weekly_wage` is average weekly wage per
covered job — not a salary and not per person

```
index.html      page shell
styles.css      page-local chrome: figure headers, county selector, stat band, byline, footer, mobile re-layout
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

- The comparison is against each county's own all-industry average, which controls for local
  cost and local labour markets. Beating the national average while trailing your own town is
  not a good job in that town.
- Average weekly wage moves with hours and occupational mix, not only pay rates. A plant on
  overtime looks like a pay rise.
- Withheld cells are absent, not zero, which is why 2025 has 51 rows and not 72 (6 tracked
  industries × 12 counties); across 2015–2025 a year carries 48–58 rows.
- **Parent/child overlap:** the data ship industry families (325 chemical mfg, 326 plastics &
  rubber) alongside their disclosed sub-industries (3252, 3255, 3261, 3262), so a county can
  appear at both levels and the 51 cells are not 51 separate places. Counted once at each
  county's finest disclosed level, the tally is 27 of 35 above — **77%, against 78% for the
  headline 40 of 51**, both divided out on the page rather than described. Those 27 cover
  20,463 of the 26,402 jobs in the deduplicated set. The reconciliation is published twice:
  in hero card 1's detail line, beside the headline it corrects, and in full in the
  methodology box.
- The national comparison (`vs_us`) is the counterweight, not a footnote: 44 of 51 cells pay
  below the same industry's U.S. average (median 0.88×).

## Human scale: what was and was not reported

The human-scale beat is carried at **rung 3** — the concrete translated vignette in "What it
means in a paycheck" ($2,474/wk ≈ $129,000/yr in a county averaging ~$62,000; the $853/wk
Stark cell on 30 jobs). No person is quoted, and none is invented.

**Interview ask, drafted and not yet made.** If this page gets a reporting pass, the call is:

- *Who:* an HR or plant manager at a Lake County chemical plant and one at a Stark County
  rubber-products shop (the top and bottom cells on the chart), plus one county workforce
  board director.
- *Three questions:* (1) What does an entry operator earn on day one, and what does the same
  job pay after five years? (2) How much of the weekly average is overtime or shift premium
  rather than base rate? (3) When you lose a hire, who do you lose them to — another plant,
  or a different industry in the same county?
- *Where it slots in:* one quote in the paycheck band, immediately after the Lake/Stark
  contrast, answering question 2 — the caveat the whole page rests on.

Status: **ready-to-ship at rung 3.** Nothing here characterises a named firm or person, so
the reporting requirement is the aspiration, not the gate.

## Design decisions recorded

- **One typeface, deliberately.** The page runs a single sans with hierarchy from weight and
  size. The house voice across this site is `newsroom` (quiet type, restrained palette, no
  display face), so this is the register choice rather than a missing display face. Revisit
  it site-wide or not at all — a display face on one page of thirteen reads as a different
  publication.
- **Products-side hue is page-local.** Marks, legend and stat rule use `#8F4008` rather than
  the shared `#C85F0C`. The shared pair is near-isoluminant with the chemistry teal (L* 52.2
  vs 53.3), so the two families collapsed to one gray in grayscale and the legend showed two
  identical swatches. Same hue, same semantic job, luminance moved 16 points.

## Revision log

- **2026-08-28 (naive-reader pass)** — a reader who saw only the rendered page could not
  make three things close, so those went first. (1) The methodology called 27/35 and 40/51
  "the same roughly three-in-four share" while a hero card rounded the same idea to 78%:
  three roundings of one fact. Both percentages are now computed and printed side by side,
  77% against 78%, guarded by `dedup-reconciles-headline`. (2) The 78% employment-weighted
  hero card was unverifiable (no job count appeared anywhere on the page) and sat one
  rounding away from 40/51 = 78.4%, so it read as the headline said twice. It came out of
  the hero row; the employment totals it rests on (20,463 of 26,402) are printed in the
  methodology, and its slot went to the page's own counterweight, 44 of 51, whose card
  states the 33 overlap so that 40 + 44 − 33 = 51 closes (`hero-counts-reconcile`). (3) The
  de-duplicated 27 of 35 moved up into hero card 1's detail line, beside the number it
  corrects. Chart 1's title claimed a range whose low end was never printed as a ratio:
  it now reads "down to about three-quarters of it" and 0.77× is printed in the bracket and
  the fig-sub (`premium-range-ends`). Both scatter and trend axes stopped labelling before
  the data ended; headroom now puts the outermost tick past the outermost dot on every
  scale, and the mobile chart-1 axis, which printed nothing below 1.0×, carries the same
  0.25 step as desktop. Vertical axes lost their left-right arrows for ↑. QCEW is spelled
  out in the byline, "covered" glossed in the lede, and NAICS plus all six industry codes
  named in the methodology (`industry-codes-listed`). Both charts gained a dot-size key
  drawn by the same radius function as the marks. The empty fourth quadrant is now labelled
  0 pairings on both widths. The h2 "2.09× is a life, not a ratio" was a banned contrastive
  inversion and is now "The top of the chart is a $129,000 job".
- **2026-08-28 (plain-reading pass)** — the ratio is the page's only unit, and it was being
  handed to the reader as arithmetic. Chart 1's how-to-read line said "average weekly wage ÷
  the county's all-industry average" and left the reader to work out that right meant better;
  it now states the reading, and the formula moved to the source line. Every axis on a ratio
  scale carries direction (chart 1 mobile, both trend variants, which had none), and every
  reference line is labelled by what crossing it means rather than by what the line is.
  `0.88×`, `1.35×`, `1.01×` and the 1.12–1.25 band now lead with a plain equivalent at first
  use. Terms of art translated at first contact: *pairing* (defined by doing it, in the
  standfirst), *cell* → group, *disclosed/withheld* → published / too small to publish,
  *25th–75th percentile* → the middle half. Dropped the "one side of the house" metaphor,
  which named nothing a first-time reader could hold. Claim `text` fields re-worded to quote
  the sentences that now ship; all asserts unchanged and passing.
- **2026-08-28** — fix round against the visual review. Mobile scatter y-axis was printing
  0.75/1.00/1.25 as "0.8/1.0/1.3" (equal pixel gaps asserting unequal spans); now on a 0.2
  step with the page's no-round-lie formatter. Footprint banner removed from above the hero
  (it opened on apparatus and used tracker shorthand); geography moved onto every figure and
  into the methods box. Byline and footer added. Band tints deepened and the methods act given
  its own ground. Chart 1 gained a top tick row and gridlines. Em-dashes cleared from page
  prose per the house syntax ban. **Byline date is hand-set and must be re-set at each
  revision** (claim `byline-date`).

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/wages/
node ../tools/bundle.mjs wages          # → ../dist/wages.html
```
