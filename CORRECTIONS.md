# Corrections

Every published number that changes gets an entry here: what it said, what it says now, and
what caused the change. Entries are **appended, never rewritten** — an entry edited later is
no longer evidence of anything.

The bar for an entry is *a reader could have quoted the old version*, not *the change was
embarrassing*. Several pages also carry a correction block in the body where the error is
most likely to be re-made; those are the same events, described where they matter.

Newest first. Report an error by opening an issue — the **Data error** template asks for the
page, the figure, and what you think it should be.

---

## 2026-08-31 — three corrections, found by re-derivation

A companion pass re-derived the arithmetic behind every headline sentence, page by
page, and three published statements did not survive their own numbers.

**One verb carried two very different declines, *patents*.** The city band said the
inputs and outputs of invention "have both roughly halved, or are headed there."
Degrees have: 142 a year to 63 is a 56 percent fall. Ohio's polymer filings have
not: 455 to 342 is about a quarter. **Was:** both roughly halved. **Is:** degrees
more than halved; filings fell by about a quarter, each stated at its own size.
**Cause:** a sentence written for rhythm, not from the two series it summarized, and
no claim guarded the characterization. The guard now lives in `pat-degree-echo`.

**A source line implied a calibration that does not exist, *cluster-health*.** The
movement chart's source note said revision is "unmeasured for four of these five"
measures, implying one is measured. The page's own stat band prints zero for
"series here with a measured revision," and a claim guards that zero. **Was:**
unmeasured for four of five. **Is:** unmeasured for all five; the one measured
noise floor in this project belongs to the price series on the revisions page.
**Cause:** the sentence survived from a draft in which the price series sat on this
page.

**A standfirst contradicted the chart beneath it, *collaboration*.** It said the
joint-paper series "held near its high through 2021." The chart shows the peak at
29 papers in 2018, then 11 in 2019 and 16 in 2021 — a noisy fall, not a plateau,
and the page's own closer calls the series noisy. **Was:** held near its high
through 2021. **Is:** a 2018 peak, three uneven years, then three straight falls.
**Cause:** the standfirst was written from the finding's direction rather than the
series' shape; `col-thinning-is-real` now asserts the peak year, the peak value,
and each of the last three falls.

## 2026-08-30 — four corrections, and one this repository cannot make

Fifty-six independent reviews, four model families over every page, each reading only the
rendered page with no access to this repository. Four published statements changed.

**A chart described itself wrongly to the people who cannot see it, *federal-money*.** The
fiscal-year chart's text alternative said *"Two of the eight years are worth more than the
whole award on their own."* On the page's own real-dollar basis, 2019 exceeds the award by
$647,000 and 2021 falls $245,000 short. One year. The chart's two annotations, drawn beside
the award line, said exactly that and were correct. So a sighted reader and a screen-reader
user were handed different findings from one figure, and nothing on this site compared the
two. Now pinned by `fed-years-over-award`, and `tools/alttext.mjs` checks that every chart
carries a description at all.

**A source that was never used, *cost-scissors*.** The methodology box credited the BLS
Quarterly Census of Employment and Wages. That page is built from FRED price series and its
data and thirty-two claims contain no `agglvl`, no `own_code`, no NAICS and no employment
figure of any kind. The registry said so and the box printed the registry faithfully. This
is the second such case in one day, after *revisions* the same morning. Between them the
two entries made one federal source look like it fed eleven pages when it fed nine.
`tools/provenance.mjs` now asks the question no gate here had asked: does the registry match
the page, rather than only the page matching the registry.

**"Every" where the number was 95 percent, *revisions*.** The headline read *"Every month
moved"* directly above the page's own tile reading *259 of 273*. On a page whose entire
subject is counting precisely, its own headline rounded 95 percent up to all of them.

**A share stated on a basis the sentence did not name, *laborshed*.** The page said
*"Roughly half of it comes from metros two hours away"* where *it* was the whole imported
workforce. Half is right for the two named groups, adjacent and distant, and 29 percent is
right against the imported share as a whole. Neither figure was wrong. The basis was never
stated, and the largest single piece of that workforce lives in counties too scattered to
group at all, which is what the two readings differ by.

### The one this repository cannot correct

Six pages print a sentence describing the wider county footprint: *"Excludes Crawford,
Huron, Richland and Tuscarawas, which the vault's NEO-14 includes."* Every word is true and
the sentence is incomplete: NEO-14 also **drops Ashtabula and Trumbull**. A reader who adds
four counties to a twelve-county footprint gets sixteen, under a label that says fourteen.
Ten renderings across six pages, from one string.

The string lives in `_data/build/footprints.py`, which is a vendored copy of the `pic-geo`
package and carries an explicit rule that changes go to `pic-geo` first, where a test suite
asserts the two are identical. Editing it here would break that guarantee to fix a sentence.
It is recorded rather than fixed, and it is the correct order of operations even though it
leaves the defect on the site today.

---

## 2026-08-29 — the replication guide did not replicate, *sources*

