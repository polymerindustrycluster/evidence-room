# The Occupations Inside Polymer Manufacturing

**Can the region staff, pay and replace the jobs that make it a polymer capital?** The
page answers in four beats, each carrying the last one's conclusion forward: the industry
is mostly floor work (the distinctive engineer/scientist share is 4.0%); the metros pay
that floor near the national rate but pay the degree occupations under it, in every metro;
the degree occupations are exactly the engineer and scientist jobs; and the local polymer
degree count ran 118–179 a year from 2014 through 2021, then 54 and 63.

Sources: BLS Employment Projections National Employment Matrix (2024–34, industry 326000);
BLS Occupational Employment and Wage Statistics, May 2024, metropolitan and national files;
O*NET 30.3 (U.S. Department of Labor, CC BY 4.0); IPEDS completions by CIP via the Urban
Institute Education Data API; BLS QCEW 2024 (one regional estimate); Ohio Department of Job
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
- **The polymer-degree drop is two observed years (2022, 2023), broad across every polymer
  program, while the materials programs held their 2014–2021 range.** A CIP recoding (a
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
  reference rule at half the 2014-2021 polymer mean: both later years sit under it, which
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
  2014-2021 pace, 70 a year" instead of stating the arithmetic that placed it.
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
