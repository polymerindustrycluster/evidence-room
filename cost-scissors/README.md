# The Spike Ended, Prices Didn't

**Squeeze or windfall? It depends on which link of the chain you sell from.**

Source: U.S. EIA (Henry Hub, Ohio industrial electricity) and FRED/BLS producer price indexes, monthly, 2015–2026.

**What a row is:** one price series in one month

```
index.html      page shell
styles.css      page-local chrome: figure headers, seat selector, vignette stat band, mobile re-layout
app.js          charts and interaction (all derived numbers recomputed from data/scissors.json)
data/scissors.json THE DATA (35 KB). Edit the builder, not this.
shots/          desktop.png, mobile.png
```

## Rebuild the data

```
cd ../_data/build
python fetch_rest.py && python fetch_chain_prices.py   # refreshes the raw fred.json pull
```

Raw pulls live beside those scripts so a derivation can be re-run without re-fetching. **Known gap (2026-08-27):** the derivation step that turns `fred.json` into `data/scissors.json` (rebasing, `retraced`, peaks) is not present in `_data/build/` in this checkout — the previous README pointed at a `derive_rest.py` that does not exist. Until that script is restored, `data/scissors.json` is the frozen derived artifact of the 2026-08-15 fetch; every number on the page is recomputed from it by `app.js` and re-checked by `claims.json`. **Its `meta` prose was hand-edited on 2026-08-28** (ASCII arrows typeset, em-dashes and shouted capitals removed, `row` rewritten in reader words, `definition` and `scope` added to carry the retracement formula and the missing-comparator limitation into the methodology box). No series value was touched. When the derivation script is restored it must emit these strings, or the edit is lost on the next rebuild.

**`data/scissors.json` was hand-edited again on 2026-08-29, and this time it gained data, not only prose.** Three changes, all of which the restored derivation must reproduce or they are lost:

- `meta.nominal` added — the LIMITS-classified sentence that the whole page is nominal, what that excludes, why the page stays nominal, and which readings do not survive deflation. `nominal` is already an allowed key in `picviz.js`'s meta allowlist, so it publishes into the methodology box under Limitations.
- `meta.fetched: "2026-08-15"` added — copied from the `meta` block `_data/build/fetch_chain_prices.py` writes, not invented. Every other page carries it; without it the shared core silently skipped the masthead "Data as of" dateline and the "Retrieved" line in the methodology box, at BOTH widths (the reader who reported it as a mobile-only gap was being generous).
- **a new top-level `deflator` block** — BLS CPI-U all-items annual averages, 2018 to 2025, base year 2019, copied from `federal-money/data/federal.json`, which is the same table this site already uses to restate dollars into 2025 terms. It redraws nothing. It exists so the hero's real-terms paragraph and `cs-nominal-not-real` are computed from a shipped table rather than typed, and so a reader can repeat the division. Its own `caution` field carries the limitation: the averages are annual, not monthly, and stop at 2025, so a 2026 month takes the 2025 factor and every real figure on the page is an upper bound on the gain. `federal-money`'s copy carries a 2026 row that duplicates 2025; that row is deliberately NOT shipped here, and `app.js` clamps to the last real average instead, so nothing silently deflates 2026 by a made-up number.

## Read before quoting anything from this page

- **Every number on this page is NOMINAL.** Not one series is deflated. Consumer prices rose 26.0% between the 2019 and 2025 CPI-U annual averages, so "+40%" is a cash figure and about +11% in real terms, and "a record high" is a cash record whose real-terms equivalent was set back in August 2022. Quote a LEVEL from here and you are quoting cash. What is safe to quote across the inflation is the ORDERING between links and the SIGN and SHAPE of the gap, both of which were rechecked on deflated series (`cs-nominal-ordering-holds`). The hero says all of this above the stat cards; do not strip it.
- **The published gap is one decimal (+14.3), and it is NOT the difference of the rounded indexes.** 140 − 125 = 15; the gap is 139.76 − 125.44 = 14.32. If you quote it, quote the tenth, and if you show the legs, show them at two decimals — the reconciliation block does both. Same at the trough: 114 and 136 give −22, the gap is −22.50.
- Series are in $/mcf, ¢/kWh and index points. They are rebased to 100 at 2019-01 so that ONE axis is honest. This page exists partly to avoid the dual-axis anti-pattern.
- Two constructed units carry the page, and both are stated as a READING on the figure rather than as arithmetic. (1) Share of a run-up given back, on the ladder: 0% still holds the whole run-up, 100% is back to the January 2019 price, past 100% is cheaper than before the run-up started. (2) The gap between two same-based indexes, on the spread chart: one point is one percentage point of price growth since January 2019, above zero means product prices grew more, below zero means resin did. The formulas live in the source lines and `meta.definition`, not on the axes.
- An index shows movement from the base month only — a series that starts high and stays flat looks like one that is cheap and flat.
- The spread chart is a difference of two same-based indexes, which is legitimate. It is NOT a margin: labor, freight, energy and packaging are in neither index.
- The gray reference line is the resin maker's version of the same computation (resin manufacturing minus industrial chemicals) — the only same-method comparator the shipped data allow. Since 2026-08-29 the industrial chemicals index states its own levels in three places (the gap chart's key, the level table under the line chart, and a `Chemicals` column in the spread table), so both legs of that subtraction are checkable; a comparator that cannot state its own values does not belong on a page whose premise is checkability, and the standing rule is that it comes off the chart rather than staying unnamed. No economy-wide (total manufacturing) comparator is drawn because no such input pair is in `data/`; the page says so under Limitations in the methodology box (`meta.scope`) rather than implying the polymer gap is unusual.
- The seat selector re-emphasizes and restates; it never recomputes. Claims guard the default state and the data ingredients of each per-seat sentence.
- "Above zero every month since August 2022" is true and thin. Three of those 48 months came in under a single point: August 2022 (+0.08, the crossing itself), September 2022 (+0.58) and May 2026 (+0.71). Quote the run without those three and you are quoting a stronger claim than the data make.