Two outside reviewers were given the rendered page and the public internet, and asked to do
the one thing the page exists to make possible: rebuild the number it publishes. Neither
could. The first followed the recipe exactly and landed on 3.123 against a published 3.27.
Both are recorded here because the page is a set of instructions, and an instruction that
produces the wrong answer is a published error in the same way a wrong figure is.

### The stated rule did not produce the published number — *sources*, published

**Was:** recipe step 2 said to filter to `own_code` "5 for private ownership, or 0 for all
ownerships… Whichever you pick, use the same one for all four numbers in the next step: a
ratio whose numerator counts private employment and whose denominator counts every ownership
is not a location quotient, it is two different measures divided." Step 3 said the file's own
`lq_annual_avg_emplvl` column was "computed the same way against the national total, on the
same ownership as the row it sits in."

**Is:** ownership is not a choice on the numerator — in these files the industry rows exist
at `own_code` 5 and nowhere else, so there is no NAICS 326 row at `own_code` 0 to pick. The
denominator is `own_code` 0, the all-ownership total, and the mismatch is the bureau's own
definition rather than an error to be avoided. The page now prints both arithmetics from the
same six components: BLS's basis gives 3.2710, the same-ownership basis gives 3.1230, and the
gap is 4.5 percent. It also prints the reader's own check — the county file's all-industry
rows read 1.05, 0.88, 0.44 and 0.39 for private, local, state and federal ownership, and on a
same-ownership basis every one of those would be exactly 1.00 by construction.

**Cause:** the sentence was a plausible generalisation that nobody tested against the file.
The published 3.27 is BLS's own `lq_annual_avg_emplvl` column, carried through the pay page;
this site's independent recomputation of the same cell is 3.2710, and across 667 checked
cells the two never differ by more than 0.005. The two ship side by side on
*location-quotient* precisely so the computed one can be checked, and that pairing is what
settled which figure *sources* prints: the two round apart on 2 of 601 comparable cells, and
the printed figure follows the bureau's on all 601. Claims `src-lq-basis` and
`src-lq-provenance` now re-run both arithmetics and re-establish the provenance from shipped
data on every build.

### Three aggregation codes that return nothing — *sources*, published

**Was:** step 2 told a reader to "filter to the aggregation levels that carry industry detail
for your geography (`agglvl_code` 55, 57 and 58 for county by industry)."

**Is:** 55, 57 and 58 are the STATE 3-, 5- and 6-digit levels. A county area file contains
only 70 to 78, and the national file only 10 to 18, so those three codes return zero rows
from either file the same step tells a reader to download. The step now gives the county
ladder — 70 all-ownership total, 71 total by ownership, 74 sector, 75 three-digit, 76
four-digit, 78 six-digit — and the national one beside it.

**Cause:** the codes were real and belonged to a different geography. `fetch_provenance.py`
applies them to area 39000, which is the state of Ohio, for one instrument comparison, and
the registry recorded that correctly and in context. The recipe borrowed the values without
reading which geography they were for. **A machine check vouched for the wrong filter for as
long as it was published**, because it asserted only that the codes appeared somewhere in the
registry's filter values, which they did. That is this page's own trap — a filter that
returns nothing reading as a finding, and a green check standing over it — happening inside
the section that teaches it, and it took a reviewer with no access to this repository to
catch it. `src-codes-are-the-registry-codes` now pins the county levels to the county-file
sentence and requires the state levels to stay inside the state-pull entry; run against the
pre-fix registry values it returns False.

### A required licence attribution was missing, and the one that was present was
non-compliant — *sources*, published

**Was:** the register said "exactly one of the fourteen sources states a licence" and printed
one credit, for O*NET, set with `textContent`.

**Is:** two sources state a licence. IPEDS reaches this site through the Urban Institute's
Education Data Portal, and everything served through that portal is licensed to the user
under ODC-By 1.0, which requires attribution and a citation naming the portal version and the
access date; that credit was owed and is now printed. The O*NET credit was present and did
not meet its own licence on two counts: the mark must display the registered-trademark symbol
and the licence must be LINKED, and setting the line with `textContent` meant there was no
link to CC BY 4.0 anywhere on the page. Both credits now carry their licence name as an
anchor, and `derive_sources.py` fails the build if a source states a licence and carries no
attribution, or if the O*NET credit loses its trademark symbol.

**Cause:** the registry inferred a licence by searching each entry for the string "CC BY",
which cannot see a licence that is not a Creative Commons one. A licence the code had no way
to recognise was indistinguishable, on the page, from a source that publishes no licence at
all. The registry now reads an explicit `licence` field first. Separately, the federal series
carry TERMS rather than a licence — public domain, citation requested — and each entry now
quotes them with the agency page they come from, because "records no licence" invited a
reader to conclude no term was published.

### Endpoints that 404 as printed — *sources*, published

**Was:** the register printed the USAspending endpoint as
`https://api.usaspending.gov/api/v2/search/spending_by_category/` and the LODES technical
documentation as `LODESTechDoc8.2.pdf`.

