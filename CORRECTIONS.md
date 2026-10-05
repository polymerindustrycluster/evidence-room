# Corrections

Every published number that changes gets an entry here: what it said, what it says now, and
what caused the change. Entries are **appended, never rewritten** — an entry edited later is
no longer evidence of anything.

The bar for an entry is *a reader could have quoted the old version*, not *the change was
embarrassing*. Several pages also carry a correction block in the body where the error is
most likely to be re-made; those are the same events, described where they matter.

Newest first. Report an error by opening an issue — the **Data error** template asks for the
page, the figure, and what you think it should be.

## 2026-10-04 — Each story now says on the page what would prove it wrong, *every story the hub lists*

**Was:** the hub said each story "states what would contradict its claims", but those
conditions lived only in each page's claims file, written for the checker and read by no
one else. **Is:** the twenty stories the hub lists, the three prototypes included, carry one
line under the headline beginning "This finding breaks if:", and a closed "What would prove
this page wrong" list before the methodology box that pairs each guarded sentence with the
change in the data that would make it wrong. No figure changed; this is a presentation
change. `tools/breaksif.mjs` fails a listed story that lacks the line or the list, or whose
list quotes a sentence the page no longer prints.

## 2026-10-04 — One name per county set, one status vocabulary, and who PIC is, *index, chain, sources, peers*

**Chain's footprint, *chain, index, sources*.** **Was:** the chain register's fourteen
counties, the twelve PIC-12 counties plus Columbiana and Tuscarawas, were called NEO-14 in
chain's methods, on its hub card and in the hub's definitions, while NEO-14 is also the
name of the vault's different fourteen-county set (ten PIC-12 counties plus Crawford, Huron,
Richland and Tuscarawas). **Is:** the chain set is PIC-12+2, and NEO-14 names only the vault
set. Chain carries a dated entry; `chain-footprint-name` asserts the county set and its
rule, and `verify_consistency.py`'s neo14-name check fails any page text that puts NEO-14
on the chain set.

**The first question, *index*.** **Was:** "Where do we rank?", leading to a story whose first
sentence is about Ohio. **Is:** "Where does Ohio rank?". The peers page now lists the
twelve counties its regional figures add up.

**Story status, *every page*.** **Was:** the hub labelled the three prototypes "Prototype ·
not published data" and "Prototype · internal draft", and the two unlisted pages called
themselves "Internal working view" and "Unreviewed draft". **Is:** three statuses,
Published, Prototype and Internal, declared in each page's own data; prototype and internal
pages carry a banner at the top and in the footer, the hub explains the three words, the
sources page tags its links to internal pages, and chain counts toward county coverage on
the hub, marked as a prototype. `tools/disclosure.mjs` fails a page whose banner, flag or
card disagree with its declared status.

**Who PIC is, *index*.** Added under the deck: the Polymer Industry Cluster is an initiative
of the Greater Akron Chamber, and the room is written for people who run, fund or site
polymer operations in Northeast Ohio. `index-pic-line` binds the sentence. The link that
read "PIC public tools directory", and a line offering "tools to find help", now read
"Other PIC sites", beside direct links to PIC's main site and programs.

## 2026-10-04 — The metro table now holds every metro its chart plots, *peers*

**Was:** the table under the metro scatter held the 25 largest of the 155 disclosed metros
the chart plots, while the page footer said every chart has a table beneath it holding all
the numbers it is drawn from; Youngstown, 52nd, could be found with the search box and
nowhere in the table. **Is:** the table holds all 155, filterable and sortable, with a CSV
download of the same rows. No figure changed. The page carries a dated correction line, and
`tools/access.mjs` now fails any table view that declares a chart as its twin and does not
hold exactly that chart's plotted metros.

## 2026-10-04 — Evidence states, bases and labels the October reviews found unsaid, *funding-map, cluster-health, federal-money, timeline and five more*

Found by the three external reviews of 4 and 5 October 2026. One count changed (timeline);
every other figure is unchanged, and each page carries a dated note.

**What the funding map is built from, *funding-map, sources*.** **Was:** its "Reproduce
this" panel described the USAspending prime-contract pull, by fiscal year and NAICS 325*/326*,
with research grants excluded; no figure on the map comes from it. **Is:** the source
registry lists the signed EDA Notices of Award, the executed Ohio grant agreement
SBIG20251005 and the executed sub-grant agreements, each with what it contains, how the
figures were read from it and that it is held by PIC and not published, and the USAspending
award lookup is marked corroboration only. The source guide's register grows from 27 to 31
sources and from 156 to 172 filter lines. Its dependency chart's caption said the sources
drawn in orange have no endpoint and no script; orange marks no endpoint, and one of the six,
the company catalogue, has a script. The caption is now counted from the register. `tools/provenance.mjs` now fails that pairing: its
USAspending fingerprint had matched any page that says "award".

**Huntsman's $5,970,805, *funding-map, cluster-health*.** **Was:** the recipient panel, the
register row, the CSV export and the cluster-health Capital tile showed the amount and award
ID ED25HDQ0G0009 with no word on its evidence; only a disclosure in a collapsed section said
its execution is not verified. **Is:** each surface says the notice is signed and held, that
USAspending has no record of it, and that its execution is not verified; the CSV gains
Document, Public record and Execution columns. The amount stays in every total.
`huntsman-evidence-travels` and `capital-unverified-travels` assert it.

**The Ohio balance, *funding-map*.** **Was:** "The $6,165,608 difference is Ohio money
committed but not yet written into a sub-grant", naming the Bounce sub-grant in the same
sentence. **Is:** two parts at two stages: $2,642,108 of Translational R&D not yet
sub-granted, and $3,523,500 of startup support already in the 15 May 2025 sub-grant to
Bounce Innovation Hub, beyond the nine named cohort awards.

**"Polymer" on a broader total, *federal-money, index*.** **Was:** the headline, both chart
descriptions and both table captions called totals over all of NAICS 325 plus 326 polymer
obligations, or the region's polymer industry. **Is:** chemical, plastics and rubber
manufacturing. **The dashed line, *federal-money*.** **Was:** the eight-year $39.2 million
average, the unfinished FY2026 included, while the headline used the seven finished years.
**Is:** the line marks the seven-year $41.4 million; $39.2 million is named as a secondary
basis and not drawn. The note under the fiscal-year table said one row is one obligation total
for a single code; one row is a fiscal year summed across every code that recorded obligations,
24 to 31 a year.

**One count, *timeline, index*.** **Was:** a Wall Street Journal feature of 25 May 2026 was
counted as a delivered development and drawn in both charts, under a rule that holds press
coverage out of both. **Is:** it is held out: 67 developments since the designation become
66, the calendar's 68 becomes 67, press rows go from twelve to thirteen, and the pace ratio's
upper end is 16.5 times, not seventeen. The hub card reads 66.

**Figures without their basis, *churn, chain, reach, index*.** **Was:** churn's "2.2% of the
region's 17,943 plastics and rubber jobs" sat beside a 17,725 headcount; the hub's 566
records with a classified role never appeared on the chain page, whose chart counts 490;
reach and the hub printed 633 and 629 partners without saying which was which. **Is:**
17,943 is the four-quarter average to 2025Q3 and 17,725 the start of 2025Q3; 566 carry any
classified role and 490 one of the stage roles drawn, the other 76 only distribution,
logistics, construction, engineering or energy; 633 partners before four flagged
affiliation matches are set aside and 629 after.

**Smaller fixes.** *peers*: the Michelin headquarters citation pointed at a September 2024
anniversary blog post; it now points at Michelin North America's company profile. *atlas*:
the page now says it is a dated snapshot, built 21 August 2026 and patched 1 September 2026,
whose builder is not in this repository. *laborshed*: the byline spells out LEHD and LODES;
two debt entries in `_data/acronyms.json` had let the style gate pass them silently, and the
gate now prints every debt it honours and fails one a page no longer needs.

## 2026-10-04 — Footprint, concentration, link and tense fixes, *peers, churn, cluster-health, laborshed, federal-money, location-quotient, timeline, sources, front page*

No published figure changed.

**The footprint sentence, six pages.** **Was:** the footprint line and four hand-written
passages said the fourteen-county NEO-14 definition *adds* Crawford, Huron, Richland and
Tuscarawas, and laborshed called it “a wider line”. **Is:** each says NEO-14 adds those four
and leaves out Ashtabula and Trumbull, so the two share ten counties. **Cause:** one string
in the shared footprint definition named one side of the difference. It was changed in
`pic-geo` first, as version 1.0.1, and re-copied here, which settles the part of the
2026-08-30 entry headed “The one this repository cannot correct”. Dated notes on peers,
churn, cluster-health, laborshed, federal-money and location-quotient. The style gate now
fails any rendered sentence that names one side of the PIC-12 / NEO-14 difference without
the other.

**What concentration divides by, *peers*.** **Was:** the methods defined it as an industry's
share of an area's private jobs over its share of private jobs nationwide. **Is:** private
industry jobs over every job in the area, public and private, and the same nationally, which
is how the bureau computes the column the page prints. `test_peers_lq.py` rebuilds Akron's
4.69 on that basis.

**Links.** The sources page linked the IPEDS directory to an API pattern with a literal
`{year}`, which returns a server error; it now links the documentation. The front page's
correction-log link and the sources page's roadmap link opened raw Markdown; both now open
the rendered file. The style gate fails any link carrying a template or pointing at a
Markdown file in this repository.

**Tense, *federal-money* and *timeline*.** **Was:** “Fiscal 2026 is still running” and a
“still running” bar label, written of a year that ended on 30 September 2026; a “Today” line,
“The next three dates to check” and “dates ahead”, written of a record that stops on 13 August
2026.
**Is:** fiscal 2026 is described as partial when the data were retrieved on 8 September
2026, and the timeline's line and list are dated to the record's cut-off, with the outcome
of later dates stated as not checked. Both phrasings are withdrawn in the style gate.

## 2026-09-30 — The Chamber's wider figure, with the state grant's grantee, *accountability*

**Was:** band A and the closing line said the Greater Akron Chamber is named as destination
or grantee on $7.6 million ($7,633,558), and band A said no file here names the grantee of
the state grant. **Is:** $37.4 million ($37,384,043). PIC confirmed on 30 September 2026 that
the Chamber, of which PIC is an initiative, is the grantee of record on the $31,250,000 Ohio
Innovation Hub grant, SBIG20251005; the whole grant now replaces the $1,499,515
hub-administration line in that total. The $4,149,515 headline, which counts the lines
naming the Chamber as destination, is unchanged. The page, which is parked and unlisted,
carries a dated correction line; `acc-attribution-lines` asserts the new total and binds
both printed sites.

## 2026-09-30 — Two replication recipes that described a different computation

No published figure changed. Both errors were in instructions a reader would follow to
rebuild a figure, and following them gave a different answer from the site's.

**Which counties a location quotient divides by, *sources*.** **Was:** the replication
guide said a withheld county "drops out of the numerator and the denominator together",
that the ratio "is neither a floor nor a census", and that the direction of the error
cannot be signed. **Is:** the bureau withholds a county's industry cell, never its
all-industry total, so a withheld county leaves the numerator only and all twelve counties
stay in the denominator; the regional ratio is a floor that sags as disclosure thins. This
is what `derive_lq.py` has always computed. Following the old rule gave paint 7.47 times the
national share in 2025 (4,257 jobs over 1,357,804 in the seven reporting counties) where the
site publishes 5.96 (over 1,701,837 in all twelve). The location-quotient claim
`lq-paint-suppression` now asserts the all-twelve denominator for every composite with a
withheld county. The page carries a dated correction line.

**What one LODES row is, *sources*.** **Was:** the labour shed recipe said one row is a
"(home county, work county) count of JOBS". **Is:** one row is a pair of Census blocks,
fifteen-digit `h_geocode` and `w_geocode`, with `S000` jobs; the site keeps the first five
digits (the county FIPS code) at both ends and sums `S000` by home and work county over the
main and aux files, keeping pairs whose work county is in PIC-12, as `fetch_lodes.py` does.
The page carries a dated correction line.

## 2026-09-30 — Two cluster-health sentences the data did not support

**A direction typed instead of read, *cluster-health*.** **Was:** the jobs-and-workplaces
paragraph said that from 2019 to 2025 "establishments were unchanged at 365". **Is:**
"establishments rose from 364 to 365". The sentence now takes its direction word from the
two endpoints, and claim `workplaces-eleven-year-window-audit` pins the direction as well as
the endpoints.

**A figure rounded twice, *cluster-health*.** **Was:** the price-index stat card printed the
largest revision as 1.42 percent. **Is:** 1.41 percent, which the source gives (1.4146) and
the prose beside the card already said. `derive_health.py` rounded the revision to three
places (1.415) before the card rounded it to two. It now computes each month's revision
from its first and latest levels and stores six places; claim
`noise-floor-measured-only-for-prices` checks the printed strings. The page carries a dated
correction line.

## 2026-09-30 — A seat called the winner, a title that stopped short, and a grantee named

No figure changed.

**A win the price data cannot show, *cost-scissors*.** **Was:** the finished-products stat
card said this month is the dearest on record here, "the seller's win", and the seat
selector's finished-products reading began "the winning seat, on these two indexes". **Is:**
the card says only that this month is the dearest on record here, and the reading begins
"the seat still at its peak, on these two indexes". These are selling-price indexes, and the
2026-09-28 and earlier 2026-09-30 entries withdrew win, lose and squeeze framing on this page
for that reason. The page carries a dated correction line.

**A title that stopped short, *churn*.** **Was:** the flow chart's wide title said about two
thousand jobs start and about two thousand end every quarter, "and the net line stays on
the axis". **Is:** it adds "averaged over a year, it has sat just below it since 2023Q1".
Separations have run above hires on a four-quarter average in each of the eleven quarters
since 2023Q1, which the page reports two sections below; the title described the whole 55
quarters and left that run out. The claim churn-separations-ahead now names the title and
bounds "just below" at a tenth of the flows. The chart carries a dated correction line.

