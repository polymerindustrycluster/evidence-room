# What The Paycheck Buys

**Does the polymer paycheck buy more in Akron than where the industry's rivals sit?**

Source: BLS QCEW 2023 NAICS 326 metro average weekly wage; BEA Regional Price Parities
2023 (MARPP, all items).

**What a row is:** one metro: nominal average weekly wage, its all-items price level
(US average = 100), and the wage restated in national-average purchasing power
(`real = nominal / rpp * 100`).

```
index.html      page shell
styles.css      page-local chrome: figure headers, metro comparator, tint band, mobile re-layout
app.js          charts and interaction (all derived numbers recomputed from data/realwage.json)
data/realwage.json   THE DATA (76 KB). Edit the builder, not this.
```

## Read before quoting anything from this page

- Ranks are among the **56 metros with at least 2,000 polymer jobs** (a stated choice);
  a different floor gives a different rank. The all-metro set (235 disclosed) appears
  only on the price strip.
- **One year, no track record.** Only the 2023 release ships with this page; the 14-place
  climb has no visible track record here. The `rw-single-year` claim pins this: if
  2021/2022 pairs are ever added to the data, that claim fails on purpose and the
  disclaimer must be replaced by a persistence check.
- The price level compares one fixed national basket across metros. It is not a
  cost-of-living ranking and not a quality-of-life claim.
- Cleveland and Canton withhold their 2023 NAICS 326 wage; the region appears through
  Akron alone. A withheld cell is absent, not zero.
- The comparator's per-metro sentences are variants of one arithmetic
  (`offer × rpp_rival / rpp_akron`); claims assert the default state and the shared
  ingredients, not every variant (house pattern for interactive verdicts).

## Clarifications (wording and layout; no number changed)

- **2026-08-28** — arithmetic-closure and plain-reading pass, written from a reader who
  had only the rendered page. What they could check, they checked; the fixes are what
  failed. **The subtraction.** The $6,600 heading and the closer's "$71,000 to beat
  $64,000" did not reconcile (see Corrections). **The two hero denominators.** "#19 of 56"
  sat beside "110 of 235" with nothing saying they were different populations, and the
  explanation lived in a chart caption thousands of pixels down; both cards now name their
  own universe ("of 56 polymer metros", "of 235 priced US metros"). **Direction of merit
  on card 3:** 110-of-235 is the yardstick that shrinks the claim, not more good news, and
  the card now says so. **The unprintable inputs.** The $71,000 and $81,400 conversions
  depended on Chicago's and San Francisco's price levels, which appeared nowhere on the
  page and could not be read off the scatter either, so the offer band now prints 92.9,
  102.5 and 117.6 and the weekly step between the wage and the annual figure. **An axis
  that stopped before its data:** the scatter's last y label was 110 while seven metros
  plotted above it, including the San Francisco the "fifth less" headline points at; the
  top tick is now 120, guarded by `rw-fifth-less`. **Akron's own diagonal is drawn**, in
  the Akron accent and labelled "Akron buys $1,332", replacing the anonymous $1,300 line:
  every metro above it buys less than Akron. **A size key**, because the figure title is
  about where the biggest employers sit and "bigger circles mean more polymer jobs"
  converts no circle into a job count. **The strip's two reference marks** are 0.2 apart
  and rendered as one smudge, which meant a reader could miss the finding entirely; they
  now carry a single label, "median metro 93.1, 0.2 above Akron: effectively the same
  place", whose subtraction closes against the one-decimal values printed everywhere else.
  **The prior claim is now on the record**: the page corrected a PIC line it never stated,
  which took the credit for honesty without putting the discredited claim in print. Band 2
  opens with it. **PIC is expanded** at first contact, and NAICS 326, QCEW, MARPP, the
  twelve-county footprint, "covered paychecks", "parities" and "a fixed national basket"
  are glossed where a reader meets them. The masthead's "real wages" became "what the
  paycheck buys", because "real" is a term of art everywhere else here. **The 2,000-job
  floor** gets the honest answer to "was it chosen after the answer was known": the
  sensitivity, recomputed from the shipped metro set at floors from 1,000 to 5,000
  (`rw-floor-choice`). **The grey crowd** on the slope is named as grey. Ink paid for by
  the caveats the new sentences replaced; where it still cost words, they were spent.