**Is:** the USAspending stem 404s to GET and to POST alike; the working form is POST with a
JSON body to `.../spending_by_category/{category}/`, and the register now also records what
it had left out — that the 325/326 filter is applied client-side because `naics_codes` 422s,
and that the pull takes 100 results per fiscal year and does not page. The LODES entry now
points at `LODESTechDoc8.4.pdf`; version 8.2 has never existed in that directory.

**Cause:** both were transcribed rather than fetched. The register's entire promise is that
these are the endpoints a reader would have to hit, and neither had been hit as printed.

---

## 2026-08-29 — a hierarchy ranked and a total flattened, *location-quotient* and *funding-map*

One defect in two shapes, both found by a reader given nothing but the rendered page: a
nesting published as a flat list, and a sum published as a simpler thing than it is.

### "The strongest of six polymer industries" — *location-quotient*, published

**Was:** the hero drew six bars in one ranked strip, the standfirst read *the strongest of
six polymer industries*, the section H2 read *Paint leads all six polymer industries*, the
hero card read *strongest of the six*, and the trend annotation read *Paint has led all six
industries in every one of 11 years, always at least 2.1 times the second industry*.

**Is:** the strip draws three labelled blocks. The ranking is the first: the three codes the
page counts as the cluster, 3252, 3255 and 326, under the heading *The three industries
counted as the cluster*. Plastics products and rubber products are drawn hollow under
*Already counted inside plastics and rubber*, and chemical manufacturing under *Outside the
cluster, drawn for comparison*. The strip's reading line is *Paint leads the cluster at
5.96×*. The standfirst, the H2 and the hero card rank the three. The trend chart still draws
all six lines and its annotation now says what the picture shows, *Paint has run above every
other line in all 11 years, always at least 2.1 times the next line*, and the figure's
how-to-read line states the nesting before the reader traces a series. The figure title
compares paint against the second of the three, 2.32×, not against rubber products.

**Cause:** every number was right and the comparison between them did not exist. 3261 and
3262 are slices of 326, which the page's own register key says four screens down would count
the same jobs twice if added; 325 is declared context, not cluster. A reader who took the
strip as a ranking finished with the region's second industry being a slice of its third.
Membership is now read from the register in the data file rather than typed, so a
reclassification moves a bar between blocks instead of leaving a heading wrong, and claim
`lq-paint-beats-rubber` asserts the ranked set is the three core codes and that paint leads
it by more than double.

### "About four times further right than any other" — *location-quotient*, published

**Was:** the opening strip's text alternative, the only description a screen-reader user
gets of it, said *paint runs about four times further right than any other*.

**Is:** *about two and a half times the next bar in that ranking*.

**Cause:** an inherited number nobody had re-derived. Bars run from zero, so the comparison
is of lengths: paint at 5.96× against 2.32× for plastics and rubber products, the next bar
in the ranking, is **2.57**; against 2.44× for rubber products, the longest bar of any kind
on the strip, it is **2.44**. Neither is four. The figure is now computed at draw time and
the claim fails if the ratio leaves the band that rounds to "about two and a half".

### A point label printed above the wrong dot — *location-quotient*, published

**Was:** on the concentration-against-employment scatter, *Cuyahoga chemicals, 1.46× on
5,780 jobs* was set on one line, right-anchored, thirteen units above its own point. The
39-character string ran left across a third of the plot and closed on Summit's plastics and
rubber dot at 3.27×. A reader reported the label as floating beside a dot at about three and
a half, which is what it looked like.

**Is:** two shorter lines stacked directly over the point, *Cuyahoga chemicals* and *1.46×
on 5,780 jobs*. The nearest other mark is 46 units left of where those lines begin, so the
label stands in an empty column above its own dot.

**Cause:** the collision gate is a 3px overlap test and the label never overlapped anything;
proximity to the wrong mark is not something it can see. A first attempt lifted the long
line clear of the 3px floor and still printed the words directly above the wrong dot, which
is the lesson worth keeping: clearing a gate is not the same as being read correctly.

### "Three public awards, $106 million" — *funding-map*, published

**Was:** the H1 read *Three public awards, **$106 million**, and no two move the money the
same way*, and the standfirst's first line read *Governments awarded $85.3 million*. The
stat row led with $106.3M under the key *Public money in play* and set $85.3M, $21.0M and
$6.17M beside it with nothing saying how they related.

**Is:** the H1 prints the awarded money, **$85.3 million**. The standfirst's second sentence
does the arithmetic: partners and the state promised $21.0 million more beside it, and the
two added together are the $106.3 million the region reports as secured. Read in grid order
the stat row is that same addition: `$85.3M / AWARDED BY GOVERNMENT`, `$21.0M / PROMISED
BESIDE IT` with *promised, not awarded* under it, `$106.3M / THE TWO ADDED TOGETHER`, then
`$79.2M / ALREADY NAMES A RECIPIENT`.