**A grantee named, *scorecard* and *timeline*.** **Was:** the scorecard's award chart called
its hatched part "money awarded to PIC", and its source line said match is "not awarded to
PIC", which read PIC as the holder of the $31.25 million Ohio Innovation Hub grant,
SBIG20251005; the timeline's 1 January 2025 event for that grant listed its organisations as
"GAC / PIC / ODOD". **Is:** the grant's grantee of record is the Greater Akron Chamber, of
which PIC is an initiative. The scorecard's hatched part is state-grant money and names the
Chamber as grantee; match is committed by partners, "not by the governments that made the
awards"; the timeline event reads "GAC / ODOD", as the grant's 2028 completion date already
did. The funding map's provenance line for the grant records the basis: confirmed by PIC,
30 September 2026. No document in this repository yet names the grantee. Both pages carry a
dated correction line. The scorecard is unlisted.

**Cause:** the cost-scissors words were missed by the earlier searches because each named a
different word; the churn title predates the since-2023Q1 claim; no file named the state
grant's grantee, and two sentences filled the gap with PIC. These wordings, and most of
those withdrawn in the 29 and 30 September entries, are now in `_data/withdrawn.json`, so
the style gate fails a page that prints one again outside a dated note or a quotation. Left
out are the few the corrected text still uses in a sense that is true, such as "the date has
not arrived" for a date that has not.

## 2026-09-30 — Mastheads that showed no data date, or the wrong one

**Was:** seven pages printed no "Data as of" date at all: churn, laborshed, realwage,
revisions, wages, the front page and chain. Five more printed the date of one file when the
page reads a newer one: the scorecard 13 August 2026 (award register; it also reads federal
obligations pulled 8 September), accountability 13 August (it reads the establishment counts
pulled 11 September), sources 8 September (it reads wages pulled 11 September), patents
30 August (it restates the occupations data of 31 August) and the timeline 13 August (its
heritage register is dated 14 August). **Is:** every masthead shows the newest date among the
data files its page reads: churn 1 September, laborshed 16 August, realwage 8 September,
revisions 13 August, wages 11 September, chain 14 August, the scorecard 8 September,
accountability 11 September, sources 11 September, patents 31 August and the timeline
14 August 2026. The front page shows the newest date among the pages it links to,
11 September 2026. The scorecard's two "Register as of" captions still say 13 August, which is
the register's own date. Two checks hold this: the hub's date is a claim, and a consistency
check fails any page whose masthead date is older than the newest file it reads. The sources
page also said "two of the fourteen sources have no endpoint and no script" and printed a
hub claim count of 33 and 575 site-wide. The register holds 27 sources, three with no
endpoint and two of those with no script, and the hub carries 34 claims for 576 across the
site; both now come from the registry and a check reads the printed numbers against it.
**Cause:** the shared masthead code printed a page's fetch date and, when a page had none,
printed nothing and said nothing. It now reads the page's as-of date, or its fetch date, and
fails the build when a page has neither. Nothing compared a masthead date with the other
files its page reads, and the sources page's census sentence was typed and unchecked.

## 2026-09-30 — More sentences that said more than their data

No figure changed. The revisions page's claim count is unchanged.

**A link it does not have, *revisions* and the front page.** **Was:** the revisions
standfirst and the front-page card described the three series as "the prices plants charge
for chemicals and for the plastic and rubber goods made from them". **Is:** "for chemicals
and allied products and for plastic and rubber goods". WPU06 is a broad index of which
resins are one part, so the other two series are not simply made from it. This is the
2026-09-29 correction to the same claim, reaching the two sentences it missed. The revisions
page carries a dated correction line.

**A gain the price data cannot show, *cost-scissors*.** **Was:** the closing line asked
whether "the last four years squeezed you or paid you". **Is:** "How the last four years of
prices looked depends on the link you sold from." These are selling-price indexes, and the
2026-09-28 entry withdrew the same framing elsewhere on the page. The page carries a dated
correction line.
The same review found the framing still in the page's labels: the gap heading read "The
squeeze became a cushion", the 2021 trough was labelled "the squeeze" in five places and the
2026 dip "the cushion", and the dollar-part example said the trough was "absorbed at the
machine" and that the part "paid for the spike on the way up". **Is:** "the trough" and "the
gap", and the part's "price trailed resin on the way up and held after resin fell back". The
indexes show prices, not who bore the cost. The same dated line covers it.

**A number that had moved, *sources*.** **Was:** recipe 2's 8 September note quoted "the
middle of 33,528 jobs" with nothing to say the count had since become 33,529. **Is:** a new
dated note beside it says so; the 8 September note stands as written.

**Cause:** Each was a copy of an already-corrected sentence that the earlier fix did not
search for. No claim reads these sentences.

## 2026-09-29 — Federal money does reach PIC, *funding-map*

**Was:** the Tech Hub machine card said EDA obligates each implementation award straight
to its project lead, "so no federal dollar passes through PIC's hands". **Is:** "so none of
the Tech Hub money passes through PIC on its way to another lead. One of the seven leads is
the Greater Akron Chamber, of which PIC is an initiative, on $2.65M for innovation
governance." A dated note under the machines adds that the Chamber is also the grantee on
all $3,084,371 of APEX, the second EDA award. **Cause:** the sentence stretched what the
EDA route rules out, pass-through to other leads, into a claim about all federal money, and
the page's own register holds two federal lines at the Chamber. The claim beside it checked
that the three routes differ, never the sentence's conclusion; it now pins both of the
Chamber's federal lines, and the card's $2.65M is bound to its noun.

**Later the same day.** **Was:** the corrected card still said "EDA obligates each of them,
meaning it commits the money straight to that lead". **Is:** "EDA signs each of them
straight to that lead"; USAspending confirms the obligation on six of the seven, all but
Huntsman's, whose signed award has no record there. **Cause:** the correction reworded the
sentence's conclusion and kept its premise, which the page's own source note qualifies.

**Later, 30 September.** **Was:** the Tech Hub plate on the map read "Obligated to each
project lead", the Tech Hub panel said EDA "obligates directly to each project lead", and
the direct-awards panel said the seven awards are "obligated straight to their project
leads". **Is:** "Signed to each project lead"; the panels say EDA signs directly to each
lead and that USAspending records the obligation on six of the seven, all but Huntsman's,
whose ED25HDQ0G0009, $5,970,805, is signed with no USAspending record. A dated note under
the map says so. **Cause:** the 29 September corrections reached the machine card and not
the plate or the panels, which carry the same premise. The claim now reads the card's own
sentence on the page, so the withdrawn "no federal dollar passes through PIC" fails the noun
gate, and it forbids an obligation claim on the plate.

## 2026-09-29 — The scorecard and the accountability page before their first publication

A pre-publication audit read both pages against their own data. The statements below failed
it. Both pages were unlisted when they were written, but a reader with the link could have
quoted them, so each gets an entry.

**Money spent, *scorecard*.** **Was:** the note under the scorecard said "No figure on this
page is a measure of money spent", and the empty disbursement row read "no figure exists in
this repository". Group B has printed federal outlays on seven of the eight federal lines
since 1 September. **Is:** "An award register records commitment, not payment, so no figure
taken from it measures money spent"; the note adds that no public figure covers the state
grant or the whole $85,335,784, and the row reads "no figure spans the register".

**The member flag's denominator, *scorecard*.** **Was:** the flag "marks, counts and exports
38 of the 785 companies" on the chain page. **Is:** 38 of 710, the chain page's count since
its 11 September correction.

**Labels broader than their rows, *scorecard*.** **Was:** group A was "the four rows on
revenue"; the federal context row read "Routine federal obligations to regional polymer
firms"; every assigned dollar "names the organisation that receives it" and sat "on an
executed line"; the completions row covered
"every polymer field of study" the federal classification recognises; the talent trend read
"up three years" over three values, which hold two rises. **Is:** two of the
four group A rows are membership, so "membership and revenue"; the federal row is the
average yearly obligation dollars on federal prime contracts under the chemical and
plastics/rubber manufacturing codes; two of the twenty-one named recipients are programmes,
so every assigned dollar is on a register line with a named recipient, and the definitions
of the two assignment rows say that recipient is an organisation or a programme; $73,199,371
of it is on an executed line, because the $5,970,805 EDA award to Huntsman, ED25HDQ0G0009,
has no USAspending record, so its execution is not verified; the completions row counts the codes the occupations page classes as
polymer; the trend reads "up in both years since 2021".

**Where the money goes, *accountability*.** **Was:** the awards commit the funders to pay
the other recipients directly, by design, so PIC cannot mis-spend money that never passes
through it. **Is:** $48,351,413 is EDA money on the awards of the six other project leads;
USAspending confirms $42,380,608 of it obligated directly to five of them, and the sixth,
$5,970,805 to Huntsman, is on a signed Notice of Award whose obligation is not verified; the
other $26,669,248 runs through the hub or the Chamber, $23,584,877 on state-grant lines the
hub allocates and the $3,084,371 APEX award, on which the Chamber is the grantee.

**The Chamber's wider figure, *accountability*.** **Was:** the Chamber "signed for" $7.6
million. **Is:** $7.6 million is every award the page names the Chamber on, as destination
or grantee; no file in the repository names the grantee of the state grant.

**Dates at the wrong precision, *accountability*.** **Was:** the register of published dates
"opens on the day this page ships"; the 9 September conference read "the date has not
arrived" after it had; eight register dates known only to a year or a quarter printed as single
days, among them "15 November 2027" for a promise dated to the last quarter of 2027; and the
narrative read "On 1 July 2025 PIC recorded" a first funding cycle dated to the year. **Is:** the register opened on
28 August 2026; a passed date reads as not yet read against the register; each date prints
at its known precision.

**The negative space, *accountability*.** **Was:** the empty disbursement line repeated the
scorecard's old note, on a page that prints $11,642,402 paid out; each empty line read
"defined today", the scorecard's build date; the closer said PIC "has set no target for any
of the eighteen dates"; the band's heading said PIC "has set itself no targets". **Is:** the
line quotes the scorecard's corrected note; each line carries 28 August 2026, when it was
written; none of the eighteen dated commitments carries a numeric target PIC set, though PIC
set four of them; the heading and the Limitations are scoped to the board and the register, and
the Limitations name PIC's own goal, 150 members and $1 million in annual revenue by 2028,
which the page shows beside the register.

**Two descriptions of one award, *accountability*.** **Was:** band E's source line said of the
award register's and the event register's descriptions of APEX that "one of the two is
incomplete". **Is:** the Notice of Award decides which is right, and the page does not
presume which description is at fault.

**The Bounce balance, *scorecard*.** **Was:** both Ohio workstreams holding unassigned money
had sub-grants that "have not been signed yet". **Is:** the PIC Translational R&D balance has
not been sub-granted; the startup-support balance is delivered through Bounce Innovation
Hub under a sub-grant agreement dated 15 May 2025, and the register names recipients in
that workstream only for the nine $25,000 cohort awards.

**Where the figures come from, both pages.** **Was:** the scorecard was "built only from
public federal and state data", its square key and table legend said a public federal or
state record computes every filled row, and both pages' Limitations said the repository
"carries no member, applicant or personal data" or record "at any grain"; the accountability
page's membership line said "no grain of a member record is publishable". **Is:** every
scorecard figure but the member count is built from public federal and state records and
PIC's published award register, and the member count comes from PIC's published membership
and company register; the repository carries no membership register, and its one
per-company membership fact is the chain page's published-member flag; the membership line
says no member's dues, standing or renewal is publishable here.

**Programme rows, *accountability*.** **Was:** "Two rows name a programme or a building
rather than an organisation". **Is:** two recipients do, and they hold three rows, because
the regional workforce programs carry two award lines.

**What fills an empty line, *accountability*.** **Was:** each line of the second list carried
"either a date it will be filled or a permanent reason". Three lines carry a condition, "on a
decision to publish drawdown totals", "on a quarterly reporting arrangement" and "on the
slip-record decision". **Is:** each line carries the condition on which it will be filled or
a permanent reason, and no document sets a date for any of them.

**A year that has begun, *accountability*.** **Was:** five commitments dated only to 2026,
F17 to F21, read "the date has not arrived" on a 29 September 2026 build, and the closer and
a note counted "eighteen dates". **Is:** a row whose day, month, quarter or year has begun
reads that it has begun and has not ended, and reads as not yet read against the register
only after that period's last day; the page counts eighteen dated commitments, which fall
on twelve distinct dates.

**Executed, verified and obligated, both pages.** **Was:** the accountability page said all
$79,170,176 assigned sits on an executed award line, in its band A paragraph, its band B
lede ("An award register records commitment and execution"), the payment chart's label and
description, the coalition table's lede, subtitle and caption ("27 executed lines") and the
methodology, and its band A source line said the register is "verified against signed
federal Notices of Award" with no exception. The scorecard's EDA row read "7 of 7" awards
obligated against a target of "7 of 7 awards"; its disbursement row said the register
"records commitment and execution"; its award chart's source line said the register is
"verified against the signed federal Notices of Award"; and its closing note said the eight
filled rows "compute from federal and state records". **Is:** $73,199,371 on twenty-six of
the twenty-seven lines is executed; the twenty-seventh, ED25HDQ0G0009, $5,970,805 to
Huntsman, is a signed Notice of Award with no USAspending record, so its execution and
obligation are not verified, and each of those surfaces says so. The EDA row reads 6 of 7
against a target of 7 signed awards. The closing note credits
PIC's published award register, which three of the eight filled rows read. The
accountability chart also labelled the $75,020,661 assigned beyond the Chamber's lines
"obligated to other named recipients" and said the detached match bar was "never part of
the total"; it now reads "assigned to other named recipients", and the match is counted in
reported secured and in no stage after it.

