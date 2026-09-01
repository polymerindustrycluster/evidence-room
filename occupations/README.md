# The Occupations Inside Polymer Manufacturing

**Can the region staff, pay and replace the jobs that make it a polymer capital?** The
page answers in four beats, each carrying the last one's conclusion forward: the industry
is mostly floor work (the distinctive engineer/scientist share is 4.0%); the metros pay
that floor near the national rate but pay the degree occupations under it, in every metro;
the degree occupations are exactly the engineer and scientist jobs; and the local polymer
degree count ran 118–179 a year from 2014 through 2020, then 54, 62 and 63.

Sources: BLS Employment Projections National Employment Matrix (2024–34, industry 326000);
BLS Occupational Employment and Wage Statistics, May 2024, metropolitan and national files;
O*NET 30.3 (U.S. Department of Labor, CC BY 4.0); IPEDS completions by CIP via the Urban
Institute Education Data API, with 2020–2022 read from the NCES completions files instead
(see `_data/build/ipeds_mirror_fix.py`); BLS QCEW 2024 (one regional estimate); Ohio Department of Job
and Family Services 2022–2032 occupation projections (JobsOhio Northeast).

**What a row is:** one detailed occupation (six-digit SOC code) — its share of national
plastics-and-rubber employment, its annual median wage in each metro and nationally, its
reported education distribution and Job Zone; plus, for the degree occupations, one
(institution, program, award level) row of degrees conferred.

```
index.html          page shell (hero, five bands, closer, footer)
styles.css          page-local chrome: figure titles, occupation selector, stat band,
                    band tint, mobile re-layout override
app.js              five charts (desktop + mobile forms), selector, table twins
claims.json         26 assertions, all machine-checked against data/viz-data.json
data/viz-data.json  THE DATA (59 KB). Edit the builder, not this.
shots/              desktop.png, mobile.png
```

## Rebuild the data

```
cd ../_data/build
python fetch_occmix.py            # staffing pattern (already wired site-wide)
python fetch_oews.py              # metro wages — the occupation SET is defined here
python fetch_oews_national.py     # national wages, same set (reads oews.json)
python fetch_onet_education.py    # O*NET title, Job Zone, education (reads oews.json)
python fetch_ipeds_cip.py         # degrees by CIP (already wired site-wide)
python derive_occupations.py      # -> ../../occupations/data/viz-data.json
```

The occupation set lives in ONE place — the `SOC` dictionary in `fetch_oews.py`. The
national wage pull and the O*NET pull read it from `oews.json`, so the three files cannot
describe different lists. On 2026-08-18 the set was widened from 14 codes (the engineering,
science and technician occupations a polymer cluster is distinctive for) to 26, adding the
rest of the industry's fourteen largest occupations by national staffing share.

## Read before quoting anything from this page

- **The metros are never summed and never called PIC-12.** Akron, Cleveland, Canton-Massillon
  and Youngstown-Warren neither nest inside nor tile the twelve counties.
- **The wages are all-industry.** A metro's median for a chemist is across every industry that
  employs one, not what a plastics plant pays. The staffing shares are national.
- **The regional occupation counts are estimates** — national shares × the twelve counties'
  2024 industry employment — under a stated assumption. The sentence says so.
- **Withheld is withheld, never zero.** Tire builders are published for none of the four
  metros; the page says so rather than drawing a zero.
- **O*NET is not a requirement and not regional.** The education distribution is what surveyed
  workers report; the Job Zone is a national typical-entry rating; release 30.x reports the two
  lowest zones as one band. One SOC can hold several O*NET variants — the row says how it was
  joined.
- **Degrees are not hires.** The programs section counts people finishing, not staying.
- **The polymer-degree drop is three observed years (2021, 2022, 2023), broad across every
  polymer program, while the materials programs held their 2014–2020 range.** A CIP recoding (a
  program reclassified to a different six-digit code) would produce the same arithmetic
  without any real decline; the lede says so. Before treating the halving as a fact about
  people rather than about codes, confirm against the universities' own conferral counts
  (see the interview ask below).
- **The projected openings are a projection** — a modelled path with no confidence band, for
  the eighteen-county JobsOhio Northeast region, a superset of the footprint.