**Cause:** no figure changed and no figure was wrong. $106,290,451 is $85,335,784 awarded
plus $20,954,667 of match and cost share, and the match is money others promised to put in,
not government money and not money spent. The page carried that arithmetic in a disclosure
under the register, four screens below the headline that depended on it, so a reader met the
contradiction first and the resolution last, and on a phone met four totals before any
explanation. $106.3M is still this page's total and still the figure the hub, the scorecard
and the accountability page carry for the quantity; what changed is which number arrives
first and whether its parts arrive with it.

### "BioVerde · $11.15M" against a row reading $11,122,386 — *funding-map*, published

**Was:** the recipient finder above the map listed *BioVerde · $11.15M* while the register
below printed **$11,122,386** against the same name. Nothing on the page said the finder
lists an organization and the register lists an award line.

**Is:** the finder option reads *BioVerde · $11.15M across two awards*, and the register lede
works the case through in generated prose: one row is one award line, not one organization;
six organizations hold more than one award; BioVerde is $11.15M in the finder and
$11,122,386 in its largest row, the difference being a $25,000 Synthe6 cohort award.

**Cause:** the $25,000 was a second, much smaller award, not a rounding difference or a
different vintage. $11,122,386 + $25,000 = $11,147,386, which is $11.15M at the page's hero
precision. The diagram had always drawn it, as a `+ $25K` rider on BioVerde's row; the
finder was the one surface that summed without saying so. Claim `bioverde-largest-eda` now
asserts the two-award structure, the total, and that BioVerde is the largest of the six
multi-award organizations, which is how the generated sentence picks its example.

### PIC and EDA were never expanded — *funding-map*, published

**Was:** neither acronym was written out anywhere on the page. *PIC* ran through the machine
cards, the legend and the program names; *EDA* titles the largest of the three awards.

**Is:** the machines band lede expands both before their first use: PIC is the Polymer
Industry Cluster, the body that publishes the page, and EDA is the U.S. Economic Development
Administration, the federal agency behind two of the three awards. Both halves are asserted
by `three-machines-shape` against `meta.publisher` and the agency field on each source.

**Cause:** an organization's own acronym is the one it never sees, because it uses it hourly.
The page whose argument is that this money can be traced by anyone did not say who "anyone"
would be tracing.

---

## 2026-08-29 — two right numbers and no way to tell them apart, *churn*

### A flow ledger read as a jobs gain — *churn*, published

**Was:** the headline read *The region recorded 111,529 hires to end up with **168 more job
starts than job ends***, the standfirst opened on the difference between a stock and a flow
without saying which the page was reporting, and the fact that the Census headcount fell by
719 over the same span arrived in grey type on a hero card and in a source line under the
chart. The flow table set a signed **Net** column beside an unlabelled **Jobs** column. The
band-one lede said the difference of the two flows *"is what a conventional employment chart
shows on its own."*

**Is:** the standfirst answers the question outright before anything else: *Are there more
jobs? No: the headcount fell by 719, to 17,725.* The hero card reads `+168 / NET FLOW, 55
QUARTERS / starts minus ends. Not a jobs gain: the headcount fell 719`. The table's columns
are **Net flow** and **Jobs at quarter start**, and a note directly beneath it names the two
instruments, says which question each answers, and says which one to quote when the question
is growth. The lede no longer equates the two. The closer says the headcount is the growth
answer and that it fell about 4%.

**Cause.** No number was wrong and no number moved. QWI counts hires and separations as
events during a quarter and counts `Emp` as a headcount on one day at the start of it; the
two are estimated separately, seasonally adjusted separately, and are not built to
reconcile. Across the series the ledger reads +168 and the headcount reads 719 fewer jobs,
and quarter by quarter the two point opposite ways in 8 of 54 comparisons, the widest at
2022Q4 (ledger 153 short, headcount up 299). A reader who met both finished unsure whether
employment had grown, which is the failure: the page published two answers to what looked
like one question and never said they were answers to two. Three checks now guard it:
`churn-flow-vs-stock-quarterly`, `churn-flow-aligned-to-stock` (the flows still net +376
when aligned to the 54 quarters the headcount readings bracket, so the gap is not an
end effect) and the existing `churn-stock-and-flow`.

### An axis that ran 4,000 / 2,000 / 0 / 2,000 / 4,000 — *churn*, published

**Was:** the flow chart drew hires up and separations down around a shared zero, with the
net change as a line **on that same axis**, and no tick below zero carried a sign. A point
155 units under the line meant "155 separations" if you were reading a bar and "minus 155"
if you were reading the line.

**Is:** ends are plotted as negative jobs, the ticks below zero carry a minus, the axis
title reads *Jobs per quarter: starts positive, ends negative, net is the two added*, and
the net line is now literally the two bar heights summed. The narrow rendering, which draws
years and no net line, is signed to the same convention. Guarded by
`churn-net-crosses-zero`, which fails if the net series stops crossing zero and the signed
axis stops being load-bearing.

**Cause.** A diverging chart of two positive magnitudes can be drawn unsigned. One that also
carries a signed series on the same scale cannot: the axis was being asked to mean two
things at once, and a reader could not tell a loss from an outflow.