**Cause:** Each page was corrected on 1 and 8 September at the surface a reviewer named, and
the same statement survived on the other surfaces: the scorecard's note, the accountability
page's copy of it, and the chain count the member flag quotes. The timeline's stand-in days
were printed as dates because the page never read the precision field beside them. The
sentence on where the money goes was true of the EDA award and was written for all three.
New claims now read the mechanism of every award line, the precision of every register date,
and the scorecard note the accountability page quotes. A second review of these corrections
found five more: a named recipient was read as an executed line; the provenance line and
both Limitations predate the member flag and were not revised when it arrived; the
programme sentence counted recipients and called them rows; the list of empty lines was
described before its lines were written; and the first date fix re-derived only periods
that had ended. Claims sc-executed, sc-provenance and acc-member-provenance are new, and
acc-aggregates, acc-promises, acc-register-dates and acc-negative-list2 now pin these
counts and wordings. A third review found that the Huntsman exception had reached the
headline figures and not the labels, source lines, the EDA row or the accountability page's
paragraphs, and that the scorecard's closing note still credited federal
and state records alone. The chart labels and source lines are now written into the data
files, where sc-executed, sc-eda-seven and acc-attribution read them; acc-coalition
and sc-provenance bind the corrected sentences; and acc-promises now pins
which commitments share the year 2026, F17 to F21 reading that their year has begun and F22
giving the membership exclusion, where its text had said F17 to F22 alike. A fourth review
found the Huntsman exception still missing from three places: band A said EDA's Notices
"obligate $48,351,413", a sum that includes the unverified award; the band A paragraph and
the methodology said the twenty-six executed lines name twenty-one recipients, where they
name twenty; and the scorecard's award chart dropped the EDA bar's "execution unverified"
label on narrow screens. acc-licenses-mechanism now binds "obligat" to $42,380,608 and
acc-attribution pins the twenty.

**Later, 30 September.** A fifth review found six more. **Was:** the scorecard's standfirst
glossed an executed line as "a signed agreement naming the recipient", which Huntsman's
unconfirmed line also is; the scorecard's EDA row read 6 of 7 confirmed against a target of
"7 signed awards"; the accountability chart's top sentence said "EDA obligates directly to
each project lead"; band B's heading said "the federal lines have paid out 24.2 percent",
which reads as all eight; the coalition line put "a building and a programme rather than an
organisation" between "Two recipients" and its verb; and band A's source line said
restating the Chamber's line "leaves the share at 4.9 percent", the unrestated figure too.
**Is:** $73,199,371 on twenty-six lines is executed, each with a public record of its
execution, and the other $5,970,805 of the $79,170,176 assigned is Huntsman's signed EDA
award with no USAspending record; the EDA row's target reads "all 7 awards confirmed";
EDA "signs directly to each project lead", and USAspending records the obligation on six of
the seven, all but Huntsman's; the 24.2 percent is of
the seven lines USAspending records, $11,642,402 of $48,114,979; two recipients hold three
rows, one a building and one a programme; and the share moves from 4.86 to 4.93 percent.
**Cause:** the gloss, the target and the chart's copy of the funding map's note were each
written before the Huntsman exception and missed by the 29 September rounds; the heading
dropped its paragraph's base; one decimal place hid the restatement. sc-executed now asserts
the EDA bar's whole label, acc-attribution recomputes every stage amount the chart draws,
and sc-eda-seven pins the target's unit.

**Later, 30 September.** A sixth review found three more. **Was:** the funding map's spoken
chart title said the twelve smallest recipients "get under a million between them"; the
diagram's spoken description said the EDA award "is obligated directly to each of seven
project leads"; and the accountability page's limitations said "Match is never summed into
the staged bar". **Is:** each of the twelve gets under a million, $2.9 million between them
($2,871,278); the award is signed to each lead and USAspending records the obligation on six
of the seven, all but Huntsman's; match is counted in the reported-secured stage and in no
stage after it, as the chart has said since 29 September. **Cause:** text a screen reader
speaks and a limitations box are not where a reader of the page looks, and the earlier
rounds searched only what renders. The scorecard's federal-contract label also now says
"chemical, plastics and rubber codes" so it fits its column at 761px.

## 2026-09-29 — Labels and cards that said more than their data

A review of the 2026-09-28 corrections found these beside them. One figure changed: the
collaboration page's joint NSF projects, four to three (a researcher's move, below). No other figure in
these statements changed. The sources page's claim register rises from 532 article claims to 534,
and from 564 across the site to 567: three claims added with them, two on article pages and
one on the front page.

**The 2026-09-28 entry below, corrected here rather than rewritten.** It says the closing
sat "beside a standfirst naming NEO-SMART, awarded on 13 July 2026". The name was in a lede
paragraph, and before that day's fix the page dated the award 14 July; 13 July is the date
the fix gave it. It also says the page "now says at most 19, or 9 percent"; the page prints
at most 19 with no percentage beside it, and at least 90 percent in neither subject. Before
that day's fix it printed "19 of 208 works, about 9 percent"; the fix removed that percentage.

**A keyword search the page does not run, *collaboration*.** **Was:** the source line under
the chart of papers naming both per year (the first below the opening chart) described each year as "works listing both institutions, works matching
'polymer'", in the same line as a note calling the subject count "a classification rather
than a keyword"; that chart's text description said "the polymer-matching subset". **Is:**
"their polymer and biomaterials counts", beside the note that defines both as OpenAlex
subfields, and "the subsets classified in polymers and plastics and in biomaterials". The
fetch queries those two subfields and never searches for a word.

**"Joint" for papers naming both, *collaboration*.** **Was:** the standfirst said "Joint
output peaked at 29 papers in 2018"; the opening chart's text description said "joint
output"; the control chart's axis, legend, hover and text description said "joint works",
and its table had columns "Joint" and "Joint per 1,000 of Akron"; the lede and two source notes said "joint count" and "joint series".
**Is:** "papers naming both" or "works naming both", the source note's "unbounded count",
and table columns "Naming both" and "Naming both per 1,000 of Akron". The 2026-09-28 entry below changed the
headline and five sentences for the same reason and left these labels. "Joint NSF projects"
keeps the word only for Collaborative Research awards with a different principal investigator
at each university; see the next item.

**A researcher's move counted as a joint project, *collaboration* and *front page*.**
**Was:** "four joint NSF projects worth $3.7 million" (standfirst), "Four joint NSF
projects" (awards heading), a hero figure of 4 joint NSF projects, $3,670,535 combined, eight
award IDs, and "four joint National Science Foundation projects" on the front-page card.
**Is:** three joint NSF projects worth $3.4 million ($3,412,585), six award IDs. The pair
dropped, "Collaborative Research: Algorithm and Theory for Interface Computations"
($257,950), is two awards whose NSF records name the same sole principal investigator,
Lingxing Yao (NSF PI ID 269970204): 1620198 at Case Western, 07/01/2016 to 09/30/2018,
$162,703, and 1852597 at Akron, 08/01/2018 to 09/30/2022, $95,247. That is one researcher
moving from Case Western to Akron with the project; its Collaborative Research partner is
Yoichiro Mori's award 1620316 at the University of Minnesota. The newest joint project
still starts in 2017, and the earliest is still Northern Ohio AGEP-T in 2015. **Cause:**
fetch_collab.py paired an Akron and a Case Western award on a shared Collaborative Research
title and never compared their PIs; it now drops a pair whose awards share one. The
committed data was edited to what that rule produces rather than refetched, because a
refetch would also move the OpenAlex counts; run over the eight NSF records, the rule drops
this pair and no other. An earlier line of this entry, written the same day, said the four
"keep the word: those are Collaborative Research awards, joint by their terms". This pair was
Collaborative Research by its terms and joint between neither university. The collaboration
page carries a dated correction under its awards chart, and its claim now pins the three
surviving pairs by award ID.

**"Counted once per county", *wages* and *sources*.** **Was:** wages said its 35
de-duplicated pairings were "counted once per county" (methodology box) and "counting each
county once" (hero card 1), and its source line said "counting each county once at group
level"; the sources guide said "Count each county once and the unit is a county-industry".
**Is:** "counted at the finest industry detail published in each county" (methodology
box), "counting only the finest industry detail in each county" (hero card 1), "counting
each family once per county" (source line) and, on the sources guide, "Remove the overlap
and the unit is a county-industry". The 35
rows sit in twelve counties, eleven of which keep more than one: a family row is dropped
only where its own parts are published. Both pages carry a dated correction line.

**A comparison without its caveat, *front page*.** **Was:** the federal-money card said the
$51.0 million award "is about 1.2 years" of the yearly contract average, without the
federal-money page's own warning that a competitive grant and routine purchase orders are
different kinds of money, and without the finding that titles the page's contract chart.
**Is:** the card adds "a
rough size and not like for like", then names the page's other ledger before its finding:
the prime contracts under those codes with obligations in fiscal 2019–2026 "carry $329.5
million counted over each award's whole life, and two Department of Defense suppliers, the
survival-equipment maker RFD Beaufort and Goodyear, hold 56 percent of it."

**A scale, again, *front page*.** **Was:** the funding-map card, as corrected on
2026-09-28, said "drawn to scale and traced to twenty-one named recipients", which still
reads as though the recipients are drawn to scale. **Is:** "The awards and their match are
drawn to scale; the threads into the twenty-one named recipients are not."

**Prototypes shown as articles, *front page*.** **Was:** the cards for chain, reach and
collaboration sat in the gallery with nothing to mark them as prototypes, though each page
says so in its masthead. **Is:** each card carries its page's own flag, "Prototype · not
published data" for chain and "Prototype · internal draft" for the other two.

**An input it is not, *revisions*.** **Was:** "The three series sit on one supply chain.
Chemicals and allied products, which includes resins, is the upstream input; the other two
price the finished goods made from it", and a chart title comparing it with "either series
downstream of it". The wording came in with the 2026-09-28 fix to the series' name. **Is:**
"Chemicals and allied products is a broad index, of which resins are one part; the other
two price plastic and rubber goods", and "either of the other two". The page carries a
dated correction line.

**Cause:** Claims check the numbers in a sentence, and these words carried none. The
wages, collaboration, front-page and revisions claims now state the corrected wording, and
wages' claim checks that its 35 rows sit in twelve counties, eleven with more than one. The prototype flags are not
checked by anything: the claims harness reads data files, and the flag lives in HTML.

## 2026-09-28 — Seven more statements on the corrected pages failed their own data

Codex re-read the pages corrected below against their own data. Seven published statements
beside the corrected ones failed it.

**A yearly average read as every quarter, *churn*.** **Was:** "Since 2023Q1 more jobs have
ended than started every quarter." Hires outnumbered separations in 2023Q1, by 303, and in
2025Q1, by 71. **Is:** "Averaged over a year, more jobs have ended than started in every
quarter since 2023Q1", as the page's section on the two flows already said.

**The best case printed as the worst, *peers*.** **Was:** "The defensible worst case is 6th
of 382". Sixth holds only if none of the 227 withheld metros has more jobs, so it is the best
case. **Is:** no worst case: "So the claim stays narrow: 6th among the 155 that disclose."
The README drops its sentence putting the worst case at 233rd of 382.

**A scale the figure does not draw, *front page*.** **Was:** the funding-map card said the
money was "drawn to scale across twenty-one named recipients". The figure draws the three
awards and their matches to one scale; the threads into recipients are not to scale, and
the page says so. **Is:** "drawn to scale and traced to twenty-one named recipients".

**Paint as the most withheld industry, *location-quotient*.** **Was:** "Paint is also the
industry the bureau hides most of: five of twelve counties are withheld". Resin, a column of
the same chart, has seven withheld. **Is:** "The bureau also hides much of paint".

**A mean called more than double the median, *reach*.** **Was:** a long right tail "pulls
it to more than double the typical paper". The mean is 2.018 and the median 1.10, a ratio
of 1.8. **Is:** "1.8 times the typical paper", computed from the two figures.

**Reach's years in collaboration's filters, *collaboration*.** **Was:** the "Reproduce this"
block, which calls its filters "the exact values applied", gave the OpenAlex years as 2015
to 2024. That is reach's window. Collaboration's pull runs 2012 to 2025, and its 208 papers
fall to 158 on the shorter one. **Is:** the source registry gives each page its own years,
and the sources page carries the same line.

**An award date a day late, *collaboration*.** **Was:** NSF "awarded it on 14 July 2026".
NSF's award record 2532460 dates the award 13 July; 14 July is the date of public record the
timeline uses, and the timeline says which is which. **Is:** 13 July 2026.

**Cause:** The earlier reviews read the sentences each correction touched. These sat on the
same pages, untouched. Reach's claim accepted any ratio above 1.8 under text that said
double, and now checks the ratio itself; churn's claim checked the averaged wording the page
uses lower down, not the hero's; the other five had no claim.

## 2026-09-28 — Two pages gave a broad chemicals price index the name of a narrower one

**Was:** *cost-scissors* called BLS series WPU06 "industrial chemicals" in its prose, chart
labels, tables and data file; its gray line was "resin against industrial chemicals".
*revisions* used the same name in its lede, which also called WPU06 "the series a buyer
quotes when negotiating a resin contract", and in its data file. Its chart labels were
already right.

**Is:** WPU06 is "Chemicals and allied products", a group that includes resins. "Industrial
chemicals" is WPU061, a narrower series neither page uses. Every cost-scissors label, the
revisions lede, both data files, the fetch script, the source registry and the series
label in cluster-health's revision count now carry the right name, and the revisions page
calls the series the upstream input and no longer says what buyers quote. Both pages carry
a dated correction line. No number changed: the series was always WPU06; only its name was
wrong.

