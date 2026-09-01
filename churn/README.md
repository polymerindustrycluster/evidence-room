# The Churn Engine

**Is this workforce stable, or only flat?**

Source: Census Quarterly Workforce Indicators, **not** seasonally adjusted, NAICS 326,
2012Q1–2025Q3, the twelve PIC-12 counties summed. The API path `timeseries/qwi/sa` is the
sex-by-age table, not seasonal adjustment; adjustment is the separate `seasonadj` parameter
and its default is `U`. Verified 2026-09-01 against the API: all 55 shipped quarters match
`seasonadj=U` exactly, and `seasonadj=S` returns HTTP 204 at this industry and geography.

**What a row is:** one (county, year, quarter) cell. `Emp` is a STOCK at quarter start; hires
and separations are FLOWS during the quarter, so they never share an axis with employment.

```
index.html         page shell
styles.css         page-local CSS: figure chrome, county selector, translator, mobile re-layout
app.js             charts, selector, translator, appended methods blocks
data/churn.json    THE DATA (8 KB). Edit the builder, not this.
data/bench.json    THE COMPARATOR + the age structure (16 KB). Same instrument, one
                   parameter changed. Own producer: fetch_qwi_bench.py → derive_churn_bench.py.
claims.json        39 assertions, one per published number. `data` is a MAP of two files
                   (`ch` = churn.json, `b` = bench.json), so asserts read D['ch'][...].
```

**Two measures, two questions.** This page publishes two Census numbers for the same
industry over the same span and they disagree in sign: the flow ledger nets **+168**, the
headcount falls **719**. Both are right. Hires and separations are events counted through a
quarter; `Emp` is a headcount on one day at the start of it; the Census publishes them as
separate estimates and they are not required to reconcile. **The headcount is the one
that answers whether employment grew.** Say so wherever the two appear together, and never
restate +168 as a jobs gain.

## The argument, beat by beat

0. **Compared with what** (added 2026-09-01, and it goes FIRST because the hero asks the
   magnitude question in the first ten seconds). Same measure, same industry code, same
   four quarters: Ohio and the five other states with the largest plastics-and-rubber
   payrolls, published whole, against the twelve counties summed. Three of the six churn
   faster than the region and three slower; the region runs below Ohio in all five windows
   tested. The answer to "is a tenth a lot" is no. The answer to "is the DIRECTION
   ordinary" is also no: separations run ahead of hires in all seven and the region's
   margin is the second-widest. Two panels because the two quantities differ by an order
   of magnitude and one axis would hide the second.
1. **The flow.** 111,529 hires and 111,361 separations for a +168 flow ledger. Diverging
   bars around a shared zero, net drawn as a line in the same unit. **The axis is signed:**
   starts are positive, ends are negative, so the net line is the two bar heights added.
   Unsigned it read 4,000 / 2,000 / 0 / 2,000 / 4,000 and could not distinguish an outflow
   from a loss. Do not restore an unsigned mirror while the net series crosses zero
   (`churn-net-crosses-zero`).
2. **The rate.** The trailing four-quarter average ends at 9.6% against 8.5% in 2012, and it
   has sat above the 2012 level in 51 of the 52 quarters it covers. It has also fallen in
   every one of the 13 quarters since its 2022Q2 peak of 16.7%, so the beat is "higher than
   2012 and easing", never "has not come back down" (`churn-easing-off-the-peak`).
3. **Which side moved** (the payoff). The separation rate is up about 1.9 points; the hire
   rate about 0.2. On a four-quarter average, leaving has run ahead of hiring in all eleven
   quarters since 2023Q1. Drawn as a derived spread around zero, not as a second pair of
   lines, so it cannot read as a repeat of beat 2.
4. **By county.** Rate against employment, twelve dots. Wide: all twelve named. Narrow:
   only Trumbull, Mahoning and Summit, plus whatever county is selected, because twelve
   names collide at 375px. Trumbull runs 13.5% on 402
   jobs (434 job events); Summit runs 8.2% on 4,019 (2,644 events, about 6.1 times as many).