### "14 years" for a 55-quarter series — *churn*, published

**Was:** the hero card read `NET FLOW, 14 YEARS`, and two ledes read "across all fourteen
years". Two strings in `app.js` said "the fourteen-year ledger" and "the fourteen-year
average".

**Is:** all of them count quarters. 2012Q1 to 2025Q3 is 55 quarters, which is 13.75 years,
and `churn-quarters` now asserts that division so the prose cannot drift back. The
`average churn, 2012 to 2025` card keeps its label, because 2012 to 2025 is fourteen
calendar years *touched*, which is a different claim and a true one.

**Cause.** A quarter count rounded up into a year count in the one place the page states its
own span. Nothing downstream used the wrong figure, but the card sat next to another card
reading "across 55 quarters" and a reader checked the arithmetic.

---

## 2026-08-29 — a hierarchy published as a flat list, *wages*

### "The typical polymer job pays 1.2 times" — *wages*, published

**Was:** the H1 read *The typical polymer job pays **1.2 times** what the average job in its
county pays*, and the hero card beside it read `1.21× / MEDIAN PREMIUM`.

**Is:** the H1 reads *The middle polymer pairing pays **1.2 times** what the average job in
its county pays*; the standfirst's first clause defines a pairing as one polymer industry in
one county; the card reads `1.21× / MEDIAN PREMIUM, OVER PAIRINGS`; and the card's detail
line carries the job-weighted figure, **1.26×**, computed from the same shipped file.

**Cause:** 1.21× is the median of 51 rows, and the heaviest rows sit below it — Cuyahoga
plastics and rubber is 0.87× on 2,037 jobs. A reader who took "job" literally believed a
claim the page never measured. The job-weighted median is computable: NAICS 325 and 326
taken once per county are disjoint and exhaustive over everything published here, and every
row carries employment, so the middle of 33,528 jobs can be walked out directly. It lands
**above** the pairing median, which is the only reason the pairing figure could stay in the
headline: the published number understates rather than flatters. Claim
`job-weighted-median` guards both the figure and the direction of the gap, and fails if the
job-weighted median ever drops to or below the pairing median.

### The Jobs column double-counted, and said so 400 lines later — *wages*, published

**Was:** the two table twins carried a plain `Jobs` column and no warning at the column. The
only statement of the overlap was in the methodology box, roughly 400 lines below the table:
*"one county can be counted twice."*

**Is:** the warning sits where the adding happens. The table caption — which is also the
`<summary>` a reader sees before opening the table — states that 23 of the 51 rows are the
groups 325 and 326, that the column sums to **54,372**, and that the six industries hold
**33,528** jobs counted once. The column header reads `Jobs (groups overlap, do not add)`.
Every row's industry cell says whether it is a group or a part of one. The chart tooltips
say "the whole group" or "counted again in this county's group row". The source line under
the chart states the nesting before the possible-pairings arithmetic rather than after it.

**Cause:** a reader summed the column to size the cluster and found the arithmetic himself:
Summit plastics 2,486 + rubber 1,338 = plastics and rubber 3,824, exactly. He was right on
the mechanism and wrong on the size — he guessed "roughly double", and the true factor is
**1.62**, because 326 is exactly 3261 + 3262 while 325 also holds chemistry the disclosure
threshold never splits out. Two related things were corrected with it: the page's existing
de-duplicated employment total, 26,402, is the finest-level SET's employment and is now
labelled as not the cluster's headcount, since keeping the finest row per county drops the
7,126 chemical-manufacturing jobs 325 holds beyond its published parts; and the methodology
now prints **24,030**, the total on the narrower 3252 + 3255 + 326 list, so that a reader
meeting two correct job totals for these twelve counties does not conclude one is wrong.
Claim `jobs-counted-once` guards every printed total, the group/part mix, the 326 = 3261 +
3262 identity the reader checked, and the condition the tooltip depends on: that no part row
is published in a county whose group is withheld.

## 2026-08-29 — the disbursement claim and a subtraction, *cluster-health*

### "Signed, none of it spent" — *cluster-health*, published

**Was:** the fourth hero figure read `$51.0M / SIGNED, NONE OF IT SPENT`, the Capital tile
said "None of it is disbursement: every figure here is money committed, not money spent",
and the closer said the cluster was "holding $51.0 million it has not spent".

**Is:** the hero figure reads `$51.0M / SIGNED, SEVEN NAMED RECIPIENTS`, and the page says
what the record holds and stops there: the money is signed for and assigned, and how much
has been paid out is a different quantity for which **no public record exists**. The
Capital tile's "Cannot see" row carries that in full, and the closer now says the awards
are ones "no public record follows to the ground". No disbursed amount appears anywhere on
the page, and that includes not stating a zero.