**Cause:** The name was typed wrong once, in the series table of `fetch_rest.py`, which
wrote it into both data files. Cost-scissors read its labels from there. The revisions
renderer had already caught the error: it overrides the data-file name with "Chemicals and
allied products" and says why in a comment. That fix never reached the page's lede or the
data file beneath it. Nothing checks a series name against its ID.

## 2026-09-28 — Ten sentences read firmer than their own data

Codex re-derived the hub's and pages' headline claims from each page's own data. These ten
held their numbers but claimed more than the numbers carry. Each changed sentence's claim
now checks the new wording's quantity.

**"Leads four papers in five", *reach*.** **Was:** "The region leads four papers in five
of those that name a corresponding author"; the headline said "four of its papers in five
are led from here", the figure card "81% led from here" and the opening chart "led from
here"; the closing paragraph said "the region leads most of that work rather than joining
it"; the front page said the same. **Is:** the headline and the front page say 985 of 1,222
papers naming a corresponding author had one here, and the figure card says 81% of those
1,222. The opening chart
splits all 1,448 papers by where the corresponding author sits: 985 here, 237 elsewhere,
226 naming none. The closing paragraph says most papers naming a corresponding author name
one here, including papers with no outside partner. The count includes those papers, so
"leads" described a collaboration the count does not require. The partner charts and
tables said each partner's other papers were "led from there"; they now say "led from
elsewhere", because a paper counts toward every outside partner on it, whichever one
holds the corresponding author. The map's source line said the same thing ("here or
there") and now says "here or elsewhere". The front page's reach card and the opening
chart's text description called the 1,448 "coauthored works"; the count does not require
a second author, so both now say "works". The map's own text description said
"institutions co-authoring polymer research" and now says "institutions named on the same
polymer papers".

**"Federal" awards from an NSF-only fetch, *collaboration*.** **Was:** "four joint federal
awards". **Is:** four joint NSF projects (eight award IDs, because NSF files a
collaborative project as one award per institution), on the page and the front page. The
fetch queries the NSF Awards API only; no other agency was ever checked. The front
page's collaboration card called the 208 papers "coauthored"; the fetch requires only that
a paper name both universities, which one author holding both affiliations satisfies, so
the card now says "208 papers naming both universities". The collaboration page made the
same inference in its own headline. **Was:** "Akron and Case Western have written 208
papers together since 2012", with "coauthored" in the standfirst, chart labels and closing,
and a note that such a paper is evidence "two people worked together". **Is:** "208 papers
since 2012 name both Akron and Case Western", the figure card adds "one author may hold
both", and the note says "A paper naming both universities proves neither a two-person
collaboration nor an institutional relationship". The headline's second line, "Eight were
about polymers", now says "Eight are classified in polymers", as the standfirst does. The
closing said "The collaboration is real and substantial"; it now calls only the four NSF
projects collaboration, on NSF's own label, and counts the papers as papers naming both.
The inference was not hypothetical: a live OpenAlex query on 28 September 2026 returned 211
such works (the page's cached pull has 208) and found both universities on a single author
in 15 of them. The page added its polymer and biomaterials counts, eight and eleven, into
"19 in all", "about 9 percent" and "91 percent" in neither subject; a paper can carry both,
and the same query found two that do, so it now says at most 19, or 9 percent, and at least
90 percent in neither. Its closing said "No new joint NSF award has started since 2017"
beside a standfirst naming NEO-SMART, awarded on 13 July 2026; it now says none started
after 2017 within the years counted, 2012 to 2025. The closing also rested its "That was
false" on the 208 papers beside the NSF projects; it now rests on the projects alone. The
heading "Joint work fell as a share of Akron's output" and five sentences that called the
counted papers "joint work" or "joint papers" now say "papers naming both".

**A comparison set that ended at Akron, *peers*.** **Was:** "Among the six disclosed metros
with the most plastics and rubber jobs, Akron is also the most concentrated." **Is:** among
the 155 disclosed metros, Akron ranks sixth on jobs and eighth on concentration. The old
sentence was true, and holds to the ninth-largest, but its cut-off of six was Akron's own
rank on jobs.

**A ranking on a 0.07-point gap, *laborshed*.** **Was:** "only Pittsburgh keeps more for
its own residents than the twelve counties do". **Is:** the twelve counties keep 89.5
percent and Pittsburgh 89.6 percent, on twelve counties against eight. A gap that small,
across different boundaries, is not a ranking. The two chart labels ("ahead of PIC-12")
and the closing paragraph ("only Pittsburgh beats") carried the same ranking. The labels
now say "just above PIC-12, on four fewer counties"; the closing paragraph gives both
shares to two decimals, 89.60 against 89.53 percent, the 0.07-point gap between them,
and both boundary sizes.

**A rank without its margin, *realwage*.** **Was:** the 8th place after price adjustment,
alone. **Is:** the same rank, with "less than $6 a week from either neighboring rank". The
gaps are $3.60 and $5.40, small enough for a revision to move the rank.

**An unlabeled nominal ratio, *occupations*.** **Was:** "Akron's median wage ratio".
**Is:** "median nominal wage ratio". The ratios are not price-adjusted; divided by Akron's
price level, the degree-job shortfall of 0.93 times becomes 0.99 times.

**Inputs and outputs of invention, *patents*.** **Was:** "The inputs to invention have
more than halved: degrees are down 56 percent. The recorded outputs of invention have
fallen by about a quarter." **Is:** the two declines stand as separate facts: Akron and
Case Western's polymer degrees fell 56 percent from their 2014–2020 average, and Ohio's
polymer filings fell 25 percent from 2015. Two institutions' degrees and a state's filings
are not the input and output of one process.

**"Strong" earnings, *programs*.** **Was:** "Where the record shows earnings at all, they
are strong: $87k–$101k four years out." **Is:** "Four-year earnings range from $87,636 to
$100,428; four of five institutions fall below the national median." Four of the five sit
below the $92,919 national median for their program code.

**"Supply against demand", *chain*.** **Was:** that section label. **Is:** "Register
records against funding applications". The section's own text says the counts do not
measure capacity, competition or market demand.

**What an employment quotient shows, *location-quotient*.** **Was:** paint's quotient
meant "more paint sites, more suppliers and more people who know the work than a region
this size would usually hold". **Is:** "paint accounts for an unusually large share of
local jobs". An employment quotient measures job share; it says nothing about sites,
suppliers or skills.

## 2026-09-28 — Wages said pay was level with manufacturing, and it is two families that are not

**Was:** The wages headline read "Against manufacturing, pay is level." The factory band
was titled "Against the factory next door, polymer pay is level", called the pooled
0.99 times "dead level with the factory next door", and closed that polymer pay against
the factories "is ordinary". The Lake County figure of about $129,000 a year was
printed without saying which industry it covers. The front-page wages card gave the
0.99 times with no split.

**Is:** The 0.99 times is the median of 51 county pairings from two families on either
side of it. The 23 chemical pairings sit at a median 1.16 times the county's
manufacturing wage, 19 of them above it. The 28 plastics and rubber pairings sit at
0.87 times, 4 of them above. The headline, band title, lede, closing sentence and front-page
card now say so. The $129,000 is all chemical manufacturing in Lake County: 248 of its
1,676 jobs are published as paint, and the rest is not broken out, so it reaches beyond
the resin and paint codes. The page says this beside the figure.

**Cause:** The headline described the pooled median, and no pairing family is at it.
The Lake figure is the county's NAICS 325 row, and the prose named no
industry code. wage-vs-mfg-split and human-lake-chem-scope now
guard both.

## 2026-09-28 — The timeline printed seventeen times as a measured pace, from a before count that is a floor

**Was:** The pace band's headline read "After the designation the public record filled
seventeen times as fast", and its lede called "the seventeenfold gap" a change of pace.
The figure's source line said "the 68 counted here starts from that split".

**Is:** The headline states the two counts, 67 events against 4. The lede says
seventeenfold is the upper end: the before count is a floor, so the true jump can only
be smaller. The source line reads 67, the count from the 23 October 2023 designation;
68 is the operations calendar's count from 1 January 2023, one row earlier. The page's
own computed sentences were already right. The claim record for them said 20 times and
13.6, built on 68, where the page divides 67 and prints 19.8 and 13.4. It now matches
the page.

**Cause:** The ratio moved from the source line into the headline and lost its
qualifier on the way. The 68 was a typed literal from the other window; the source line
now reads the computed count.

## 2026-09-28 — The funding map credited the state with promises that came from partners

**Was:** The standfirst and the second stat card said "partners and the state" promised
$21.0 million beside the federal award.

**Is:** Partners promised it; the state promised none. The Ohio grant's $10.4 million
match comes from local partners, as the state's own announcement says. The standfirst,
the stat card and a dated correction line in the page's header now say so. The page's
29 August 2026 correction note repeated the phrase; it stays as written, because notes
are not rewritten, and now opens with a dated bracket whose first words say partners
alone promised it; only then does the bracket quote the phrase it corrects.

**Cause:** The phrase passed from sentence to sentence, and no guard checked who made each
promise. tile-figures already pinned the machine card's Ohio match to its local-partner
label, which was right. Its falsified_if now names this failure too, but no claim reads the
standfirst or the stat card, so a relapse in either would still pass.

## 2026-09-28 — Cost scissors claimed a gain its price data cannot show, and an order it held only lately

**Was:** The standfirst's bold line said the 2022 spike means "somebody in this chain ate
the spike and somebody banked it". The ladder band's headline said "Each step away from
the wellhead kept more of the 2022 rise, except the power bill", with no date.

**Is:** The bold line reads "the 2022 spike has not unwound evenly, and the prices nearest
the customer have held". The spread lede, the gas figure card and the feedstock seat no
longer call a price move a "windfall", and the lede no longer says chemicals "feed" resin,
since the chemicals index includes resin. The headline is dated July 2026. The lede adds that the order
held in 29 of the 43 months from January 2023 and broke in four of the last eight, most
recently in April 2026.

**Cause:** These are selling-price indexes, and the page's own note says they are not a
margin. A price that holds does not show who banked anything. The ladder order was
checked only on the latest month. cs-ladder-order-dated now counts every month since
January 2023.

## 2026-09-28 — Churn said most hires come from other plastics employers, which the series cannot show

**Was:** The churn page said most of one plant's 58 hires "are filled by people already
working in plastics and rubber who moved from another employer". It said what a training
pipeline must supply is "a different and much smaller quantity". The front-page churn
card said near-equal hire and separation rates are "how a churn engine that size
produces a net flow of +168 while the headcount falls 719."

**Is:** The page no longer says where any hire came from; the flows cannot show whether
none, some or most moved from another plastics or rubber employer. It calls the
pipeline quantity "different" and
says this series cannot size it against the hiring, and the standfirst says the two
Census measures are estimated separately. The
front-page card says the headcount is a separate Census estimate that need not agree
with the flows. The rates explain the +168, not the 719.

**Cause:** The flows series does not record where a hire last worked; only the Job-to-Job
Flows series does, as the page's next sentences say. The card joined two separately
estimated figures with "which is how".

**Also corrected the same day:** the page called the roughly 400 a year who reach 65 a
"floor" on training demand, and said age "accounts for" about 400 of the 6,626 hires. Over
the same four quarters the region recorded 7,157 job separations and 6,626 hires, so some
departures were not refilled, and the flows cannot say whether any retirement was. About
400 is the number reaching 65, not the number retiring. The page now says age would account
for about 400 hires only if everyone reaching 65 retired and every one of those jobs were
refilled, in the prose and in the arithmetic panel, and that the 400 is not a floor. A
methods note had blamed the missing Job-to-Job Flows for both; it now says that gap is why
the 400 cannot be a total, and that separations exceeding hires is why it is not a floor;
the same note and the README now call the 400 the age-65 figure, not the retirement figure. The README had kept an older sentence saying most of a plant's
hiring "is refilled from inside the industry"; it now says the series cannot tell.

## 2026-09-28 — The front page sent the state question to a county page

**Was:** Below the state chart, the front page said which large states hold most of the
industry and handed the reader on with "That is the question the concentration page
answers."

**Is:** It links the rankings page, which sets each large state's concentration beside
its count, and the concentration page for the twelve counties. No figure changed.

**Cause:** The concentration page covers counties, not states. The rankings page already
answered the question, and the sentence named the wrong one.

## 2026-09-12 — The bureau revised 2025 after first publication, and six pages had not followed

**Was:** Every 2025 employment figure on cluster-health, location-quotient, wages,
accountability, the hub and the sources guide was the Bureau of Labor Statistics' first
publication of that year. cluster-health printed 24,030 jobs in the three-industry register, a balanced-panel
total of 23,457 after a fall of 802, industry moves of 824 down, 393 down and 461 up (a net
fall of 756 on every published cell), 12,896 jobs in the two-sided pay set, and a national
register of 857,188 jobs, down 5.8 percent against the region's 8.0 percent. Its workplaces
chart, the hub card and the accountability context line counted 364 plastics and rubber
establishments in 2025, up 0.8 percent from 361 and unchanged from 2019, with the county
changes over 2022 to 2025 reconciling to a net three. location-quotient
printed 24,030 cluster jobs, 4,259 paint jobs with 3,258 of them in Cuyahoga, a largest
disclosed cell of 5,780 jobs, and resin on its fixed four counties climbing to 6.45 times
the national share. wages printed 24,030 narrow-cover jobs, 33,528 broad-cover jobs, a
column sum of 54,372, an overlap of 20,844, and 20,463 of 26,402 jobs in the de-duplicated
set. The sources guide's worked examples repeated the wages figures, put 9,498 chemical jobs
outside any published part code, and gave 3.271 as this site's own value for the worked
location-quotient cell, a residual of 0.00102 against the bureau's 3.27.

**Is:** The 2025 rows for Ohio, the United States and the twelve counties were re-read from
the bureau's own area files on 11 September 2026, after the first publication of that year
was found already revised; 80 of 154 cells moved. The register level is 24,032, the balanced
panel 23,459 after a fall of 800, the industry moves 824 down, 395 down and 465 up (a net
fall of 754 on every published cell, which is not the balanced-panel 800 and is not meant to
be), the two-sided pay set 12,900 jobs, the national register 857,341, down 5.7 percent
against the region's 7.9 percent. Establishments are 365, up 1.1 percent from 361, so the
county changes over 2022 to 2025 reconcile to a net four; the 2019 count was 364, so the
2019 comparison now reads one more rather than unchanged. location-quotient: 24,032 cluster
jobs, 4,257 paint jobs with 3,256 in Cuyahoga, a largest cell of 5,778, resin on the fixed
four at 6.47. wages: 24,032 and 33,529, a column sum of 54,375, an overlap of 20,846, and
20,464 of 26,403. The sources guide follows the wages figures, puts 9,497 chemical jobs
outside any published part code, and gives 3.272 for the worked cell, a residual of 0.00208,
still inside the half-digit the bureau prints; its claim tallies also rise by the three
guards the federal-money page gained the same day. Four printed roundings moved: 5.8 to 5.7 percent, 8.0 to 7.9 percent,
0.8 to 1.1 percent, 6.45 to 6.47. These rounded displays did not move: 1.24, 0.90, 1.17,
1.26, 5.96, 7.68, 11.2, 1.46, 18 percent, 76 percent, one job in seventy. Behind them the
guarded values moved and the guards now pin the new ones: paint 5.9594 on the published
counties and 7.6774 on the fixed five, the pay median 1.2375, Cuyahoga paint 11.1984. Not
re-read: the five bordering states' 2025 rows, which remain first-publication figures and
may revise the same way; the workplaces comparison says so in its data.

**Cause:** The re-read reached the data files on 11 September and the sentences that quote
them were not re-derived, so the data on disk disagreed with the published figures it feeds
until this entry; run page by page, the claims harness reported 33 failing guards across the
six pages once the sources registry was regenerated from the revised inputs. Two further defects surfaced on the way. The dashboard file had been regenerated
before two of its inputs were, so it printed industry moves of 393 and 461 beside inputs that
said 395 and 465; it is rebuilt here from its inputs in the documented order, deriver then
mirror patch. And the correction had been recorded by hand inside two generated data files,
where nothing regenerates it: the rebuild erased the block in the dashboard file, and the one
in the workplaces file will go the same way at its next rebuild. This entry is the record.
One more defect was fixed on the way and one limit stays open. The location-quotient and
workplaces data files carried their August fetch stamps (14 August 2026) although their 2025
rows are the September re-read, so those pages' data-as-of lines predated a row they carry.
A committed, idempotent patch, `_data/build/qcew_2025_vintage_patch.py`, now stamps the
re-read date and its scope into both files' metadata, and the dashboard inherits the date.
A patch rather than a rebuild because the location-quotient deriver in the tree no longer
reproduces the shipped file's metadata (the file carries a longer, hand-polished definition
than the script writes, and a regenerated file failed the style gate); reconciling that
script to its file is the open item. The suite's summary line had reported four failing
claims when there were 28, because it prints only the first few ids; the per-page verifier is
the count.

