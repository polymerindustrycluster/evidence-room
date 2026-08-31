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
claims.json        26 assertions, one per published number
```

**Two measures, two questions.** This page publishes two Census numbers for the same
industry over the same span and they disagree in sign: the flow ledger nets **+168**, the
headcount falls **719**. Both are right. Hires and separations are events counted through a
quarter; `Emp` is a headcount on one day at the start of it; the two are estimated and
seasonally adjusted separately and are not built to reconcile. **The headcount is the one
that answers whether employment grew.** Say so wherever the two appear together, and never
restate +168 as a jobs gain.

## The argument, beat by beat

1. **The flow.** 111,529 hires and 111,361 separations for a +168 flow ledger. Diverging
   bars around a shared zero, net drawn as a line in the same unit. **The axis is signed:**
   starts are positive, ends are negative, so the net line is the two bar heights added.
   Unsigned it read 4,000 / 2,000 / 0 / 2,000 / 4,000 and could not distinguish an outflow
   from a loss. Do not restore an unsigned mirror while the net series crosses zero
   (`churn-net-crosses-zero`).
2. **The rate.** The trailing four-quarter average ends at 9.6% against 8.5% in 2012, and it
   has sat above the 2012 level in 51 of the 52 quarters it covers.
3. **Which side moved** (the payoff). The separation rate is up about 1.9 points; the hire
   rate about 0.2. On a four-quarter average, leaving has run ahead of hiring in all eleven
   quarters since 2023Q1. Drawn as a derived spread around zero, not as a second pair of
   lines, so it cannot read as a repeat of beat 2.
4. **By county.** Rate against employment, twelve dots. Wide: all twelve named. Narrow:
   only Trumbull, Mahoning and Summit, plus whatever county is selected, because twelve
   names collide at 375px. Trumbull runs 13.5% on 402
   jobs (434 job events); Summit runs 8.2% on 4,019 (2,644 events, about 6.1 times as many).
5. **On a shop floor.** 10.8% at a 150-person plant is about sixteen starts and sixteen
   departures a quarter, five of each in a month, 65 replacement hires a year. The headcount
   input recomputes the same arithmetic for any payroll; the default state is guarded.

## Where the sentences live

Claim-carrying text is STATIC in `index.html` and the script that used to write it is gone,
so there is exactly one copy of each sentence and the page still says what it found with
JavaScript off: hero stat row, all four figure titles, the split and shop-floor ledes, the
closer. `app.js` fills only what is genuinely computed or per-rendering — the county
verdict, the payroll translator, the figure subtitles, source lines and the note box.
`claims.json` is what stops those static strings drifting from the data.

Every scale on this page except the flow chart's is a CONSTRUCTED unit (a share, a gap in
percentage points), so each of those axis titles carries direction and each reference line
is labeled by what crossing it means, never by its value alone. The arithmetic that builds
the unit lives in the source line, not the axis and not the lede: `ratesrc` holds the churn
formula, `splitsrc` holds the subtraction. Do not move a formula back up into a caption.
The narrow reference labels are end-anchored at the plot edge, so their character count is
what keeps them off the dots; lengthening one is a layout change, and `collide.mjs` is the
check.

Band 1 carries TWO figure titles and two subtitles, one per rendering, swapped by
`.only-wide` / `.only-narrow`: below 760px the chart draws calendar years, so a title
counting quarters would name marks the reader cannot see.

## Read before quoting anything from this page

- 2025Q4 is dropped, not drawn as zero. QWI has not published it.
- QWI counts jobs, not people. A person moving between two plants in the same county appears
  as one separation and one hire, so churn includes movement *within* the cluster.
- Every published quarter carries all twelve counties, so no bar on this page is a floor.
  The `counties` field on each row is the check.
- The flow-derived net (+168) is not the change in the employment stock, which reads 18,444
  in 2012Q1 against 17,725 in 2025Q3. The seasonally adjusted stock and the seasonally
  adjusted flows are estimated separately and do not add up to one another. Aligning the
  flows to the 54 quarters those two stock readings bracket does not close the gap: the
  ledger goes to +376, further from the stock, not nearer. Quarter by quarter the two point
  opposite ways in 8 of 54 comparisons. **Which one answers "did employment grow": the
  headcount.**
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

- **2026-08-29.** Three, all in the repo-root `CORRECTIONS.md`. (1) The page published a
  flow ledger and a headcount that disagree in sign and never said which question each
  answered; a reader finished it unsure whether jobs had grown. Both numbers stand. The
  standfirst, the `+168` hero card, the flow table's column heads, a new note under that
  table, the source line, the methodology and the closer now all say the headcount is the
  growth answer. (2) The flow chart's axis carried no minus sign below zero while the net
  line was drawn on it; ends are now plotted negative. (3) The span was stated as
  "14 years" for 55 quarters (13.75); everything counts quarters now.
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