**Cause:** a reader finished the page believing PIC had spent nothing, and found the
*accountability* page two pages over describing the same stage as an empty box: the public
record shows award and execution, never drawdown, so a fully assigned award that has
disbursed nothing and a fully assigned award that has disbursed everything look identical.
The tile was stating as a measured fact a quantity the same repository describes as
unknowable. **Stating a zero is as much a claim as stating a number.**
`_data/FIGURES.json` registers `award_disbursed` as NOT PUBLICLY OBSERVABLE;
`tools/figures.mjs` was failing this page on exactly this sentence and now passes. Claim
`no-disbursed-amount-anywhere` guards the derived file the page renders from, so the
phrasing cannot come back through `derive_health.py` either.

### $39.0M minus $22.5M printed as $16.4M — *cluster-health*, published

**Was:** the Capital tile said "routine contracting rose to $39.0M in FY2025 from $22.5M,
73 percent higher" with "Contracting up $16.4M" beside it, and the driver strip printed
"$39.0M".

**Is:** "routine contracting rose to $38.98M in FY2025 from $22.54M, a rise of $16.44M and
73 percent higher", with "Contracting up $16.44M" and a driver strip reading "$38.98M ...
against $22.54M the year before". 38.98 minus 22.54 is 16.44.

**Cause:** a reader ran the only check the page gave them and it failed: 39.0 minus 22.5 is
16.5, not the 16.4 printed twice beside it. Both ends were correctly rounded from
$38,976,269 and $22,536,260, and the rounding is exactly what broke the subtraction. The
underlying figures have not changed. The precision is now chosen so that the arithmetic a
reader can do in their head closes, and claim `capital-move-subtracts` asserts it: if a
revision ever breaks the closure, the sentence has to be rewritten rather than re-rounded.

### Two job totals for 2025, neither labelled — *cluster-health*, published

**Was:** the hero read "24,030 / JOBS COUNTED IN 2025" while the standfirst two inches
below said the same three industries held "23,457 in 2025". Neither figure named its basis.

**Is:** both are printed, both are labelled, and neither has been changed. `24,030` is
every county figure BLS published for 2025, 24 of 36 cells, and it is a floor because a
withheld cell is not a zero. `23,457` is the **balanced panel**, the 21 cells published in
every year since 2015, and it is the only basis that supports the three-year run 25,281 to
24,259 to 23,457. The hero card, the standfirst and the Scale tile now each name the basis
they are on, and the tile prints the 573-job gap between them and says what it is.

**Cause:** a reader met two totals for one year and could not reconcile them, which is the
correct reaction to two unlabelled numbers. **A level and a trend need different bases**,
and neither figure is fixable into the other: the level counts everything published, the
trend holds the set of counties still so the bureau's disclosure decisions cannot read as
jobs appearing and vanishing. Claim `two-bases-for-the-same-year` holds both figures, both
cell counts and the requirement that each display string appears in the sentence that
names its basis.

### The dashboard could not say whether the cluster was doing well — *cluster-health*, published

**Was:** the page opened "How is the cluster doing?" and answered with one chart whose bar
length was *how unusual a move was* and whose colour was *rose or fell*. Nothing on the
page encoded better or worse. The longest bar on it, Distinctiveness at 5.05 times its
usual move, belonged to the one measure the page's own tile says "cuts both ways".

**Is:** the two questions are separated into two bands. A new standing chart, now the first
chart on the page, puts each measure on the range of its **own published years** — its
lowest at the left, its highest at the right — marks which end is the better one for the
region, and draws the one measure with no better end in grey. Every tile gains a "Where it
stands" and a "Better direction" row. The movement chart keeps its method unchanged, moves
below, and now opens "This chart grades nothing."

**Cause:** a reader asked the question the page asks in its own eyebrow and got a
volatility meter. No figure was wrong; the page was answering a different question from the
one it posed. **No target was invented to fix it** — PIC has set none, and a goal line or a
chosen peer set would have been a target by another name. The reference used is the only
one nobody had to choose. The page now also says plainly what that reference cannot do: a
range position is a comparison with a measure's own history, and Job quality sits at the
top of its range while paying below the national rate for the same work in all eleven years
of it. The five are not combined into a score, because a composite needs weights nobody has
set.

---

## 2026-08-29 — the NSF Engines figure, *timeline*

### The NSF NEO-SMART award amount — *timeline*, published

**Was:** the operating-record swimlane labelled the 14 July 2026 award
"NSF backs NEO-SMART with $160M", and `timeline/data/timeline.json` event E205 was titled
"NSF awards the CWRU-led NEO-SMART Engine $160M".

**Is:** "NSF awards the CWRU-led NEO-SMART Engine", with the amount carried as data on the
row rather than as prose in the title: $14,999,983 estimated total, of which $7,499,984
obligated for FY2026, from NSF award record 2532460 (api.nsf.gov awards.json, retrieved
2026-08-29). The award, the date and the awarder are unchanged.