- **2026-08-28** — plain-reading pass on every constructed unit. Two units carried the
  page and neither could be read from the page alone: the RANK (nothing said which end
  of a 56-metro list was good) and the BEA PRICE LEVEL (an index whose only gloss was
  its own formula, "US average = 100"). Fixes: every axis title on a constructed scale
  now carries direction rather than arithmetic — "Rank on paper / 1 = biggest paycheck",
  "Cheaper ← local price level, US average = 100 → more expensive", "↑ More expensive ·
  price level (US = 100)" — and the mobile rank list gained "1 = biggest paycheck;
  + = climbed". The index gets its plain equivalent at first use, in the band-1 gloss
  and hero card 2: Akron's 92.9 means prices here run about 7 percent below the US
  average, a number now bounded by `rw-strip-marks`. The scatter's how-to-read line
  leads with the reading ("the further right, the bigger the paycheck") instead of the
  axis recipe. Term-of-art swaps at first contact: "nominal" → "on paper" / "the
  printed number" in cards, tooltips and table headers; "disclosed" → "whose polymer
  wage BLS publishes"; "withholds" → "will not publish"; "one print" → "no track
  record"; "price-adjusted terms" → "once local prices are counted". The standfirst's
  "a real polymer workforce" became "a serious polymer workforce", because "real" is a
  technical term everywhere else on this page. Ink paid for by cutting two duplicated
  caveats out of the table notes.

- **2026-08-28** — apparatus discipline pass after a visual review. The pre-hero
  county-footprint banner is gone: it was the page's first text, sat above the headline,
  and rendered at x=0 with no container while every other block sat on the 301px rail.
  Its content now appears where a reader meets it — one sentence in band 1, the
  suppression clause in the slope source line, `meta.geography` in the methodology box.
  Both figure source lines were cut to the house budget (176 and 64 words → 38 and 37,
  zero bold); what they used to carry moved into each figure's existing table
  disclosure. The hero lede lost its second paragraph (the definitions moved to bands 1
  and 2) and now runs four rendered lines. Added: byline block, three-stage footer, and
  a drawn "2023 only" cue under the +14 annotation on both slope layouts, so
  a reader who skips captions still sees the qualifier. `meta.row`, `meta.geography` and
  `meta.not` were rewritten in `derive_realwage.py` as reader sentences (they publish
  verbatim into figure chrome and the methodology box, where "METRO." and a lowercase
  "one metro:" read as broken sentences and "RPP" was an unglossed token).

## Corrections

- **2026-08-28** — the page printed Akron's annual polymer wage as **$64,000** in the
  human-scale band and in the closing banner, beside a Chicago equivalent of $71,000 and a
  section heading of "$6,600 a year". Those three do not close: 71,000 − 64,000 = 7,000.
  The $6,600 was correct and computed from the unrounded $64,376; the banner beside it
  carried the same wage rounded to a different place. Every annual figure is now stated to
  the nearest hundred, so the page's own subtraction lands: **$71,000 − $64,400 = $6,600**,
  and the offer band prints that line. The San Francisco equivalent moves with it, from
  $81,000 to **$81,400** (81,437 exact). No underlying number changed; the rounding did.
  Guarded by `rw-wedge-closes`, which fails if the two printed annuals stop reconciling to
  the printed wedge, and by `rw-offer-arithmetic` on each figure separately.

- **2026-08-27** — the closer previously said the industry's biggest employers sit
  where the same salary "buys a quarter less." No metro in the set reaches a quarter:
  the maximum anywhere is San Francisco at 21 percent, and among the five biggest
  employers it is Los Angeles at about 19 percent. Corrected to "up to a fifth less"
  and guarded by `rw-fifth-less`. The old closer also framed the salary argument
  against Chicago as flipping outright; it does not (Chicago stays ahead on averages,
  by $390 a week in buying power instead of $527 on paper). The corrected closer names
  the metros where the flip is outright (New York, Los Angeles, Seattle; 14 in all,
  guarded by `rw-flips-outright`).

## Reporting to add (drafted interview ask — human scale is at rung 3 until then)

The page's human-scale beat is a translated vignette (the $64,000 / $71,000 offer
arithmetic). One reported voice would move it to rung 1. The ask, ready to send:

- **Who:** an HR lead or hiring manager at a PIC member firm that recruits degreed
  engineers against coastal or Chicago offers (via PIC staff; two or three member firms
  large enough to lose candidates to metro rivals).
- **Three questions:** (1) In the last year, did you lose a finalist to a higher
  offer from Chicago, Boston or a coastal metro — and what was the gap? (2) Have you
  ever won one back by arguing what the salary buys here, and what did you show them?
  (3) What number do candidates actually compare — the salary, the rent, or something
  else?
- **Where it slots in:** one paragraph between the slope chart and the counterweight
  band, replacing nothing; the quote illustrates the mechanism, the chart stays the
  evidence.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/realwage/
node ../tools/bundle.mjs realwage       # → ../dist/realwage.html
```