- **The occupation selector** highlights one SOC row across the mix, pay and education
  charts and recomposes one templated sentence. Claims guard the DEFAULT sentence and the
  data join; per-occupation variants recompose from the same guarded fields.
- **The page deliberately contains none of the words** career, pathway, kindergarten,
  retirement, K-12, roadmap, or map. It is a data page about occupations and wages; anything
  built on it for other audiences is a separate artifact with separate owners.

## Reporting that would elevate the page (drafted, not faked)

The human-scale beat currently rides on a translated vignette (the +$30 / −$16,200
paycheck pair, both from OEWS medians). One reporting call would upgrade it and one would
harden the pipeline finding:

1. **A hiring manager or plant HR lead at an Akron-metro molder** (any PIC member that
   posts molding-machine-setter openings). Three questions: What does a setter posting
   offer today, and how does that compare with the $41,260 metro median? How long does a
   setter opening stay unfilled? Do you compete for setters with non-polymer plants?
   Quote slots into the paycheck band, beside the +$30 card.
2. **The chairs of Akron's School of Polymer Science and CWRU's macromolecular
   program.** Three questions: Do your own conferral counts confirm the 2022–2023 drop the
   federal record shows? Was any program recoded to a different CIP code after 2021? What
   share of recent graduates take jobs inside the region? Quote slots into the pipeline
   band, beside the annual conferral chart.

The page ships at rung 3 (translated vignette) without these; it is not ship-blocked.

## Revision note, 2026-08-27

Editorial rebuild (skill-rebuild branch): re-sequenced into an argument (staffing → pay →
schooling → pipeline) with the organizing question in the dek; pay chart grouped into
labeled schooling bands with band ratios annotated on-chart; degree-pipeline decline
surfaced as a finding (previously a "Degrees, not hires." caveat note); occupation
selector added; paycheck vignette band added; guardrails de-duplicated to one statement
per binding layer; per-figure title/subtitle chrome added; per-form mobile re-layouts
replace the sideways-scroll fallback. No source data changed. Claims: 12 → 23. Removed
claim ids: none. Reworded claim texts (same assertions): occ-hero-one-in-nine (em-dash →
comma), occ-tire-builders, occ-beats-national, occ-degree-vs-floor, occ-programs,
occ-closer — each now names the sentence's new location. The former "The reading." note
under the pay chart moved onto the chart itself (band annotations) and into the lede; the
former "Degrees, not hires." note became the pipeline section's finding plus a source-line
clause.

Second pass, same branch, after reading the rendered screenshots:

- **The education chart now shades its top six rows** with the pay chart's band tint, so
  the degree group is one shape carried across two figures rather than a sentence asking
  the reader to re-read 26 labels. The figure subtitle says what the shading is; new claim
  `occ-edu-band-mirrors-pay` guards that the two bands hold the same six occupations and
  that every pay row still has an education row to keep the orders aligned (claims 22 → 23).
- **The methodology box's prose is normalised for house punctuation at render time**
  (`housePunct` in app.js). The `meta` strings are written by the shared builder and stored
  in the data file with em-dashes and straight quotes; the builder is not this page's to
  edit, so the page fixes the punctuation on the way to the reader, the same
  presentation-only move `tq()` already makes for the O*NET labels. Punctuation only, never
  a word: paired em-dashes become parentheses, a lone one becomes a colon, quotes become
  typographer's quotes. The same meta keys are passed through, so the shared classifier
  still sees every one of them.
- Still out of this page's reach: the shared chrome writes its own em-dashes ("Table view
  —", the corrections line) and `_data/SOURCES.json` writes straight quotes into the
  "Reproduce this" filter table. Both are shared-core surfaces; fixing them is a
  `_shared`/`_data` change, not a page change.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/occupations/