**Cause:** a reader found the same award carrying two figures an order of magnitude apart —
$160M on *timeline*, and $15.0 million ($14,999,983) on *federal-money*. The $160M existed
in exactly one place in this repository: inside a typed event title, with no amount field,
no source and no note. The *federal-money* figure carries dollar-level precision and a
USAspending record. The two are plausibly the same award at two scopes, because NSF Engines
are commonly announced as a ten-year ceiling alongside a much smaller initial obligation —
but nothing here establishes that, so the page does not assert it, in either direction. The
unsourced figure was withdrawn, and then replaced by a sourced one: the NSF award record
gives an estimated total of $14,999,983, which agrees to the dollar with the USAspending
figure *federal-money* already carried, so the two pages now state one number from two
independent records. The program ceiling is still not printed anywhere on either page, in
either direction, because no source ties it to this award. See
[timeline/README.md](timeline/README.md).

### "Eleven years, nothing proven" — *timeline*, published

**Was:** the heritage strip drew a sixth block, 2013 to 2023, captioned "eleven years,
nothing proven", and the figure title read "The proven record runs 1898 to 2012, then goes
quiet until the designation".

**Is:** the block reports what the register covers inside it, and the page says no *new*
proven row after 2012 and nothing at all after 2016 — a seven-year silence.

**Cause:** a definitional bug, found by the same reader. The register's last era declared
itself 2000 to 2019 while the sixth block was a typed "2013-2023"; the two overlapped, so
any row dated 2013 to 2019 resolved to the era and the block could not be filled from data
whatever the register held. With the boundary corrected, the finding did not survive: two
rows run into that window, including the NSF CLiPS center awarded in 2006 and renewed to
2016. The silence is real but shorter, and is now stated at its real size. A finding that is
an artefact of its own bucketing is not a finding.

### The proven heritage count, 32 to 31 — *timeline*, published

**Was:** "32 proven events ... 19 that changed the region's capacity and 13 scientific
firsts."

**Is:** 31, 19 and 12.

**Cause:** two register rows carried one event in identical words — the Case macromolecular
department of January 1963, counted once as heritage and once as a discovery. The heritage
row is canonical (a department is capacity; the page's own rule is that a discovery is a
paper or a patent, never a product) and the discovery row is merged into it. A second,
partial overlap on the 1965 Kent institute was resolved by narrowing rather than deleting,
so no evidence was lost and the count moved by one, not two.

---

## 2026-08-17 — the pre-publication review

This repository was reviewed page by page before anything was published. Eleven pages
cleared and are here. Ten did not and are absent, for reasons ranging from confidential
source data to the defects below. The corrections that follow were found in that review; they
are recorded because the pages existed internally and their numbers had circulated, and
because a corrections log that starts empty on launch day is telling you nothing.

Four of these are on pages that are **not** in this repository. They are listed anyway. A
correction log that only admits errors on the work that survived review is a marketing
document.

### The share of national polymer degrees — *talent*, not published

**Was:** "Northeast Ohio's share of America's polymer degrees fell from about 18 percent in
2016 to about 10 percent in 2023."
**Is:** 35.9 percent in 2016 to 18.2 percent in 2023 — a fall of about half, over the same
period, at twice the level.

**Cause.** An earlier repair to a transposed classification code — `140320` was typed for
`14.3201`, and a code that does not exist returns no rows, which looks exactly like a real
program with no graduates — restored a second university's degrees to the numerator and moved
the entire series. The charts on the page updated, because charts read the data. The sentence
did not, because a human had typed it.

**Why no check caught it.** The claim's assertion tested that the last value was below three
quarters of the peak. That is true at 10 percent and true at 18 percent, so the assertion kept
passing while the sentence it was supposed to defend became false. The assertion now pins both
endpoints the sentence names. This is written up as a named limitation in
`_data/METHODS-SOP.md` §8, because it is the clearest evidence available that a passing gate is
not a correct page.

### Hires per year — *talent*, not published

**Was:** a heading reading "against ten thousand hires", with the chart beneath it drawing
8,111.
**Is:** 8,111 — roughly 8,100 where the text says "roughly". The heading and the lede are now
computed from the same constant the chart uses and cannot diverge from it again.

**Cause.** A rounded figure typed into a heading. It overstated by 23 percent, in the
direction that makes the argument louder, which is the direction that costs the most when
someone checks.

### The bound on the research collaboration count — *collaboration*, not published

**Was:** a summary card describing seven papers as those that "mention polymers — a keyword in
the text, not a subject code."
**Is:** those seven are papers *classified* in OpenAlex subfield 2507, Polymers and Plastics.

**Cause.** The card described a keyword search that had been replaced by a subject
classification. It was the inverse of the actual method, and it sat directly beneath a
paragraph stating the method correctly.

### "No new joint federal award since 2017" — *collaboration*, not published

**Was:** "no new joint federal award has started since 2017", unbounded.
**Is:** "within the window measured here, 2012 to 2024, no new joint federal award started
after 2017" — with the CWRU-led NEO-SMART NSF Engine (awarded 14 July 2026) named on the page
as falling outside the window.

**Cause.** A sentence written without the window its own data carries. The award data ends in
2024 and cannot speak to what came after it, so the arithmetic was never wrong — but the
sentence was refutable in one link, and by another page in the same project.

### The partner-direction summary — *reach*, not published

