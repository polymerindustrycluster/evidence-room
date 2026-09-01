# The Other Federal Money

**Is the Tech Hub award big?** Routine federal contracting already puts about $35 million
a year of polymer work into the twelve counties, so the $51.0M award is worth roughly a
year and a half of it. In FY2019 the routine flow alone was larger than the whole award.

Sources: USAspending.gov spending_by_category (yearly flow) and spending_by_award
(the who-gets-it register), place of performance, FY2019–FY2026. Award figures
cross-referenced from the funding map's own shipped file.

**What a row is:** in federal.json, one obligation total for a single fiscal year,
category and industry code. In awards.json, one prime contract award, whose amount is
the award's WHOLE LIFE — a different basis, never summed with the first (see below).

```
index.html          page shell, headline, ledes, figure titles
styles.css          page-local CSS: figure chrome, award ladder, mobile re-layout
app.js              charts and interaction
claims.json         28 falsifiable assertions, re-run on every build
data/federal.json   THE DATA (13 KB). Edit the builder, not this.
data/techhub.json   DERIVED. Written by derive_techhub.py. Do not hand-edit.
data/awards.json    DERIVED. Written by _data/build/derive_fed_awards.py from the raw
                    spending_by_award pull. Recipients, the $500k+ register, per-code
                    and per-agency totals. Do not hand-edit.
derive_techhub.py   copies the EDA award across from funding-map/data/funding.json
shots/              desktop.png, mobile.png
```

## One dollar basis

Every chart drawn from `federal.json` is in **2025 dollars**, using the `real` column
that BLS CPI-U annual averages produced upstream. The one exception is the award
register's company chart, which is in the dollars each award was signed in and says so
on its axis: a whole-life award total spans years by construction, so a single-year CPI
restatement is undefined on that basis, and mislabelling it as 2025 dollars would be
the exact defect the rest of this section describes. Nominal survives in the tables, the source lines and
the hero detail rows, which is where a reader ties back to USAspending. The previous
version charted nominal bars under a real hero, so the hero read $98.2M and the bar under
it read $87.6M with nothing reconciling them.

Real and nominal are the page's most-used constructed unit, so they are translated rather
than named: the Band 1 `.deffn` block defines "in 2025 dollars" and "as awarded" in plain
words, and the hero row pairs "in 2025 dollars" with "in the dollars of the day" one card
across so the contrast lands on the first screen. Later references use the technical
phrase alone, which is what a numerate reader wants and what ties back to the source.
The hero detail line wraps past about thirty characters; keep replacements shorter.

## Rebuild the data

```
cd ../_data/build && python derive_rest.py      # federal.json
cd ../../federal-money && python3 derive_techhub.py   # techhub.json
cd ../_data/build && python3 fetch_fed_awards.py && python3 derive_fed_awards.py
                                                # awards.json (keyless; ~70 API pages)
```

`fetch_fed_awards.py` walks USAspending's spending_by_award pagination to exhaustion
(6,630 rows over 67 pages at first fetch) and refuses to write a pull under the
4,000-row probe floor: a truncated register would silently mean something else. The
raw pull is not committed; the derive reconciles every view back to the one total
before writing.

`derive_techhub.py` fetches nothing. It reads `funding-map/data/funding.json`, which is
already in this repo and already verified against signed federal Notices of Award, and
re-aggregates the seven EDA implementation awards into the shape this page charts. Re-run
it after any change to the funding map's data.

## Read before quoting anything from this page

- The award line is a **competitive implementation grant**; the bars are **procurement
  obligations**. Different instruments, one unit of account. The comparison claimed is of
  order of magnitude, not of like for like. The award is charted **as awarded** while the
  bars are in 2025 dollars; Band 1's `.deffn` prints the restated award ($51.3M) and shows
  the ratio does not move, guarded by `fed-award-basis`.
- **Rounding does not close, and the page says so in all three places it shows.** Every
  `$X.XM` is rounded to the nearest $0.1M, so rounded figures do not always add or subtract
  to the totals printed beside them: the two gaps to the award line ($647k over, $245k
  under, against labels that subtract to $200k), the seven award amounts (exactly
  $51,001,413, printed as seven figures adding to $51.1M), and the eight industry bar
  labels ($279.2M against a $279.3M total, with two codes both printing $23.5M).
  `fed-2019-clears`, `fed-award-total` and `fed-label-rounding` each fail if one of those
  reconciliations goes stale. A reader who checks and finds a gap stops trusting the rest
  of the page, so a rounding step is stated, never left to be discovered.
- Place of performance is where work is reported, not where a company is headquartered.
- An obligation is not an outlay. It is money committed, which may be spent across years
  or de-obligated.
- FY2026 is partial. Its bar is hatched and tagged; the closed-year average ($36.6M) and
  the closed-year ratio (1.4 years) are printed beside the chart.
