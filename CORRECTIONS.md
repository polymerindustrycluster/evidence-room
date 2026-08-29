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
