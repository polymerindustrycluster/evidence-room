# The Churn Engine

**Is this workforce stable, or only flat?**

Source: Census Quarterly Workforce Indicators, seasonally adjusted, NAICS 326, 2012Q1–2025Q3,
the twelve PIC-12 counties summed.

**What a row is:** one (county, year, quarter) cell. `Emp` is a STOCK at quarter start; hires
and separations are FLOWS during the quarter, so they never share an axis with employment.

```
index.html         page shell
styles.css         page-local CSS: figure chrome, county selector, translator, mobile re-layout
app.js             charts, selector, translator, appended methods blocks
data/churn.json    THE DATA (8 KB). Edit the builder, not this.
claims.json        18 assertions, one per published number
```

## The argument, beat by beat

1. **The flow.** 111,529 hires and 111,361 separations for +168 net jobs. Diverging bars
   around a shared zero, net drawn as a line in the same unit.
2. **The rate.** The trailing four-quarter average ends at 9.6% against 8.5% in 2012, and it
   has sat above the 2012 level in 51 of the 52 quarters it covers.
3. **Which side moved** (the payoff). The separation rate is up about 1.9 points; the hire
   rate about 0.2. On a four-quarter average, leaving has run ahead of hiring in all eleven
   quarters since 2023Q1. Drawn as a derived spread around zero, not as a second pair of
   lines, so it cannot read as a repeat of beat 2.
4. **By county.** Rate against employment, twelve labeled dots. Trumbull runs 13.5% on 402
   jobs (434 job events); Summit runs 8.2% on 4,019 (2,644 events, about 6.1 times as many).
5. **On a shop floor.** 10.8% at a 150-person plant is about sixteen starts and sixteen
   departures a quarter, five of each in a month, 65 replacement hires a year. The headcount
   input recomputes the same arithmetic for any payroll; the default state is guarded.

## Read before quoting anything from this page

- 2025Q4 is dropped, not drawn as zero. QWI has not published it.
- QWI counts jobs, not people. A person moving between two plants in the same county appears
  as one separation and one hire, so churn includes movement *within* the cluster.
- Every published quarter carries all twelve counties, so no bar on this page is a floor.
  The `counties` field on each row is the check.
- The flow-derived net (+168) is not the change in the employment stock, which reads 18,444
  in 2012Q1 against 17,725 in 2025Q3. The seasonally adjusted stock and the seasonally
  adjusted flows are estimated separately and do not add up to one another.
- There is **no outside benchmark on this page**, and the reason is in the methodology box.
  The comparisons here are internal: the cluster against its own 2012, and the twelve
  counties against each other.

## What this page still owes

- **A same-method outside comparator.** The QWI fetch carries `HirA,Sep` for NAICS 326 only.
  The fair comparison needs the identical seasonally adjusted series with `industry=00` and
  `industry=31-33`, same twelve Ohio county FIPS, same quarters, requesting `Emp,HirA,Sep`.
  `fetch_qwi_demand.py` already pulls `industry=00`, but only `Emp,EarnBeg`.
- **A revision magnitude.** Nothing here measures how far past QWI revisions moved these
  quarters; that needs archived vintages. Until then the 1.1-point rise is reported as an
  estimate and the caveat sits beside the chart it affects.
- **A dateline.** `data/churn.json` has no `meta.fetched`, so `PV.methodology()` stamps no
  "Data as of" date on the masthead. Re-running the fetch fills it.
- **One reported voice.** The human-scale beat ships at rung 3 (a translated vignette). The
  interview ask, if reporting happens: call a PIC member plant's HR lead in Portage or
  Summit; ask (1) how many hires they made last year against headcount, (2) how many of
  those were backfills for people who left inside twelve months, (3) what a 10% quarter
  costs them in overtime and scrap. The quote slots into the "On a shop floor" beat, ahead
  of the translator.

## Corrections

- **2026-08-28.** `meta.note` in `data/churn.json` said `counties_counted says how many of 14
  are in each sum` on a page whose footprint is PIC-12 and whose field is named `counties`.
  It was published in the methodology box as a limitation. Corrected to name the twelve and
  the real field. The derivation script named in the rebuild command below is missing from
  `_data/build/`, so this is a hand correction to the derived file and has to be re-applied
  if the derivation is restored.

## Rebuild the data

```
cd ../_data/build
python derive_rest.py          # NOTE: absent from _data/build as of 2026-08-28
```

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/churn/
node ../tools/bundle.mjs churn          # → ../dist/churn.html
node ../tools/verify.mjs churn && node ../tools/collide.mjs churn
python ../_data/build/verify_claims.py churn
node ../tools/columns.mjs churn && node ../tools/centres.mjs ..
node ../tools/textsize.mjs --mobile churn
```