## 2026-09-11 — Education scope, recruiting claims and chain captions

**Was:** The occupations opening and several captions described selected program
conferrals as the region's training total. Its closing sentence said floor jobs could
recruit nationally while degree jobs had to be trained locally; a stat card called
the largest occupation the largest staffing problem. The chain's generated opening
still called Census establishments polymer plants, and its methods said unclassified
records were hatched on a map that now shows classified counts.

**Is:** The occupations page separates national staffing, metro wage comparisons and
conferrals in the selected institution/program records. The data do not establish
recruiting reach, unique graduates, local retention or a worker shortage. The chain
opening describes a company-record inventory; Census establishments remain separate
industry context, and unclassified records are excluded from the classified-count map.

**Cause:** Partial wording corrections had not reached every generated caption and
opening sentence. The claims' descriptions now follow the corrected scope. Source
observations and numerical assertions are unchanged. Shorter opening text also moves
the first chart earlier without removing the scope qualifications.

## 2026-09-11 — Chain geography and the invalid coverage comparison

**Was:** The chain page counted 785 regional records, using a county-name join that
admitted 64 Wayne County, Michigan records, one nonregional company address and ten
records without an address. Its Census context used a different fourteen-county set,
giving 653 establishments and 41,447 employees. A ratio of company records to Census
establishments shaded the map and suggested where the register was incomplete.

**Is:** Applying the held extract’s county-and-state rule leaves 710 qualifying records,
566 with mapped roles. All 75 excluded names remain disclosed by reason. The map,
county table and Census context now use the CODEBOOK boundary: PIC-12 plus Columbiana
and Tuscarawas. The cached 2023 Census responses give 684 establishments and 43,242
reported employees for NAICS 325 and 326 on that boundary. The map shows direct record
counts; the incompatible company/establishment quotient and its ranking are removed.
The separate application comparison covers all 59 applications, 38 in Ohio, and is not
a measure of market demand.

**Cause:** A county-name homonym and conflicting county lists affected both the regional
and comparison populations. The replacement offline repair validates source bytes,
county cells and retained source fields. Neither a headquarters filter nor a missing
address establishes the absence of regional plants.

## 2026-09-11 — Historical contributions are not blanket scientific firsts

**Was:** All twelve research rows were labeled scientific firsts, including the 1940
Ameripol product introduction. Chart labels omitted attribution from university
priority claims. The 2005 Puskas paper attributed the coauthor group to Akron and linked
a different 2009 paper as its repository record. Other sentences attributed EPIC’s
1984 date and a dues-model conclusion, Goodyear’s retained headquarters, and an exact
innovation-center size to sources that did not establish those clauses.

**Is:** The same 31 events are displayed as 20 heritage events and 11 research
contributions. Ameripol moves to heritage. Institutional priority claims remain
attributed; chart labels do not assert an independent national first. The Puskas
sentence names a collaborative paper without assigning all authors to Akron; the
unrelated repository record is removed. EPIC’s date is attributed to a historical
timeline citing Mark D. Bowles, and the unsupported dues-model conclusion is removed.
The Goodyear row states the documented buyout. The innovation-center row states the
documented 2010 completion without unsupported size or season. The Kent paper/patent
display date now reads 1986–87.

**Cause:** The source review checked event wording and attribution separately from
the register’s editorial PROVEN label. A source supporting an event does not
automatically support every clause attached to it. Public projection corrections
preserve original event IDs and do not alter the internal register.

## 2026-09-11 — Narrative claims must match their denominators and limits

**Was:** Hub cards retained superseded claims about a flat headcount, six cluster
industries, 721 classified companies, an Atlas size threshold and historical causation.
Scorecard said no payment evidence existed despite the federal outlays shown by its
companion page. Churn inferred a cause that its separation data cannot identify.
Education headings turned a named-institution extract into a regional universe.
Revision guidance turned an observed archive limit into a future deadline.

**Is:** Cards match the corrected articles. Scorecard distinguishes partial outlay
coverage from the unmeasured whole; Accountability separates destination from awards
signed for and from cash held. Churn identifies the size of the separation gap while
leaving quits and layoffs unresolved. Education counts stay scoped to institutions in
the file. Reach states the mapped subset and the 309 of 1,364 scored-paper denominator
(22.7 percent). Revision guidance cites BLS policy and bounds the archive observation;
QWI history revisions are tied to changes in underlying state data. The largest PPI
revision reads 1.41 percent consistently, calculated from the original index levels
rather than rounding an already rounded change.

**Cause:** Correct numerical cells can still produce a misleading headline when its
unit, population, attribution or causal interpretation changes. Paint’s comparison on
a fixed county set already existed; the standfirst now makes its changing disclosed
county count explicit.

## 2026-09-11 — Institution records are not distinct schools

**Was:** Atlas disclosed duplicate federal institution identifiers in its methodology,
but its headline still called the 147 records “places,” and several chart labels counted
them as distinct institutions. It also described that total as a floor for school counts.

**Is:** The headline, count labels and directory identify institution records. Each
record follows a federal identifier; one school can hold more than one. Missing
subject codes and duplicate identifiers are different limitations, so the total is
not presented as a lower bound on distinct schools.

**Cause:** The earlier correction reached the methodology without reaching the labels
readers see first. No rows, completion counts or coordinates changed; this correction
does not claim a newly deduplicated school total.

## 2026-09-11 — Documentary descriptions and event-count fallbacks

**Was:** The Atlas attributed all four teaching examples outside its census to chemistry
or chemical-engineering filing codes. Peers described a national RV production majority
and injection molding without sufficient evidence. The tire vignette asserted a rubber
composition share. Timeline called every photo public domain, described all three 1941
frames as rubber or fuel-tank work, and retained 68/69 in static event-count text.

**Is:** The four teaching examples do not share one established filing-code explanation.
Peer descriptions identify documented industry presence, with direct sources, without
claiming production shares. The tire explanation concerns the crosslinked rubber’s
resistance to simple remelting, not its mass share. Photo captions identify aircraft
subassembly, fuel-tank manufacture and rubber processing; rights wording follows the
archives’ records. Timeline’s fallbacks now match its data: 67 delivered since designation,
68 since the calendar opened, and 18 scheduled. Funding-map’s introduction describes
named allocations and acknowledges that some awarded funds remain unassigned.