node tools/bundle.mjs occupations       # → dist/occupations.html
```

## Third pass, same branch: the inspection fix round

An independent visual reviewer read the rendered page at 1:1. What changed, and why:

- **The hero stack now follows the headline-stack rule.** The headline was a two-clause
  sentence that towered to six lines of display type at 1280; it is now its second clause
  alone, three lines. The "one job in nine" half moved into the first stat card, where the
  denominator is computed from the setters' share rather than typed (guarded by the
  extended `occ-hero-figures`). The kicker lost its source list, which the new byline
  carries, and now fits one line on a phone. The standfirst dropped its third and fourth
  facts to the bands that already carry them and renders four lines with one bold phrase.
  Hero height: 880px to 782px, stat row bottom at 800px.
- **A byline and a footer.** Genre furniture the page had neither of. The byline's month is
  read from `meta.fetched` so it cannot drift from the vintage it dates (`occ-byline`); the
  footer carries related reading, the interview ask, the O*NET licence and the org line.
- **The interview ask is now recorded on the page**, not only in this README. That is the
  human-scale escape hatch: the page ships at rung 3, and it says out loud that nobody at a
  plant was interviewed and what only they could answer.
- **Caveat ink is inside the budget.** Every figure now carries one source line and one
  limitation sentence (31, 37, 40, 35 and 26 words against a 45-word budget), one weight,
  no bold. The rest moved into each table twin's own note (`withNote` in app.js), which is
  where a reader who is reading the numbers will be. The O*NET CC BY 4.0 licence, which was
  the single largest block of apparatus ink on the page, renders once in the footer
  (`occ-onet-licence`).
- **The pipeline band's claim is drawn.** Its headline claims a time trend and its only
  figure was a 2021-2023 cross-section, with the decline carried in four lines of bracket
  text. There is now an annual chart, 2014 to 2023, polymer against materials, with a
  reference rule at half the 2014-2020 polymer mean: all three later years sit under it, which
  is the claim, drawn. The rule value is computed from the yearly sums, never typed
  (`occ-trend-half-rule`). The program bars keep only the group brackets.
- **The mix chart draws its title's benchmark.** "Outweighs every engineer and scientist
  combined" rested on a hero stat card; it is now a labelled reference rule at the summed
  4.0% share, which the largest bar visibly clears.
- **Second text rail closed.** The stat pair is capped at the measure; the chart legend
  keeps the figure width the column audit requires for it but pads its ink onto the text
  rail, so every text left edge on the page is 301px at 1280.
- **The closer is 61 words**, one two-line statement and one qualifying sentence, no bold.
- **Mobile**: axis captions are small caps at both breakpoints, and the wage plot repeats a
  dollar tick row under every group instead of once after 26 rows. Ticks that would not fit
  are dropped rather than clamped inward.

Claims 23 to 26 (`occ-trend-half-rule`, `occ-byline`, `occ-onet-licence`). No claim was
removed and no source data changed.

Still out of this page's reach, and now one item worse: `_data/SOURCES.json` line 189 says
the O*NET attribution is "printed in the education source line", which stopped being true
when the licence moved to the footer. That string renders in the "Reproduce this" block.
Fixing it is a `_data` change, not a page change.

## Fourth pass: the plain-reading round

Every number on this page was right and several of them could not be read. A constructed
unit is any figure that is not a plain count or a plain dollar amount, and this page had
five: the wage ratio (0.93x), the reverse employment share (95%), the summed
engineer-scientist rule (4.0%), the Job Zone rating, and the half-pace rule on the degree
trend. Each was printed as its arithmetic and left the reader to work out which direction
was which. What changed:

- **The wage ratio leads with its reading.** The band notes said "Akron pays these a median
  0.93x the nation"; they now say "Akron pays these 7% under the nation (0.93x)". The
  percentage is computed from the same field the ratio prints, by one `gap()` helper, so
  the two forms cannot drift; the division itself moved to the pay table note. The closer
  and the per-occupation verdict sentence follow the same order, plain first. On the phone
  the x form is the apparatus that goes: 375px holds the reading or the arithmetic, and
  the table twin carries every ratio to two places. Guards `occ-degree-vs-floor` and
  `occ-closer` now bound both forms.
- **The mix chart's second scale says which way it points.** The right-hand column was
  headed "share of the occupation that is in this industry" over values from 1% to 95%,
  with nothing to say whether 95% was a lot. It now reads "how much of this job is here,
  not anywhere else", and the lede reads one value out loud: tire builders at 95%, which
  is to say almost nobody builds a tire outside this industry (`occ-mix-most-specific`).
- **Reference lines are labelled by what crossing them means.** The 4.0% rule keeps its
  name and gains a second line, "five occupations outweigh them on their own", counted off
  the data. The degree trend's rule now reads "under this rule: less than half the
  2014-2020 pace, 71 a year" instead of stating the arithmetic that placed it.
- **The Job Zone column had no header at all.** It now carries "preparation, 1 low, 5
  high", and the prose definition gives the scale rather than only the concept.
- **Two readings that were missing entirely**: on the pay chart, that a metro's dot to the
  LEFT of the national diamond means the metro pays that job less; on the education chart,
  that the further the dark runs, the more schooling the job's own people say it takes.
- **Terms of art translated**: "cells" is gone from the reader-facing text (wages, or metro
  figures); the relative standard error is given as what it means for the number.

No source data changed and no claim was removed. Two guards gained assertions so they
still bound the sentences after the rewrite, and `occ-mix-most-specific` rounds half up,
as the browser does, because 94.5 is the value and 95% is what the page prints.

## Fifth pass: the scope round, and three corrections a reader found

A naive reader was given the rendered page and nothing else. They finished the hero
believing that 51% of America's molding-machine setters work in Northeast Ohio. Every
figure in that hero was correct. The frame was not, and the page's own correction ("the
staffing shares are national, not regional") sat 180 lines below the belief, where it
reached nobody who had already formed one.

**Scope is now furniture, not a caveat.** Two measures with two geographies run through
this page, so the page says which at every point a reader can enter it:

- the **eyebrow** is the scope split, above the headline: "Staffing: the whole country ·
  Pay and degrees: Northeast Ohio";
- the **headline** ends "anywhere in the country";
- the **standfirst** leads with the split and only then asks the region's question, so
  "the region" no longer primes the four national figures under it;
- a **scope strip** sits directly over the stat row it governs;
- all four **hero stat cards** carry a UNITED STATES stamp, because a strip states a rule
  and a stamp travels with the number;
- every **band kicker** carries its own geography, in ink for the national bands and in the
  metro accent for the regional ones;
- the **pay lede** names the change of scope in its first sentence;
- the **staffing chart** carries the scope on the canvas at both widths, so the figure
  survives being screenshotted out of the page.

This supersedes the fourth pass's column head. That pass gave the mix chart's second scale
a reading, "how much of this job is HERE, not anywhere else", where "here" meant this
INDUSTRY. On a page whose masthead names a regional organisation, "here" reads as Ohio, and
that column head is what cemented the misreading: it prints the same 51% the hero does. The
column now reads "US workers in this job: the share employed in this industry", and the word
"here" is gone from the chart at both widths and from the section kicker.

Nothing about this is machine-checkable from the data alone, so `occ-scope-split` guards
what is: that the staffing rows carry no geography, that the pay rows carry exactly four
metros, and that the region's estimated setters are under a twentieth of the national count
the hero prints, which is the size of the misreading.

**Three arithmetic corrections, all found by the same reader, all real:**

1. **The top-fourteen share was 59.4% and should have been 59.6%.** The fourteen job counts
   sum to 432,200 against the industry's 725,100, which is 59.6%. The printed 59.4% was the
   sum of fourteen shares each rounded to a tenth of a point, and the roundings run 0.2
   points net downward. The page now computes the share from the counts, the heading rounds
   that to 60%, and the table note prints both numbers with the reason they differ so a
   reader's own arithmetic closes either way round. `occ-fourteen-share` asserts the pair
   rather than either half. The data file's `mix_totals.top_n_share_pct` still carries 59.4
   and is no longer read by the page; correcting it is a `_data/build` change.
2. **Cleveland beats the nation in 11 occupations, not 10.** The stored tally is computed on
   each row's ratio rounded to two places, so first-line supervisors at $71,220 against
   $71,190 read as 1.00 and dropped out, while this page's own paycheck band celebrates a
   $30 lead in Akron as beating the nation. The lede sentence is now composed from the
   dollar medians (`#beats`), and the table note names the two cells that are level to the
   dollar and counts the leads under $100, because a tally is not a ranking.
   `occ-beats-national` recomputes the count and keeps a tripwire on the stored field.
