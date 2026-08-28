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
- **One year, one print.** Only the 2023 release ships with this page; the 14-place
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

- **2026-08-28** — apparatus discipline pass after a visual review. The pre-hero
  county-footprint banner is gone: it was the page's first text, sat above the headline,
  and rendered at x=0 with no container while every other block sat on the 301px rail.
  Its content now appears where a reader meets it — one sentence in band 1, the
  suppression clause in the slope source line, `meta.geography` in the methodology box.
  Both figure source lines were cut to the house budget (176 and 64 words → 38 and 37,
  zero bold); what they used to carry moved into each figure's existing table
  disclosure. The hero lede lost its second paragraph (the definitions moved to bands 1
  and 2) and now runs four rendered lines. Added: byline block, three-stage footer, and
  a drawn "2023 only, one print" cue under the +14 annotation on both slope layouts, so
  a reader who skips captions still sees the qualifier. `meta.row`, `meta.geography` and
  `meta.not` were rewritten in `derive_realwage.py` as reader sentences (they publish
  verbatim into figure chrome and the methodology box, where "METRO." and a lowercase
  "one metro:" read as broken sentences and "RPP" was an unglossed token).

## Corrections

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