**Cause:** A documentary audit found unsupported generalizations and stale repeated text.
The sources include [BLS county industry records](https://data.bls.gov/cew/data/api/2024/a/area/18039.csv),
the [rubber-recycling review](https://doi.org/10.1039/D4MA00379A), and the
[Library of Congress aircraft-dock record](https://hdl.loc.gov/loc.pnp/fsac.1a35066).
Education completion data, funding amounts and Timeline event rows are unchanged.

## 2026-09-10 — Publication controls and historical attribution

**Was:** The collaboration page said indexing delay was excluded because one
university's overall indexed output rose. Timeline described earlier discoveries as
the reason the cluster exists and stated the register's discovery definition universally.

**Is:** The joint-paper rate falls even relative to Akron's indexed output. University
totals provide context, but cannot rule out different indexing delays for joint papers.
Timeline's earlier events provide historical context, without claiming to explain the
cluster's formation or crediting them as PIC outcomes. Its discovery definition is
explicitly the definition used by this register.

**Cause:** Descriptive comparisons and editorial classifications were written as
stronger explanatory claims. The underlying counts and event records are unchanged.

## 2026-09-10 — Residence records, price gaps and source limits

**Was:** The labor-shed page said one group never traveled, treated adjacent residence
as commuting, and ruled out a pandemic effect from a 2019 baseline. Its README also
described distant residents as half the entire imported workforce. Source notes said
LODES origin-destination data had no industry dimension. The price page said other
input costs were absent from its two indexes, and a related link implied measured margins.

**Is:** Residence and workplace records establish neither trips nor telework. Distant
residence predates the pandemic; its later causes remain unknown. Distant residents
account for roughly half of the adjacent-plus-distant groups, or 29% of all externally
resident jobholders. LODES provides three broad industry groups, but cannot isolate
polymer industries; this page uses all-job totals. The price indexes measure selling
prices, which can reflect other costs without separately measuring them or profit margins.

**Cause:** Interpretation exceeded the source fields. The [Census LODES specification,
page 5](https://lehd.ces.census.gov/data/lodes/LODES8/LODESTechDoc8.0.pdf) and
[BLS PPI definition](https://www.bls.gov/ppi/overview.htm) support the narrower readings.
Numerical observations are unchanged. The QWI manual check now cites Census's revision
policy and separates that policy from the unmeasured size of revisions.

## 2026-09-09 — Federal category-share check note

**Was:** The two-company claim's documentary check note still described the separate
two-category share as 65% of eight-year contract dollars.

**Is:** The category share is 58%, as the chart and its automated assertion already
state. The two-company share remains 56% on the separate award-value basis.

**Cause:** A supporting check note retained the earlier category total after the
federal data correction. This correction changes the note, not either chart or its
denominator.

## 2026-09-08 — The price page's second source

**Was:** The source registry listed only FRED for the price-spike page and counted nine
pages as relying on a single registered dataset.

**Is:** The page also uses BLS CPI for its real-price explanation. Both sources are
registered, and eight of the 23 registered pages rely on a single dataset each.

**Cause:** The registry missed the copied inflation dependency. The regenerated source
guide and its count assertion now include it. A revision affects pages using that
dataset; it does not imply every page with one source shares the same agency.

## 2026-09-08 — Price-page inflation dependency

**Was:** The price-spike page copied a 2025 consumer-price index of 322.132 from the
earlier federal-money data, reporting 26.0% inflation since 2019. It described its
2026 real-price estimates as guaranteed upper bounds and retracements as lower bounds.

**Is:** The dependent calculation uses the verified 321.943 index, the mean of eleven
published 2025 months; October is unavailable. Inflation since 2019 rounds to 25.9%.
Carrying that index into 2026 is an approximation whose error direction is unknown.
The resin retracement estimate rounds to 101% of its real rise, previously 102%.
All nominal price observations, dates and chart series are unchanged.

**Cause:** Correcting the federal source did not automatically update a copied deflator
on another page. A scoped synchronization and check now ties this dependent table to
the verified observations. An unknown future price change cannot establish a bound.

## 2026-09-08 — Comparison units and the smaller regional metro

**Was:** The hub described Youngstown–Warren's exclusion from the 29-metro display
without stating its adjusted wage position among all 155 matches. The Programs card
and base-rate chart mixed programs and administrative program records; the ratio
paragraph displayed rounded percentages without its raw count basis. The wage-card
check allowed values that could round to 1.20 while the card printed 1.21.

**Is:** Youngstown–Warren ranks 45th after price adjustment among all 155 matches,
above Akron's 48th; its 960 jobs exclude it solely under the 2,000-job display cutoff.
The card, picker and wage page state both facts. The education comparison identifies
program records and prints 95 of 168 against 2,051 of 8,736 beside the approximately
2.4-times ratio. The wage assertion requires the exact displayed rounding, 1.21.

**Cause:** Final review distinguished a display cutoff from the result it excludes,
and a source-record unit from a claim about teaching continuity. These changes clarify
existing data; no wage rank, program count or ratio changes. Dormant county labels
were also removed from five national, register and method cards, and the federal
industry-total caption now identifies FY2026 as partial beside the chart.

## 2026-09-08 — Hub coverage and the headline threshold

**Was:** the hub county selector and cost-of-living card marked only Akron and Cleveland
as covered. Mahoning and Trumbull were therefore labelled as having no local price
comparison, although Youngstown–Warren has disclosed wage and price data in the matched
2024 sample.

**Is:** All three disclosed regional metros are covered. Youngstown–Warren is among the 155
disclosed matched metros, with 960 plastics and rubber jobs. It falls below the
2,000-job threshold for the 29-metro headline ranking, which is now stated explicitly.
Canton–Massillon's wage data are source-suppressed; Wayne is in the Wooster micropolitan
area and is outside this metropolitan comparison. Ashtabula remains included through
Cleveland's current boundary.

**Cause:** The hub retained a two-metro coverage rule after the matched source restored
Youngstown–Warren to the article's regional comparison. Geographic coverage and the
headline employment threshold are different filters. The hub claim now checks the
three disclosed regional identifiers, Youngstown's job count and threshold exclusion,
and Canton's explicit source-suppression record. No source data or metro ranks changed.

## 2026-09-08 — Local metro membership

**Was:** The source guide described three metropolitan areas overlapping PIC-12 and
said each extended outside the footprint. The real-wage data's local classification
omitted Youngstown-Warren.

**Is:** Census county delineations identify four intersecting metropolitan areas.
Akron, Cleveland and Youngstown-Warren are wholly inside PIC-12; Canton-Massillon also
includes Carroll County outside it. Wayne County is in the Wooster micropolitan area.
Youngstown's 960 jobs were already included among the 155 disclosed matched metros;
it is now classified as local and remains below the 2,000-job display threshold.
Canton is source-suppressed in this wage vintage. All five local areas now have an
explicit disposition. Wage values and ranks are unchanged.

**Cause:** A literal list substituted for county membership and conflated the displayed
sample with the region's metropolitan coverage. The classification now derives from
the Census county table, keeping overlap, disclosure and the display threshold separate.

## 2026-09-08 — Program comparisons before rounding

**Was:** The technician-program comparison divided rounded percentages, giving ratios
of 2.48 and 2.37 and describing the small-program comparison as about 2.5 times.

**Is:** The comparison now divides the underlying count shares: 95 of 168 against
2,051 of 8,736 gives 2.41, or about 2.4 times. For programs classified as both small
and brief, 75 of 168 against 1,693 of 8,736 gives 2.30, or about 2.3 times. The counts
and classifications are unchanged; these remain administrative comparisons, not
failure probabilities.

**Cause:** Rounding each percentage before dividing inflated both ratios. The producer
now calculates from counts and rounds only the resulting ratio.

## 2026-09-08 — Comparator and chronology follow-up

**Was:** The federal correction below gave the two rubber codes' 58% share without
identifying its price basis. Accountability and Scorecard retained the superseded
annual federal comparison. Health pay wording could be read as individual wages or
counts of counties; the Programs title described a decline without dates.

**Is:** The 58% share is in constant 2025 dollars (60.2% in nominal dollars).
Accountability and Scorecard use $41.4M across seven completed fiscal years.
Contract NAICS identifies the purchased product or service; it does not establish
the awardee's research activity, and the selected rubber codes include natural rubber.
Health pay statistics describe county-industry group averages and pairings.
Programs describes the 2016–2023 decline and shows that 2023 remains above 1991;
both funding announcements postdate the measured series.

The real-wage page now also shows Akron's ranks across all 155 disclosed matched
metros (60th before, 48th after price adjustment), alongside the inherited
2,000-job cutoff comparison. The narrow industry group's employment-weighted
median wage ratio is 1.17; the broader group's is 1.26. These are group statistics,
not individual pay or estimated effects of locating in the region. The hub shows
both all-job and manufacturing pay comparisons.

**Cause:** Final source and reader checks exposed omitted comparator labels,
dependent prose that had not followed the corrected inputs, and a title that
outlasted its measurement window. Threshold sensitivity and alternative time
windows make those choices visible. Earlier entries remain unchanged.

## 2026-09-08 — Federal categories and inflation

**Was:** Polymer contracting averaged $36.6M annually in 2025 dollars, making the
$51.0M Tech Hub award about 1.4 years. No tire obligation appeared in FY2023; only
FY2019 exceeded the award; two rubber codes held 65% of the total.

**Is:** Complete results give $41.4M a year over FY2019–FY2025 and about 1.2 award-years.
FY2019 and FY2021 exceed the award. FY2023 includes $1,175,828.84 nominal tire
obligations. The eight-year series, including partial FY2026, totals $278.6M nominal
and $313.6M in 2025 dollars; the two rubber codes hold 58%. The comparison with all
prime contracting is one polymer dollar in every 29. Annual transactions and the
separately dated award-lifetime register remain different measures.

**Cause:** Both category fetchers stopped after 100 results before filtering by industry.
They now exhaust pagination and retain signed obligations. An unsupported CPI constant
of 322.132 is replaced by 321.943, recomputed from the eleven published 2025 months;
October was unavailable. Two previously held FY2026 cells also revised upstream.
The separately queried all-type decomposition leaves an explicitly unallocated $8.5M
nominal remainder (0.004%); it is not described as an exact reconciliation. The source
guide's CPI example consequently changes from 110.9 to 111.0 and inflation from 26.0%
to 25.9%. Dependent hub and cluster-health comparisons use the corrected inputs.

## 2026-09-08 — Wage geography and the meaning of a wage statistic

**Was:** The cost-adjusted comparison joined 2023 wages to prices with different metro
boundaries. Akron ranked 33rd then 19th among 56 and was said to cross the median.
Cleveland's missing comparison was attributed to suppression. The state comparison
described 51 rows as 50 states plus DC. A 1.26x wage statistic described the middle job.

**Is:** Matched 2024 wage and price sources on the same OMB 23-01 delineation place Akron
13th then 8th among 29 metros with at least 2,000 industry jobs, above both medians.
There are 155 disclosed matched metros and 227 suppressed source rows. Cleveland is
included; Los Angeles remains ahead after adjustment, while Chicago and New York are
withheld in this vintage. The states are the 50 states plus Puerto Rico, with DC absent;
Ohio remains first. Cleveland's old area has nine disclosed years, 2015–2023; its new
area adds Ashtabula in 2024 and is shown separately. Current county coverage reflects
that addition. The 1.26x figure is an employment-weighted median of group-average
ratios, not median individual pay. The median county-industry pairing is 0.99x local
manufacturing pay and 1.21x all-jobs pay; broad chemicals, plastics and rubber coverage
is named explicitly.

**Cause:** Matching codes or counting rows did not establish geography, jurisdiction or
disclosure status. Group means and headcounts do not recover individual wage
distributions. Differences between these editions are not a measured time trend, and
the all-jobs comparison does not establish an industry-specific causal premium.

## 2026-09-08 — Programs: definitions, continuity and grant timing

**Was:** “Never took hold” described both 95 of 168 technician records and the 45%
small-and-brief subset. Other education layers were said to have held; the next rebuild
was called a historical first. Ferris had “33 unbroken years.” Regional grants were
placed in the same years as a decline ending in 2023. Akron's opening foregrounded two
undergraduates without its 42 graduate completions.

**Is:** Small means at most ten recorded lifetime completions (95/168, 57%); brief means
an inclusive first-to-last reporting span of at most five calendar years (91/168, 54%);
both is 75/168 (45%). Substantive means more than ten; active means a reported completion
in 2023. The comparisons establish neither stability nor a historical first. Ferris has
32 counted years because 2020 is quarantined. Akron's 44 selected-code completions
include 42 graduate degrees, and its chart now breaks across 2020. The named grant
announcements were in 2024, after the series endpoint, so this series cannot measure
their outcomes. Missing years may affect both threshold membership and denominators;
these shares are not failure probabilities or guaranteed bounds on a complete census.

**Cause:** Administrative measures shared an imprecise label, missing records became
claims about failed starts, and announcements after the endpoint were treated as
overlapping investment. A chart also bridged a year its table correctly omitted.

## 2026-09-08 — Jobs, workplaces and the national comparison

**Was:** Cluster health opened with broader polymer job losses without a workplace
comparison. A national-to-regional ratio of growth rates was described as the share
of regional decline accounted for by national conditions.

**Is:** The opening now shows private plastics-and-rubber jobs falling from 19,811 to
17,770 during 2022–2025, while annual-average establishments moved from 361 to 364.
Both fell over the full decade and in the final year, so roughly stable workplaces is
limited to the recent window. State, national and county comparisons accompany it.
The broader three-industry register remains separately labelled, with a descriptive
national comparison and no causal share assigned.

**Cause:** Adding establishments and alternative windows exposes a distinction the
jobs-only opening did not measure. Dividing growth rates cannot identify causes, and
aggregate establishments cannot show what happened inside the same plants.

## 2026-09-08 — Directory summaries and the scope of verification

**Was:** The hub said national patenting had barely moved while its article reported
a 22% decline. It repeated outdated program, wage and federal summaries. Repository
documentation implied every sentence had a check and upstream refreshes reproduced
identical bytes.

**Is:** Directory summaries match the linked articles, including the 22% patent decline.
Readers reach articles through four direct choices before the detailed gallery and
methods. Documentation distinguishes recorded assertions, independently checked
source inputs, pinned rebuilds and live refreshes. Program charts and the Atlas retain
their records in mobile layouts; keyboard access and article landmarks are added.

**Cause:** Parallel summaries and broad verification promises had drifted from the
underlying evidence. A passing assertion suite does not establish complete source
acquisition, validate every sentence or prevent upstream revisions.

---


*Edited 2026-09-01, the day they were written: the seven newest entries below were trimmed to this register — what the page said, what it says now, what caused it. Every figure, date and name in them is unchanged. What was removed is process: how the errors were found, by what, and in what order. That belongs in the project's working notes, not in front of a reader, and it is preserved there verbatim. The five older entries from the same day were already in this register and are untouched.*

---

## 2026-09-01, twelfth entry — thirty corrections from a re-derivation of every open finding

Every outstanding finding about the world was re-derived from primary sources before
anything changed. Thirty corrections follow. Twelve proposed changes did not survive
re-derivation and are not made; twenty-three findings could not be settled either way and
are recorded as unverifiable rather than guessed at.

**A page named the wrong federal series in four places, *revisions*.** **Was:** the chart
title, the screen-reader description, the methodology block and the headline vignette all
named a BLS series the page does not use, and the names collide with a real, different
series. **Is:** the series the page actually draws, named the same way in all four places.
The headline case straddles a BLS policy change that is now disclosed, and the
corrections-per-revised-month figure is restated against the base it is computed on.
**Cause:** hand-typed titles, never checked against the series identifier in the data.

**"The school the field is named for," *programs*.** **Was:** that phrase, of the
University of Akron. **Is:** removed. Polymer science is not named for the university: the
word is Berzelius, 1833; the institution was chartered as Buchtel College in 1870.
**Cause:** a flourish written for rhythm, guarded by no claim.

**The anchor pointed at the wrong number, *programs*.** **Was:** "graduated two polymer
undergraduates" offered as the figure to hold. **Is:** the master's line, 66 to 16. The
undergraduate line runs between zero and three in every year the record reports, so the two
in 2023 carries one seventieth of the fall; graduate degrees are 42 of the 44 completions
left. **Cause:** the smallest series was chosen for the sentence because it made the
starkest number, not because it carried the fall.

**Two dates, *programs*.** **Was:** the board vote in December 2024; Terra State's fiscal
watch in April 2026. **Is:** the board vote on 15 April 2025, adopting the president's
recommendations, with four faculty leaving voluntarily; the fiscal watch in March 2026, the
Auditor of State writing on 17 March and Directive 2026-009 following on 23 March.
**Cause:** the December date also sat inside the page's own correction box, so the
correction was carrying the error.

**Degree names, *programs*.** **Was:** five institutions "awarding polymer engineering
bachelor's degrees". **Is:** two of the five award engineering technology degrees, and
Western Washington's has been renamed. **Cause:** the programme names were typed from a
list, not read from each institution's own catalogue.

**A federal award understated by $634, *timeline*.** **Was:** a figure $634 below the
record. **Is:** the record's figure, to the dollar, as every other award on the page is
given. **Cause:** a transcription.

**Two wrong instructions in the replication guide, *sources*.** **Was:** that a federal
origin-destination file has no industry dimension; a 2025 CPI-U annual figure. **Is:** the
file has one, and the recipe uses it; BLS does not publish that 2025 figure as an annual
average, and the guide now says which figure it hands out and why. **Cause:** a recipe
written from memory of the file rather than from its documentation.

**The award and the designation, *the front page*.** **Was:** the $51.0M award equated with
the October 2023 federal designation. **Is:** two events, ten months apart, named as two.
**Was:** the scripts described as CC BY 4.0. **Is:** the repository dual-licenses; the
scripts are under the MIT licence. **Cause:** two appositives nobody re-read.

**A regional census the files cannot supply, *occupations* and *cluster-health*.** **Was:**
"the region's three universities", and 63 polymer degrees attributed to three. **Is:** the
chart draws the three institutions in its file and says so; the region has four conferring
in these codes, Youngstown State inside PIC-12 among them; and only two, Case Western and
Akron, file under a polymer code, so 63 is theirs. **Cause:** a hard-coded list of three
unitids described as if it were a census.

**Also corrected:** *accountability*'s accessible chart description misstated how many
commitment dates had passed; *peers*' claim register still described the BMW sentence
repaired earlier in the day; *scorecard* carried a universal negative about this repository
that the repository's own shipped data falsifies.

## 2026-09-01, eleventh entry — a removed row, and the count that moved with it

**Was:** earlier in the day a row recording a named company's unsuccessful application was
rewritten to describe the decision without naming the applicant, and kept, because it was
one of the 68 events behind the page's exact seventeenfold cadence. **Is:** the row is
removed. The anonymisation did not hold: the same page names the company joining the cohort
four months later and establishing Ohio operations two months after that, in a cohort of
nine, so the date, the reason and the sequence identified it to anyone who read the page.
And the count was never a reason to keep it: a cadence of delivered events should not have
counted a rejection, which is a filter outcome, not an event.

Every figure that rested on the row has moved, and the page recomputes them from the
register: **103 dated events, not 104; 86 inside the calendar window, not 87; 68 delivered
there, not 69; 67 delivered since the designation, not 68; 29 delivered in 2025, not 30.**
The cadence is 67 to 4, **close to seventeen times rather than exactly seventeen**.
**Cause:** the first fix protected a headline number instead of the person the row named.

## 2026-09-01, tenth entry — the lesson we told people to copy was wrong about its own record

**The flagship self-correction misdescribed the error it teaches, *sources*.** **Was:** the
$160M printed for NSF award 2532460 was "a programme ceiling, the maximum the programme
could reach across every recipient and every renewal", and "no source ties that ceiling to
this award". **Is:** the $160M is this award's own ten-year ceiling, phased and contingent
on milestones, stated by the awardee in print: $7.5 million in each of the first two years,
$15 million in each of the next three, $20 million in each of the last five. The schedule
sums to $160 million exactly; its first tranche is the $7,499,984 the NSF record shows
obligated for FY2026; the award runs to 2036. The real error was a milestone-contingent
ceiling published as a value. The "factor of 10.7" set a ten-year ceiling against a two-year
estimated total; both comparisons are now given. **Cause:** the correction was written from
the NSF record alone and never against the awardee's own announcement.

**A count the front page contradicted.** **Was:** the hub's chain card said 785 companies
while the chain page says 721. **Is:** 721 on both. **Cause:** the hub card is guarded by no
claim.

**The right-of-reply disclosure covered organisations only.** **Was:** "No organisation
named on this site was contacted before it was published." **Is:** "Nobody named on this
site was contacted before it was published" — the site names some twenty living
individuals, mostly in the timeline and the heritage register, and the sentence now covers
them. **Cause:** the disclosure was written for companies and colleges and nobody counted
the people.

## 2026-09-01, ninth entry — a name that should not have been here, and a register that had stopped being rebuilt

**A named company published as an unsuccessful applicant, *timeline*.** **Was:** "Materium
Technologies NOT accepted into Synthe6 cohort 1 (no Ohio place of business)", on a site
whose README withholds two entire pages because "naming an unsuccessful applicant is not
something a funder gets to do". **Is:** see the eleventh entry: the row was first
anonymised, then removed. The company's later rows stay; it established Ohio operations and
joined the cohort, and both are public. **Cause:** an internal register row shipped without
the README's own rule being applied to it.

**Seventy-four companies carried a hidden verdict, *chain*.** **Was:** every row in the
served register carried a `rel` field, and for 74 named private firms its value was
`not_relevant`, on a register whose own source note says any public release is gated on
member consent. No page read the field. **Is:** gone from the data and from the builder.
**Cause:** a field nothing rendered, so nothing reviewed it.

**Two universals on the front page, *the front page*.** **Was:** "Every page is built from
federal data that costs nothing to obtain" and "Nothing reads a private table." **Is:**
twenty of twenty-three pages are built entirely from free federal data; chain reads PIC's
own company register, and timeline and accountability read PIC project records, and all
three are named as not reproducible by a reader. **Cause:** sentences that were true when
written and never re-read as pages were added.

**The sources register had frozen, and three figures had drifted with it, *sources*.**
**Was:** the register held fifteen of twenty-four sources and eighteen of twenty-three
pages; the page said the region's universities awarded 1,231 degrees on the core codes,
1,490 with the adjacent codes, 21 percent more. **Is:** all twenty-four and twenty-three;
**1,175, 1,432, and 22 percent.** **Cause:** the build refuses to publish a source without
a written statement of what it cannot tell you; nine had none, so the build failed and was
not re-run. The page kept publishing the older pull. A check now fails the build when the
register and its source file disagree, and a second, `tools/furniture.mjs`, fails it when a
number printed on a chart is said nowhere else on its page; on its first run it found one,
a 0.034 move in a *cluster-health* caption, now guarded by that figure's claim.

## 2026-09-01, eighth entry — the reader, who had no way in

**An internal note naming a third party was published.** **Was:**
`programs/INTEGRATION-NOTE.md` and `atlas/INTEGRATION-NOTE.md` were tracked, deployed and
served, carrying the project's own process notes, the names of private sibling
repositories, and an individual outside the project named as an unresolved publication gate
on a page about her sector. **Is:** both removed. **Cause:** the deploy uploads every
tracked file, and nothing a reader came for was in them, which is why nobody looked.

**A way to report an error that did not exist.** **Was:** the README and this log said
"Open an issue — the Data error template asks for the page, the figure, and what you think
it should be." There was no template. **Is:** the template exists and asks for those three
things; the address in every page's corrections block is a link, with the issue route
beside it. **Cause:** a promise written before the thing it promised, and guarded by no
check.

**No right of reply, and the site did not say so.** **Was:** companies, colleges and
institutions characterised from public records with no disclosure that none had been
contacted. **Is:** every page's corrections block says so. **Cause:** a filing describes
what an organisation reported, never what it knows about itself, and the site had not
admitted the difference.

## 2026-09-01, seventh entry — the register behind the site, and a county in the wrong state

**Sixty-four Michigan companies counted as Northeast Ohio, *chain*.** Wayne County exists in
both Ohio and Michigan and the company register joins on the county name with no state. Of
eighty rows tagged Wayne, sixty-four are in Wayne County, Michigan — Detroit, Livonia,
Plymouth, Dearborn, Westland and fourteen other cities — and sixteen are in Ohio. **Was:**
"All 785 companies the Polymer Industry Cluster has classified in the fourteen counties of
Northeast Ohio." **Is:** 785 county-tagged rows, of which the corrected regional count is
**721**; the page says so in its standfirst until the register is re-keyed. The evidence
cards had rendered "Detroit, Wayne County" under a Northeast Ohio masthead. **Cause:** a
join with no state, a producer that cannot be re-run, and a caveat saying "a county can
exceed 100 percent" that pre-explained the one signal that would have caught it — Wayne was
the only county over 100, at 185 percent, and 44 percent on its real Ohio rows.

**The provenance page was behind the site it documents, *sources*.** **Was:** "All fifteen
datasets, with what each one cannot tell you." **Is:** fifteen of the site's twenty-four,
and eighteen of its twenty-three pages, stated as such until the register was rebuilt later
the same day (ninth entry). **Cause:** every gate checks the page against the register, and
the register was the thing that had gone stale.

**Two false universals on the two pages that teach the method.** **Was:** "Every number on
this site carries a written condition that ties it to its source" (*sources*) and "Every
sentence here is tied to its source by a check that can fail" (*the front page*). Neither is
true: the site carries 519 claims and far more than 519 numbers. **Is:** "Every claim here
names the condition under which it stops matching its source," true of all 545 claims, and
honest about what such a condition can settle: that a sentence stopped matching its own
file, never that it is right about the world. **Cause:** a universal written for force.

**BMW's plant is in a different metro from the one the sentence explains, *peers*.**
**Was:** "Greenville, South Carolina holds Michelin's North American headquarters and the
only US assembly plant of BMW." **Is:** Michelin is right; BMW's plant is in Spartanburg
County, a separate metro area that is not in the Greenville-Anderson-Greer row. **Cause:** a
city name that straddles a county line.

**The register's self-count was pinned to numbers the site outgrew, *sources*.** **Was:**
443 claims across seventeen pages. **Is:** 519 across twenty-two. **Cause:** the guarding
claim was pinned to stale literals deliberately so that the next regeneration would fail
loudly rather than let the paragraph re-render behind a reader; it did.

## 2026-09-01, sixth entry — the chart furniture, the least-governed surface

Two independent figure audits swept every chart on the site and found the same thing:
the defects were not in the numbers. Every one of them lived in a HAND-TYPED string —
an SVG `<title>` a screen reader announces, an HTML `fig-title`, a swatch key, an
in-plot annotation tail. Strings COMPUTED in `app.js` were clean throughout. The claims
apparatus binds sentences to data and nothing binds chart furniture to the sentences,
so a passing suite and a false figure caption coexisted on fourteen pages.

**A filing gap was published as a closure, *programs*.** The in-plot bar tail read
", ended 2015" against Terra State, on the page whose own README says "'Ended' is not
'closed'" and whose own source line records that Terra State narrowed to a single
certificate that is still offered. The record's flag means only that no completion was
filed for two years or more. **Was:** ", ended 2015"; the lede key "light bars ended";
the note "the largest ended program ... ended 2015". **Is:** ", last filed 2015"; "light
bars filed no polymer completion in 2023"; "the largest record that stopped ... last
filed 2015". The same lede also claimed sixteen bars where the chart draws the largest
eight; the chart's own subtitle had said eight all along. The DATA still ships
`status:"ended"` for six of sixteen rows and still needs renaming to its predicate
(`last_filing_year` / `zero_completions_2023`); that is a builder change and is
referred, not done here.

**An alt text carried a verdict the page withheld, *laborshed*.** The matrix
description told a screen-reader user the share each county fills from home is "weak
everywhere" while the chart's own callout said "whether that is low is what the
benchmark below settles" — and the benchmark settles it the other way, 378 of 397 peer
counties doing the same. **Was:** "weak everywhere". **Is:** the predicate only, plus
the callout's own deferral. Separately, the peer-region description called its bars
"Ranked" when the code sorts by county count, which the visible subtitle states
correctly.

**A figure title contradicted its own subtitle, *occupations*.** **Was:** "below half
their 2014–2021 pace". **Is:** 2014–2020 — the period the subtitle, the annotated rule
at 71 and `claims.json` all use. 2021 is itself a below-half year, so the title had put
a fallen year inside its own baseline. The claim guarding this sentence QUOTES the
figure title and states the correct period; it passed anyway, because the assertion
reads the data and never the string.

**A corrected number survived in the alt text, *sources*.** The dependency description
still led QCEW "at eleven" after the 2026-08-30 correction to nine. **Is:** nine of
eighteen. The same figure's title read "One source carries most of this site" over nine
of eighteen, which is half. **Is:** "No other source feeds more than five of the
eighteen pages" — the true sentence and the better one. The claim now asserts the
runner-up at five rather than merely under nine.

**A key named one footprint for two, *chain*.** The swatches read "Classified companies
in the 14 counties" and "2026 applications naming that stage"; the second is PIC-12,
twelve counties, which the lede says and the key did not. The first also called all 785
vault companies "classified" when 611 carry a value-chain role. **Is:** both footprints
named in the key and in the alt text, and the source line reads "the 611 of 785 NEO-14
companies that carry a value-chain role".

**"None has resolved" outran the register, *accountability*.** The earliest commitment
is dated 15 August 2026, seventeen days past, and the chart draws no today rule.
**Was:** "none has resolved". **Is:** "the register records no commitment as delivered",
which is what the file supports. In the same band, a five-row table captioned "Five
published figures describing one R&D competition" contained one row describing a
workforce award instead, and a cell said "the only one of these four" in a table of
five; both now scope themselves.

**A denominator lived only in the alt text, *federal-money*.** "Two companies hold 56%
of the contract dollars" rests on a $329.5M award-basis total that appeared nowhere on
the figure and is a different measure from the $279.3M chart above it. The subtitle now
names the base.

**Two chart titles carried no claim, *patents*.** **Was:** "Four lines, two stories" and
"Ohio polymer applications by filing year", with the finding left to the H2. **Is:**
"Only the polymer lines fell far below their 2015 level" and "Ohio's three newest bars
are still filling, not falling". The index chart's dashed rule at 100 was unlabelled on
a vertical scale that starts at 73; the rule now reads "100 = the 2015 level" and both
the subtitle and the alt text declare the crop. The page's meta description still said
the national polymer field "barely moved" after commit 9a71687 corrected the standfirst;
it fell 22 percent.

**A map stated an encoding it does not use, *atlas*.** **Was:** "Area is every
completion it ever conferred". The code is `r = 2 + sqrt(v) * 0.32`: with that floor,
area spans about 67 times over a 1-to-2,830 range and the median dot draws roughly twice
its proportional area. **Is:** a square-root radius with a stated minimum size, and the
source line says the dots rank the record rather than compare areas. The encoding is
unchanged; only the description of it was wrong.

**Four more of the same family.** *churn*: a table captioned "Hire rate, separation rate
and the gap" carried column headers reading "Hiring rate" and "Leaving rate" — three
vocabularies for two concepts, announced by a screen reader on every cell. *reach*: an
H2 read "A quarter" where the share is 22.65 percent and the page prints 23 percent
three times, and the map lede promised one-paper institutions were "listed in the table
under it" when that table holds the forty largest. *index*: the hub card for *revisions*
named a "resin" producer-price series that does not exist in the file; the three are
industrial chemicals, rubber and plastic products, and plastics and rubber plants.

**What none of this changes:** no chart's data, no chart's encoding, no analysis. Every
correction above is an editorial string that had drifted from the figure it sat on,
which is precisely the surface no gate reads.

## 2026-09-01, fifth entry — the money pages, corroborated against the record

An outside corroboration pass read four money pages against the federal record itself
rather than against their own data. Six published errors came back. One of them is
this site's worst kind: a page whose entire argument is that a number needs a fair
comparator had published an unfair one.

**The comparator was the wrong kind of money, *federal-money*.** Band 2 set the polymer
flow against "every industry in these twelve counties" and got $235.5 billion, "nearly
all of it aerospace, defense and health contracting", and a ratio of one dollar in 840.
The numerator was contracts. The denominator was every federal instrument there is, and
about 85 cents in every dollar of it is direct payments and other financial assistance:
Social Security, Medicare and veterans' benefits, which no manufacturer can bid for.
**Was:** $235.5 billion, one dollar in every 840. **Is:** federal prime contracting of
every industry in the same twelve counties, $9.2 billion in 2025 dollars, one dollar in
every 33. The comparator was twenty-six times too large, in the direction that made the
cluster look smaller. Both series are now pulled with the same award-type filter and the
ratio is computed inside one block; the old claim guarded the quotient and never the
units, which is why it passed on every run for as long as the sentence was wrong.

**"No public record says what has been paid" was refuted, *accountability*.** The
section heading, the figure title, an empty dashed third stage labelled *no public
record exists*, and the figure-registry entry that licensed all three. USAspending
publishes an outlay field on federal assistance awards and it is filled on seven of the
eight federal lines in the register: **$11,642,402 against $48,114,979, 24.2 percent**.
**Was:** an absence presented as a property of the record. **Is:** the stage is part
filled, the bar carries the federal figure, and the remaining absence is named for what
it actually is: the $31,250,000 state grant is not a federal award, and EDA award
ED25HDQ0G0009 ($5,970,805, Huntsman) has no USAspending record of any kind, which is a
missing row and not a payment of zero.

**A verification claim that had not been verified, *funding-map*.** **Was:** "All seven
EDA figures are verified against signed federal Notices of Award", cross-checked
"against USAspending.gov by award ID". **Is:** six reconcile to the dollar and total
$45,030,608; the seventh has no USAspending record and EDA's own award page names no
company, so what corroborates it is arithmetic, not execution.

**Three characterisations of named private companies.** *federal-money* called III
Williams "one belting supplier" on the strength of a census code that holds 69 percent
of its dollars; its line items are belts, hose assemblies, tube fittings, adapters and
seals, and it is now "one industrial distributor, III Williams of Chardon", with the
code named as a code. HDT's "$39 million of field air conditioners" gains the scope
clause it needed: $35.1 million of it is one award opened in 2014, transferred from a
General Services Administration schedule, carried into this window by the whole-life
basis. And *funding-map* now attributes Full Circle's tire chemistry to the award
document, which describes it, rather than to the company, whose own site describes
industrial recycling and compounding.

**Two figures on the wrong basis.** NEO-SMART's $15.0 million was printed inside an
obligations paragraph and registered with the basis "obligated"; it is the estimated
total of a ten-year cooperative agreement, of which **$7,499,984 is obligated**, and
both pages and the registry now say which is which. And the $10.42 million beside the
Ohio Innovation Hub grant was called **state cost share** on *funding-map* and inside
*accountability*'s $20,954,667; every public record of that award, including the
Governor's office announcement of 5 September 2024, describes it as matched by local
partners. The figure was right and the promiser was wrong.

**One thing the corroboration got wrong, recorded because it was checked.** The
comparator error was reported as about thirty times; it is twenty-six. The benefit share
of the old denominator was reported as 86 percent; it is 85.5. And MQM Solutions, flagged
as at risk of reading as a failing firm, carries no sentence, label or annotation of the
kind on any page: it is one bar among ten in a chart whose subtitle already states the
whole-award-life basis.

## 2026-09-01, fourth entry — the atlas re-projection, and a page with no producer

The atlas carried a banner saying it was stale and must not be published until
re-projected. It was published anyway, on 2026-08-31, banner and defect intact. The
reason turns out to be worse than an oversight: **the script the banner told everyone
to run does not exist in this repository, and never did.** `atlas/data/viz-data.json`
is a shipped file with no producer, so the correction it needed could not be delivered
by anyone who followed the instructions. A producer has now been written
(`_data/build/atlas_reprojection_patch.py`, idempotent, with a `--check` mode that
re-derives from the source API), and the atlas is listed in REBUILDING.md as what it
actually is.

**What was wrong.** The upstream mirror republished 2019's completions under the label
2020 — the same defect the programs page had already quarantined. The atlas never got
that quarantine, so every institution's lifetime record counted 2019 twice.

**Verified before changing anything.** The whole 1991-2023 census was re-pulled from
the source endpoint and reproduced the shipped file exactly — all 147 institutions on
every field, zero mismatches — before a single year was removed. 2020 is
byte-identical to 2019: 807 awards across 59 institutions.

**What moved.** The record total **20,859 to 20,052**. The top three **7,651 to
7,401**, and their share of the whole **36.7 to 36.9 percent**. Forty-four
institutions' lifetime totals changed, including Lowell **2,929 to 2,830**, Ferris
State **2,599 to 2,525**, and Akron **2,123 to 2,046**. Eighth and ninth place swap:
Penn College now leads Case Western. Four institutions' spans end in 2019 rather than
2020. The page's shape facts survive untouched and are now asserted: 147 institutions,
41 conferring in the last year, 35 states, four diamonds.

**Also corrected:** a claim's own falsification note said "Akron's record is second."
Akron's record has always been third, and nothing had asserted the order.

Separately and with no reader-facing change, the sources page's prose now exists in
the HTML rather than only in JavaScript. Thirty-one paragraphs that a reader without
JavaScript saw as empty captions — including the location-quotient worked arithmetic
and the field-name recipes — are now real text, pinned by assertions. Three model
families reading the page cold had each stopped there.

## 2026-09-01, third entry — the depth audit's second wave

The flip-risk pass finished its sweep of the remaining ten pages. Both education
beats survived full independent replication; the corrections below are what did not.

**"Concentration fell" was a disclosure artifact, *cluster-health* and
*location-quotient*.** Lorain's paint cell went dark in 2025; the moving-set
composite kept all twelve counties in its denominator and manufactured a fall. On
the fixed county set the reading ROSE to an eleven-year high. **Was:** down 0.44 to
5.96, fourth lowest of eleven, the longest bar, "a step toward looking like the
country." **Is:** up 0.11 to 7.68 on the fixed set, the highest standing of eleven,
the longest bar belongs to employment, and the tile sentence reversed. The
suppression note that licensed the old reading stated the direction backwards ("a
ceiling" — it is a floor that sags) and is corrected at its source. The guard now
asserts both bases and their divergence, so a county going dark can never again
read as an industry shrinking.

**The tide was measured on the wrong window, *cluster-health*.** On the headline's
own 2022-2025 window the industry accounts for about seven-tenths of the gap, not
three-fifths.

**"The ordering holds after inflation too" was checked at the wrong level,
*cost-scissors*.** In posted prices the story stands; deflated, the middle
reorders — resin's real spike is essentially all given back, finished products
about a quarter. The page now says both, the meta note states what was actually
checked, and the zero-crossing beat carries the revision-band caveat its own
archive implies.

**Smaller record fixes:** atlas's opener drew 146 ticks under a hand-typed 147 (now
147 drawn, caption derived) and a tile guard-rail sentence denying a set membership
that is true; timeline's "the register records nothing at all until 2023" is a
silence in the proven rows, not the register, and its 17-times pace now names what
it counts; revisions' "largest single revision" was a net of three (largest single
is 1.40 percent), its "half of all revisions" was the wrong unit (half of revised
months), and the 2026-08-28 correction finally reached the SVG title and README;
sources' "forty-five of fifty-one readings" counted groups beside their own parts
and now says so. And the programs page gains the comparison it was missing: against
8,736 peer-trade programs pulled by the same rule, polymer technician programs
failed to take hold at about two and a half times the base rate — a control that
reproduces the page's own published figures before it writes.

## 2026-09-01, second entry — the depth audit's fix wave

A new review layer — the flip-risk and comparator census — attacked every headline
interpretation with alternative cuts, and a fix wave re-derived each finding before
touching anything. Three audit premises died under re-derivation (recorded here with
the corrections, because a check that can be wrong and caught is the only kind worth
trusting). The changes a reader could have quoted:

**The degrees series was mis-dated three years running, *occupations* (and echoed on
*scorecard*, *cluster-health*, *patents*).** The upstream mirror served three
collection years under the wrong labels and omitted one year entirely. Corrected
series: 124 (2020), 54 (2021), 62 (2022), 63 (2023) — the halving happened a year
earlier than every page said, a missing year (62) exists, and the three-year window
average is 59.7, not 80.4. Each echoing sentence is corrected on its page.

**"Roughly halved, alike" was neither, *patents*.** Ohio's non-polymer filings fell
12 percent while polymer fell 25 — and against the national trend, polymer is the
part of Ohio patenting holding up best (its share of US polymer filings rose). The
sentence now states both halves; a claim guards them.

**The hero stat row was on the disavowed basis, *federal-money*.** It printed $34.9M
and 1.5 — the eight-year mean the page's own claim names as the figure not used —
while every other surface printed $36.6M and 1.4. Aligned; both tolerance bands
tightened below their flip thresholds. A robustness beat now prints the
exclude-largest counterfactuals ($25.0M and 2.0 years without the top code; $13.7M
and 3.7 years without the top two), guarded.

**The average Chicago job already clears the bar, *realwage*.** The $71,000 line is
a matched-offer threshold, and the page now says in prose what its interactive
verdict said on click: Chicago's average polymer wage ($91,780) clears it, and 18 of
56 big metros beat Akron on real wages. The Los Angeles "same salary" beat was a
counterfactual no candidate faces (the real wages tie); rewritten. The hero's
"below the middle metro" now names its 56-metro denominator inside the quotable span.

**Both headline bases now speak, *laborshed*.** "No county fills even seven of ten"
holds only counting every resident; on the in-state basis the page's own peer chart
uses, Ashtabula fills 72.7 — the H2 now carries its basis. "Only Pittsburgh keeps
more of its work inside itself" reverses on the resident side (we keep more of our
people); both directions now print.

**The label lied, not the counts, *churn*.** Thirteen surfaces said the flows were
seasonally adjusted; the shipped data was unadjusted all along (the audit's own
premise inverted — it read the label and indicted the counts). Relabelled
everywhere; a claim now asserts the seasonality still present in the data. The H2's
"has risen and not come back down" became the true shape: above its 2012 level,
fallen every quarter since the 2022 peak.

**The joint-paper series was a year stale and the run miscounted, *collaboration*.**
Refreshed through 2025: 208 papers (eight in polymers), and the fall ran four years
(2021-2024), not three, before 2025 rose to six. The standfirst now draws the shape
the chart draws.

**Route names replace a coarse flag, *funding-map*.** The H1 ("no two move the money
the same way") was adjudicated true — the machine cards were right and the data
field was too coarse to show it. The field now names the three routes and a claim
asserts their distinctness.

The hub inventory re-summed for all of the above: twenty linked pages, 451 checked
claims, 19 of them resting on a document a person read.

## 2026-09-01 — nine corrections from the full-site first-read pass

The register audit and a per-page re-derivation fleet finished sweeping every page.
The data layer survived intact — no number, derivation, or chart changed — but nine
published sentences had drifted from the figures beneath them. Four drift classes:
a wrong basis, rounding toward the finding, generosity toward ourselves, and
staleness.

**The hero was on the basis its own claim disavows, *federal-money*.** The H1 said
"about $35 million a year" — the eight-year mean that `fed-annual-rate` names as the
figure NOT used, because it averages in a fiscal year still in progress. The headline
basis (`fed-closed-average`) is the seven closed years' $36.6M. **Was:** about $35
million. **Is:** about $37 million.

**An average read as all-industry, *realwage*.** "Averages across every job the
federal wage count covers in each metro" → "every **polymer** job…". The figures were
always polymer-scoped; the sentence wasn't.

**An exact-match claim the check band contradicts, *location-quotient*.** "Matches
the Bureau of Labor Statistics' own published figure to the last digit it prints" →
"where the bureau publishes its own, the two agree to every digit it prints." Same
page: the standfirst implied rubber products was a fourth cluster industry; it is a
slice of plastics and rubber products, and now says so.

**A standfirst more generous than its own bands, *accountability*.** "The rest goes
straight to the organisations delivering the work" — but $6,165,608 names no
recipient yet and $23,094,356 names a programme or a building. **Is:** the three-way
split the page's own figures support ($4.1M names the Chamber, $51.9M a firm or
university, $29.3M a programme, a building, or nobody yet), guarded by the new
`acc-hero-split`. The nearby "the funders pay those other recipients directly"
becomes commitment language: an obligation is not an outlay.

**A title that understated the fall, *scorecard*.** "Ran near 120 a year for a
decade, then dropped to 54" → "between 118 and 179 a year through 2021, then dropped
to 54." The old form made a 65 percent fall look like 48. Guarded by `sc-talent-title`.

**Two roundings that leaned toward the finding, *programs*.** "Barely one in four
still awarding" (27.4% — above one in four) → "just 20 of 73, a little over one in
four"; "lost three programs in four" (72.6%) → "lost nearly three programs in four."

**A duration the settle data contradicts, *revisions*.** "Revising that figure for
years" → "for months afterwards," which is what `rev-settle` measures.

**A not-yet list of things that had shipped, *sources*.** The "what this page is not
yet" note still promised the labour shed, federal contracting, the nominal-real
question, and the held-back sentences — all four now live. Rewritten to say so.

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