## Corrections

- **2026-08-29 (third pass, naive-reader audit)** — **The page never said its prices were
  nominal.** Every series is rebased to January 2019 and read morally off that rebasing
  (“somebody in this chain ate the spike and somebody banked it”), across a stretch in
  which consumer prices rose 26.0%. Nothing on the page said the word *nominal*, so
  “+40%”, “an all-time high this month” and the seller’s win all read as real gains. The
  fix is route (a), taken deliberately and with the reason printed: the page STAYS
  nominal, because a producer price index is a nominal measure and both units built on top
  of it here (the share of a rise given back, and the gap between two same-based indexes)
  are defined on the nominal series. What licenses the comparison is that the finding is an
  ORDERING and every link faces the same inflation, and that is now asserted rather than
  argued — `cs-nominal-ordering-holds` re-runs the whole ladder on deflated series and
  fails if the stage ordering breaks (it does not: feedstock 118%, resin 102%, product 26%
  of the real rise given back). The disclosure sits in the hero between the cold-open strip
  and the four stat cards, because the cards are where the unqualified levels are asserted;
  the H1 now says “a record high, before inflation”; the products card says “nothing given
  back in cash”; the gap’s source line states that deflating both legs scales +14.3 to
  +11.4 points and changes neither its sign nor its shape. Three readings that do NOT
  survive deflation are published beside the ones that do: products are up about 11% in
  real terms rather than 40%, their dearest month in real terms was **August 2022 and not
  the latest one**, and resin is back to 100 on the deflated scale against 125 in cash.
  Guarded by `cs-nominal-not-real`, which pins all five figures and fails if any stops
  rounding. The deflator ships in `data/scissors.json` (see the note above) and its
  coarseness is stated in the direction that cannot flatter the page.
- **2026-08-29 (third pass)** — **A line a reader could not check.** The gray comparator on
  the gap chart is resin minus industrial chemicals, and the chemicals index was drawn into
  that subtraction and named as a table column while stating its own level nowhere: not in
  a key, not in the ladder table, not in the level table, not in a source line. It now has
  a key (the gap chart gained one, naming both lines and the three levels behind them), a
  row in the level table under the line chart, and a `Chemicals` column in the spread table
  beside the resin level it is subtracted from, so the second subtraction can be re-run
  exactly the way the first one can. Guarded by `cs-comparator-checkable`, whose
  `falsified_if` records the alternative: if the comparator ever leaves the shipped data,
  the gray line comes off the chart rather than staying as an uncheckable stroke.
- **2026-08-29 (third pass)** — Three smaller reader defects. *Round-tripped* and *IN THE
  GAP* were both used before anything explained them: the H1 now reads “Natural gas gave
  the whole spike back”, and the ladder tag reads “THE MAKERS’ PAIR”, naming a term the
  lede one paragraph above has just defined instead of a gap three sections below. On the
  cold-open strip the marks sat 20 units below their own row name and 26 above the next
  one, with the bottom row only 24 above the axis rule, so a reader read the products row
  as a legend; the arm is shortened to 27 and the axis pushed to 42, which puts every mark
  nearer its own name than anything else. And the four gray context lines on the line
  chart were one gray: electricity, resin-as-a-commodity and products-as-a-commodity now
  each carry a dash pattern, repeated on their end-label rules, so a line can be followed
  across the plot rather than only identified where it stops. Crude keeps the solid stroke
  because the prose leads with it.
- **2026-08-29 (third pass)** — The masthead had no **Data as of** line and the methodology
  box no “Retrieved” line, at either width, because `meta.fetched` was missing from
  `data/scissors.json`. Restored from the fetch script that writes it.