3. **The chart was mis-sorted.** Industrial engineers (14,400 jobs) printed above cutting
   and press machine setters (14,600) because both round to 2.0% and the file breaks the tie
   on something the page does not show. Rows now sort by job count; `occ-mix-order` guards
   it.

**Four smaller reader findings, also real:**

- The first hero card ended on an unfinished sentence ("A concentration this high leaves one
  job to keep staffed"). It now finishes the thought and says what the concentration costs.
- "2 metro figures carry a survey error above 10%" sat beside a column that shows each
  occupation's WIDEST metro only, so exactly one of the two was visible. Both are now named
  with their values (materials scientists in Cleveland at 13.7% and in Akron at 11.2%), and
  the note says why one is not in the column. `occ-high-rse` names them too.
- The education table printed the database's own occupation title, so the row the rest of
  the page calls "Assemblers and fabricators" appeared as "Team Assemblers", and its
  most-reported level printed labels ("Post-Secondary Certificate", "Some College Courses")
  that match none of the four column heads above them. The page name now leads and names the
  database occupation only where the database files the work under a different code; the
  modal cell says which of the four columns holds the level it prints, mapped from the
  survey's own 1-to-12 numbering. `occ-edu-row-names` guards both.
- **RSE** was expanded only in the methodology box, forty screens below its first use as a
  table header. The header and hover now say "survey error" and the note expands it.

**Also:** the four teal steps could not carry "where the dark begins", which is the whole
reading of the education chart. The ramp is the validated sequential one and stays; the fix
is structural, a paper hairline at every segment join and a full-height ink notch at the one
join the claim turns on, drawn from the same bins the segments are. The Job Zone column head
and the table header now name the term and give its reading at the point of use, because a
reader reaches the chart before the paragraph that defines it, and `<dfn>` gets a dotted rule
so the defining instance looks like one.

The cold open improved from 1,668px to about 1,633px: the occupation selector and its
verdict moved below the staffing chart, which pays for the scope furniture and puts the
evidence earlier. `_data/coldopen.json` still records the old 1,668 debt and should be
tightened; that is a `_data` change.

Claims 26 to 32. No claim was removed; no source data changed.

## Sixth pass: the year the federal mirror never served

The degree panel was one year short and one year mis-dated, and no gate could see it
because every gate on this site asks whether the prose matches the data. Re-derived
against the NCES completions files themselves (`_data/build/fetch_ipeds_nces.py`, keyless,
`C2014_A` to `C2024_A`), the Urban Institute mirror this page reads turns out to have
filed its 2020, 2021 and 2022 labels one collection year late, and then to have caught up
at 2023 by skipping `C2023_A` outright. The check is not regional: US totals for CIP
14.3201 read 330, 330, 360, 325, 264 at mirror years 2019 to 2023 against NCES 330, 360,
325, 290, 264 at `C2020_A` to `C2024_A`. The 290 is in no year of the mirror.

The 2020 quarantine was the first symptom of this, correctly diagnosed as a duplicate and
wrongly assumed to end there. What changed on the page:

- the series is ten consecutive years again, 2014 to 2023, and 2020 carries 124 rather
  than a hole;
- the drop year is 2021, not 2022, and there are **three** years under the half-rule
  rather than two, running 54, 62, 63 — the last two rise off the low;
- the old-pace baseline is 2014–2020, and its average, range and half-rule (142, 118–179,
  71) are all unchanged, which is exactly why nothing caught this;
- the three-year window average is 59.7, not 80.4. Two things moved it: the window's first
  year was the wrong year, and 80.4 was the sum of thirteen rounded per-programme averages
  where the three years themselves average 80.3. The deriver now computes it from counts;
- the University of Akron's share of the region's polymer degrees is 62.0%, so the
  programs figure title says 62% where it said two-thirds.

`_data/build/ipeds_mirror_fix.py` carries the diagnosis, the correction table and a
`--check` that re-derives all of it from NCES and fails on drift. `mirror_fix_patch.py`
applies it to the shipped files, `derive_occupations.py` applies it at load, and
`quarantine_patch.py` now refuses to touch a corrected file. **Still uncorrected:** the
programs page draws a 1991–2023 national and Ohio series from the same mirror and carries
the same three mis-dated years and the same missing collection year.