**Was:** "joins more than it leads with Michigan and Harvard."
**Is:** neither institution appears in that chart, in the table behind it, or anywhere in the
underlying data. The passage is now generated from the chart's own rows.

**Cause.** A sentence about a chart, written by hand, describing a chart that had changed.

### The published data source line — *reach*, not published

**Was:** the methodology box described the works as "matching 'polymer'".
**Is:** works in OpenAlex subfield 2507.

**Cause.** The pull filtered on the subfield; only the string describing it still named the
keyword — the same keyword bound the page's own methodology text explains was discarded for
sweeping in unrelated biomedical research. The pull was always right; its description was
not, which is the harder kind to notice, because nothing downstream disagrees with a string.

### Three affiliation-parser artifacts — *reach*, not published

**Was:** Shaker Heights Public Library appeared among the largest research partners with
seven papers led; two further public libraries appeared with one each.
**Is:** all three are quarantined, named, and their paper counts reported, alongside the one
artifact that had already been caught.

**Cause.** The exclusion list was hand-written and one entry long, so it caught the case
someone had already looked at and missed a case seven times larger. It is still a denylist
and still only catches what someone has noticed; that limitation is recorded in the script.

### The credit-concentration closer — *credit*, not published

**Was:** "strip out one tire company and this region's credit export looks like its
neighbors."
**Is:** the region's rate already sits inside the peer range with that company included, and
removing it moves the figure further from the state's own rate, not closer.

**Cause.** A closing line that asserted a dependence the page's own benchmark disproves two
sections above it, and then pointed the wrong way. The finding it was reaching for is real
and is now stated directly: a regional headline should not move ten points on one firm's
choice of filing address.

### Documents that render in standards mode

**Was:** every page in this project except two was served without a doctype, and so rendered
in quirks mode — laid out to the CSS box model, but measured against a much older one.
**Is:** all pages declare `<!DOCTYPE html>`, a language, and a viewport.

No published figure changed. It is here because it affected every page, it was invisible
precisely because the pages still looked correct, and someone reproducing this work should
know it was wrong for a long time.

### The routine federal contracting rate — *index*, 2026-08-29

**Was:** the hub's third hero card and its federal-money card put ordinary federal
contracting at **$34.9 million a year** over the eight fiscal years since 2019, and the
$51.0 million Tech Hub award at **about a year and a half** of it. The funding map card
repeated the $34.9 million.

**Is:** **$36.6 million a year** across the seven finished fiscal years, 2019 to 2025, and
the award at **about 1.4 years** of it. The basis is named wherever the figure appears, and
each card says that fiscal 2026 is still running and is not in the average.

**Cause.** The eight-year mean included fiscal 2026, which had run about seven months and
stood at $23.0 million. An annual rate may not include a year that has not finished: the
part-year pulls the mean down, which understates the routine flow and overstates how far
the one-time award reaches. The cluster-health dashboard had been computing the same
quantity on finished years only, so one site published one figure at two values and both
per-page gates passed, because each page was checked against its own data and nothing was
checked against the other page. `_data/FIGURES.json` `routine_federal_per_year` records the
adjudication; `hero-federal-annual` now asserts the finished-years basis and fails if the
all-years average is ever restored. The same registry entry lists `federal-money` as
printing this figure, and that page still prints the eight-year version; it was out of
scope for this change and is unresolved.

### Two concentrations a reader could not tell apart — *index*, 2026-08-29

**Was:** "Rubber products, the industry Akron is named for, run 2.44 times", beside a
dashboard sentence reading "Plastics and rubber, the industries the region is known for,
run 2.32 times".

**Is:** the card names both codes and prints both values in one sentence: rubber products
alone, NAICS 3262, at 2.44 times, and the wider plastics and rubber family that contains
it, NAICS 326, at 2.32 times.

**Cause.** No published figure was wrong. 3262 is a child of 326, so both numbers are right
and neither moved. What was wrong is that the two labels, "the industry Akron is named for"
against "the industries the region is known for", did not tell a reader the subjects were
different: two readers and one cross-page audit filed it as one figure at two values. A
figure whose correctness depends on a distinction the prose does not draw is a defect even
when the arithmetic holds.

### The hub advertised a claim count the page it points at had outgrown — *index*, 2026-08-29

**Was:** the cluster-health card carried a "23 claims" pill for a page that says on its own
face there are 27 of them, and the hub inventory sentence read "292 checked claims".

**Is:** the pill and the total are read from the pages themselves on every build, so both move with them.

**Cause.** `index/data/counts.json` is generated from every artifact's `claims.json`, and
the pills and the inventory sentence were already derived from it rather than typed. The
gap was that nothing checked the generated file against its own inputs: `index-counts-internal`
compared counts.json to itself, so a file that was never regenerated stayed internally
consistent and passed while every page in the tree grew past it. A derived number is only as
fresh as the last derivation, and a check that never reads the source cannot notice.
`index-counts-fresh` now reads all fifteen `claims.json` files directly and fails on any
disagreement; it was tested by restoring the stale value, which it caught.