- **2026-08-28 (second pass, naive-reader audit)** — **The gap did not subtract.** The page printed
  the two indexes it is built from as 140 and 125 (line chart, ladder, `$1.40`/`+25%`) and printed
  their difference as +14. A reader who checked got 15, and the same failure recurred at the squeeze:
  `$1.14` against "resin up 36%" gives −22 where the page said −23. Both were correct rounding of
  139.76 − 125.44 = 14.32 and 113.83 − 136.33 = −22.50, and neither was recoverable from anything on
  the page. Three changes: the gap is now published to the tenth everywhere (+14.3, −22.5, +22.5,
  +19.2), which also stops three unrelated quantities all printing as "23"; a reconciliation block
  under the gap lede prints both legs at two decimals for both months, states the rounded subtraction
  and its answer, and names the swing (36.8 points) that the old headline's "23 → 14" invited a reader
  to compute as 9; and the vignette carries both legs instead of only the resin one. Guarded by the
  new `cs-gap-reconciles`, which fails if the two-decimal legs stop subtracting to the stated gaps or
  if the rounded legs stop differing by the 15 the block names.
- **2026-08-28 (second pass)** — "Gas tripled by August 2022" was stated twice in prose and once as a
  chart annotation. The peak is 283 on a base of 100, which is 2.8×, and it is measurable on the page's
  own chart. Now "nearly three times", with the annotation printing the number (`Aug 2022: gas peaks at
  283`) and a new claim (`cs-gas-not-tripled`) that fails if the peak ever reaches 300.
- **2026-08-28 (second pass)** — Four of the seven series were labelled as word-order shuffles of each
  other ("Plastics resins & materials" / "Resin manufacturing"; "Rubber & plastic products" /
  "Plastics & rubber products mfg"), so a reader could not tell which two fed the gap. Renamed by what
  they measure — *from its/their makers* against *as a commodity* — with an IN THE GAP tag on the
  ladder rows that feed the subtraction and both namings in the gap's source line (`cs-four-series-two-pairs`).
  The section headline now names the one row that breaks the ladder ("except the power bill"), and that
  row is tagged on the chart at both widths (`cs-elec-out-of-order`).
- **2026-08-28 (second pass)** — The spread subhead promised three sub-one-point months and the prose
  named two; the third is now named by date. The gas retracement is worked through in the ladder's
  how-to-read line using figures a reader can read off the page (`cs-ladder-worked-example`), the
  formula returned to that figure's source line, and *converter*, *feedstock*, *Henry Hub*, *WTI*, *PPI*,
  *EIA*, *BLS*, *FRED*, *$/mcf* and *¢/kWh* are all glossed at first contact. On mobile: the ladder
  re-laid out to three lines a row (the longest series name collided with its own reading), the gap
  chart regained the direction cue and the full "resin vs chemicals" name, and crude oil — a named
  character in the prose — regained an end label instead of being one of four anonymous gray lines.

- **2026-08-28** — The spread lede said the gap "peaked at +23 this January before easing to +14." That is not the path the chart draws. Resin rose 23 points between March and May 2026 and the gap fell to +0.7 in May, its thinnest month since September 2022, before reopening to +14 in July. The lede now states that path, the dip is annotated on both the desktop and mobile renderings, and the chart title no longer says "above zero every month since August 2022" without saying how thin three of those months were. Two claims were added to pin it (`cs-spread-near-close`, `cs-resin-spring-jump`) and `cs-spread-positive-since` now asserts the count of sub-one-point months rather than only their sign.

- **2026-08-27** — The previous version's closer and spread note said the product-minus-resin gap "is now the widest it has been." The shipped data show the spread peaked at +22.5 points in January 2026 and stood at +14.3 in July 2026 (it had also reached +16.0 in September 2024). The page now states the peak and the current value separately, and a claim (`cs-spread-peak`) pins the peak month so the error cannot silently return. Same date: the hero's sentence about the page's own earlier version was cut, section 2 was retitled from its rebasing rationale to its finding, and the ladder no longer clamps the gas bar at 100% (the 104% overshoot is drawn past the full-rise line and tagged).

## Reporting still owed (drafted interview ask)

The vignette band is a rung-3 index translation; the page is ready to ship at that rung, and since 2026-08-28 the band itself says so above the dollar figures (`.ask`, guarded by the manual claim `cs-no-member-quote`). Reported voice would raise it:

- **Who:** one mid-size PIC injection molder or extruder (via PIC staff intro; anonymized as "a mid-size molder in [county]" is fine).
- **Three questions:** (1) What happened to your resin invoices across 2021–22, and how much of that reached your customers as price? (2) For a part you quoted in 2019 and still run, what does it bill today? (3) Which non-resin costs (labor, freight, energy, packaging) moved most since 2019?
- **Where it slots:** replaces or sits beside the "What the scissors did to a dollar part" band; the illustrative arithmetic stays as the checkable frame around the quote.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/cost-scissors/
node ../tools/bundle.mjs cost-scissors          # → ../dist/cost-scissors.html
```
