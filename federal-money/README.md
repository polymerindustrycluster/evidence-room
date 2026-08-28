# The Other Federal Money

**Is the Tech Hub award big?** Routine federal contracting already puts about $35 million
a year of polymer work into the twelve counties, so the $51.0M award is worth roughly a
year and a half of it. In FY2019 the routine flow alone was larger than the whole award.

Sources: USAspending.gov spending_by_category, place of performance, FY2019–FY2026.
Award figures cross-referenced from the funding map's own shipped file.

**What a row is:** one obligation total for a single fiscal year, category and industry code

```
index.html          page shell, headline, ledes, figure titles
styles.css          page-local CSS: figure chrome, award ladder, mobile re-layout
app.js              charts and interaction
claims.json         16 falsifiable assertions, re-run on every build
data/federal.json   THE DATA (13 KB). Edit the builder, not this.
data/techhub.json   DERIVED. Written by derive_techhub.py. Do not hand-edit.
derive_techhub.py   copies the EDA award across from funding-map/data/funding.json
shots/              desktop.png, mobile.png
```

## One dollar basis

Every chart on this page is in **2025 dollars**, using the `real` column that BLS CPI-U
annual averages produced upstream. Nominal survives in the tables, the source lines and
the hero detail rows, which is where a reader ties back to USAspending. The previous
version charted nominal bars under a real hero, so the hero read $98.2M and the bar under
it read $87.6M with nothing reconciling them.

## Rebuild the data

```
cd ../_data/build && python derive_rest.py      # federal.json
cd ../../federal-money && python3 derive_techhub.py   # techhub.json
```

`derive_techhub.py` fetches nothing. It reads `funding-map/data/funding.json`, which is
already in this repo and already verified against signed federal Notices of Award, and
re-aggregates the seven EDA implementation awards into the shape this page charts. Re-run
it after any change to the funding map's data.

## Read before quoting anything from this page

- The award line is a **competitive implementation grant**; the bars are **procurement
  obligations**. Different instruments, one unit of account. The comparison claimed is of
  order of magnitude, not of like for like.
- Place of performance is where work is reported, not where a company is headquartered.
- An obligation is not an outlay. It is money committed, which may be spent across years
  or de-obligated.
- FY2026 is partial. Its bar is hatched and tagged; the closed-year average ($36.6M) and
  the closed-year ratio (1.4 years) are printed beside the chart.
- Two scopes live in `federal.json` and are never summed: polymer-NAICS rows (charted) and
  all-industry county rows ($235.5B, context only).
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

Nothing that changes how a number should be read sits behind a disclosure. The disclosures
carry depth, not the disclosure itself.

## Known gaps

- **Recipient names behind the procurement peaks.** `spending_by_category` returns
  categories, not parties, so this page cannot say who holds FY2019's $51.6M peak. Closing it
  needs a second pull: USAspending `spending_by_award` (or the bulk award archive),
  filtered to place-of-performance county in the PIC-12, NAICS 325*/326*, FY2019–FY2026,
  keeping `recipient_name` and `awarding_agency`. Until then the human-scale beat runs on
  the award side, where the leads are named and public.
- **Reporting not done.** The piece ships at the named-public-instance rung. The interview
  ask, if a person picks it up: call Flexsys (the $10.1M 6PPD-alternative lead) and one
  procurement-side plant manager. Three questions. (1) Did the Tech Hub award change what
  you could attempt, against the federal work you already do? (2) How does a competitive
  grant sit differently on your books than a procurement obligation? (3) What does a year
  and a half of routine federal work look like from inside the plant? The quote slots into
  the third band, above the award ladder. Status: ready to ship at rung 2.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/federal-money/
node ../tools/bundle.mjs federal-money          # → ../dist/federal-money.html
```