- Two scopes live in `federal.json` and are never summed: polymer-NAICS rows (charted) and
  all-industry county rows ($235.5B, context only).
- **The award register is a THIRD basis, and it is never summed with either.** An award's
  amount in `awards.json` counts the award's whole life: a contract running since 2014
  that the FY2019–FY2026 window touches carries every dollar since 2014, in the dollars
  of the day. That is why the register totals $329.5M while the category rows sum to
  $248.8M as awarded — same ledger, different windows. The `fed-award-basis-never-summed`
  claim fails if either surface stops labelling its basis.
- University and research awards are invisible to the NAICS view by construction. The NSF
  NEO-SMART Engine ($14,999,983) appears in no bar.
- The footprint is PIC-12. The wider fourteen-county reading the vault calls NEO-14 adds
  Crawford, Huron, Richland and Tuscarawas; the banner on the page states the difference in
  reader words and names this file for the registry detail.

## Where the apparatus lives

Caveat ink beside a figure is capped at a source line plus one limitation sentence. The
rest is not deleted, it is relocated, and this is the map:

| What | Where it renders |
|---|---|
| Source, period, dollar basis, partial-year warning | the `.src` line under each figure |
| Nominal totals, closed-year basis, award-line provenance, scope | inside that figure's own table-view disclosure (`.tnote`) |
| What the NAICS filter cannot see; the all-industry county scope | Band 2 editorial prose, in body register, static HTML |
| Place of performance as a reported field | the page's single `.note` callout, in Band 1 |
| Fetch scripts, endpoints, filters, `derive_techhub.py` | the generated "Reproduce this" disclosure, and this file |
| Plain-language reading of every constructed unit | the reference-line label, the axis title, and the `.deffn` block in Band 1 |

Nothing that changes how a number should be read sits behind a disclosure. The disclosures
carry depth, not the disclosure itself.

## Known gaps

- **Recipient names: CLOSED (2026-08-31).** The gap this section used to carry — the
  category endpoint returns no parties — is closed by the `spending_by_award` pull and
  the register band it feeds: 6,630 contracts, 193 named companies, 92% Department of
  Defense. What the award view still cannot do is allocate a single fiscal year:
  an award's total spans its life, so "who holds FY2019's $51.6M" remains unanswerable
  from public files at this granularity, and the page now says exactly that where it
  used to say nothing could be named at all.
- **Reporting not done.** The piece ships at the named-public-instance rung. The interview
  ask, if a person picks it up: call Flexsys (the $10.1M 6PPD-alternative lead) and one
  procurement-side firm — RFD Beaufort, whose escape suits and life rafts are now named
  in the register band, is the natural first call. Three questions. (1) Did the Tech Hub
  award change what you could attempt, against the federal work you already do? (2) How
  does a competitive grant sit differently on your books than a procurement obligation?
  (3) What does a year and a half of routine federal work look like from inside the
  plant? The quote slots into the register band, above the award ladder. Status: ready
  to ship at rung 2.

## Revision, 31 August 2026 — the hero row moved to the basis the page argues for

- **The stat row printed the basis the page rejects.** In display type it read `$34.9M`
  and `1.5`, the eight-year mean and its ratio, while the H1, the standfirst, the figure
  title and the closer all printed `$36.6M` and `1.4`, and the closer said in as many
  words that an annual rate should not carry a year that has not finished. The first
  screen argued against the rest of the page in the largest numerals on it. The cards now
  lead with the closed-year basis; the eight-year one moved to their detail lines, so both
  bases still sit on the first screen and the one the page uses is the one it shows.
- **Two claim tolerances were looser than the number they guarded.** The closed-year mean
  is `$36,606,065.57` and `$43,934.43` more would print `$36.7M`; the eight-year mean is
  `$34,908,375.50` and `$41,624.50` more would print `$35.0M`. Both claims allowed
  `±$50,000`, so either print could have drifted with the gate green. Both are `±$40,000`
  now. `fed-annual-rate`'s own note claimed 50k was "tighter than the 50k that would
  flip" the print, which is not a sentence that can be true; it now states the arithmetic.
- **The exclude-the-largest check is now printed**, beside the concentration beat it
  follows from: drop the leftovers code from the seven finished years and the routine flow
  falls from `$36.6M` a year to `$25.0M` (the award becomes 2.0 years of what is left);
  drop tire manufacturing too and it is `$13.7M` and 3.7 years. Guarded by
  `fed-excl-top-codes`. The exclusions are sensitivity, not an alternative headline, and
  they run in the unflattering direction for a page arguing the award is about a year and
  a half of routine money.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/federal-money/
node ../tools/bundle.mjs federal-money          # → ../dist/federal-money.html
```
