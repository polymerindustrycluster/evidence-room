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

## Read before quoting anything from this page

- Series are in $/mcf, ¢/kWh and index points. They are rebased to 100 at 2019-01 so that ONE axis is honest. This page exists partly to avoid the dual-axis anti-pattern.
- An index shows movement from the base month only — a series that starts high and stays flat looks like one that is cheap and flat.
- The spread chart is a difference of two same-based indexes, which is legitimate. It is NOT a margin: labor, freight, energy and packaging are in neither index.
- The gray reference line is the resin maker's version of the same computation (resin manufacturing minus industrial chemicals) — the only same-method comparator the shipped data allow. No economy-wide (total manufacturing) comparator is drawn because no such input pair is in `data/`; the page says so under Limitations in the methodology box (`meta.scope`) rather than implying the polymer gap is unusual.
- The seat selector re-emphasizes and restates; it never recomputes. Claims guard the default state and the data ingredients of each per-seat sentence.
- "Above zero every month since August 2022" is true and thin. Three of those 48 months came in under a single point: August 2022 (+0.08, the crossing itself), September 2022 (+0.58) and May 2026 (+0.71). Quote the run without those three and you are quoting a stronger claim than the data make.

## Corrections

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