4b. **Who is nearest the door** (added 2026-09-01). The eight QWI age bands for the same
   twelve counties. 55-and-older holds 28.3% of the jobs the Census discloses by age,
   between 27.7% and 30.0% of all of them, up from 21.6% in 2012 with brackets that do not
   overlap. The hire rate falls about tenfold from the 19-to-21 band to the 55-to-64
   band. The 14-to-18 band is NOT drawn (one job in a thousand, 11 of 48 possible county-quarter cells,
   74.7% hire rate): it is named in the figure subtitle and kept in the table. This beat is
   what licenses the two caveats the page needed, below.
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
  in 2012Q1 against 17,725 in 2025Q3. The Census publishes the headcount and the flows as
  separate estimates and they do not add up to one another. Aligning the
  flows to the 54 quarters those two stock readings bracket does not close the gap: the
  ledger goes to +376, further from the stock, not nearer. Quarter by quarter the two point
  opposite ways in 8 of 54 comparisons. **Which one answers "did employment grow": the
  headcount.**
- The outside benchmark is against **whole states**, and that is licensed by a measurement,
  not by assumption: summing every disclosed Ohio county for this industry in 2025Q2 gives
  a 10.4% hire rate against the 10.6% Ohio publishes as one unit, and the county sum
  falls SHORT of the state total rather than exceeding it. It does NOT license a comparison
  against a single county, where a cross-boundary move loses one of its two ends.
- **9.6% is not the rate on any particular kind of job.** Age bands inside it run from 33.6%
  a quarter to 4.8%, and QWI carries no occupation dimension at all, so this page cannot
  say which occupations churn. Do not quote 9.6% as an operator's turnover rate.
- **58 replacement hires a year is a PLANT'S burden, not regional training demand.** Most of
  it is refilled from inside the industry. Age accounts for about three of the 58 and about
  400 of the region's 6,626 annual hires, and that 400 is a FLOOR: industry exits need
  Census Job-to-Job Flows, a different product this page does not carry.
- **The retirement figure is an estimate, never a measurement.** It assumes the 55-to-64
  band is spread evenly over ten single-year cohorts. QWI records separations and cannot
  see retirement.

## What this page still owes

- **PAID 2026-09-01: the same-method outside comparator.** `churn-no-comparator` required
  that the moment a second series entered the pull, the page publish the comparison rather
  than say it had none. `fetch_qwi_bench.py` fetched it, the beat above publishes it, and
  that claim was retired and replaced by `churn-comparator`,
  `churn-comparator-persistence`, `churn-comparator-direction`, `churn-michigan-absent`
  and `churn-aggregation-check`.
- **A CROSS-INDUSTRY comparator, still owed.** The state comparison answers "is this region
  unusual for plastics and rubber". It does not answer "is plastics and rubber unusual for
  this region". That needs the identical series with `industry=00` and `industry=31-33` on
  the same twelve county FIPS, requesting `Emp,HirA,Sep`; `fetch_qwi_demand.py` already
  pulls `industry=00` but only `Emp,EarnBeg`.
- **Job-to-Job Flows, for the pipeline number.** Retirement is the only source of
  replacement demand this page can see. Industry exits need a different Census product, so
  the 400-a-year figure is a floor and the page says so where it is used.
- **The reason the ledger and the headcount part company.** Verified 2026-09-01 against the
  API and NOT publishable from this pull: inside every one of the 55 quarters the identity
  closes exactly, `Emp + HirA − Sep = EmpEnd`, with a largest residual of 5 jobs. The gap
  opens at the seams, where the next quarter's `Emp` does not resume from this quarter's
  `EmpEnd`; those 54 seams sum to about 1,089 jobs, which with the within-quarter residual
  is the whole distance between the ledger's +376 aligned net and the 719-job headcount
  fall. Saying so on the page needs `EmpEnd` in `fetch_rest.qwi()` and in `derive_rest.py`
  so a claim can guard it. Until then the page states the mismatch and not its cause.
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
python derive_rest.py               # data/churn.json
python fetch_qwi_bench.py           # the comparator + age pull. NEEDS CENSUS_API_KEY:
                                    # this API is NOT keyless and answers a missing key
                                    # with HTTP 200 and an HTML page. Refuses to write
                                    # unless it reproduces churn.json's own last four
                                    # quarters exactly.
python fetch_qwi_bench.py --check   # verify only, write nothing
python derive_churn_bench.py        # data/bench.json
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
