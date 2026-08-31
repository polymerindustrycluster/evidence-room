# accountability — what PIC promised, what has landed, who is in the coalition

**Status: unreviewed draft. Not linked from any index (see `.unlisted`).** Built from
`SPEC-public-scorecard.md`, publication mode INSTITUTIONAL, archetype 4 (a maintained data
product). The page answers one question: of the $106.3 million PIC reports securing, how
much sits on award lines naming PIC's own organisation, what has PIC committed to in
writing, and what can no public record say.

Today it computes: **$4,149,515** attributed (4.9% of $85,335,784 awarded), **18** dated
commitments (1 numeric outcome, 12 milestones, 5 award-period ends; 8 PIC-owned, 10
partner-owned), **27** executed award lines across **21** recipients and **8** award IDs,
**11** lines carrying **95.5%** of assigned money, **3** targets on the board and **0**
owners, **7** rows no public record can fill, and **n = 0** resolved commitments, so no
keeping rate renders.

## Files

```
index.html                 page shell; house anatomy (mast, draft banner, hero, bands, closer, footer)
styles.css                 page-local only; shared column system untouched
app.js                     charts, tables and the promise register, bespoke per house practice
derive_accountability.py   writes data/accountability.json from shipped upstream files
data/accountability.json   GENERATED, committed
data/promises.json         the promise register; seeded once by hand, append-only
data/recipient_types.json  the recipient typing funding.json does not yet carry
claims.json                24 guarded assertions, each re-run against the SOURCE page's data
UPDATES.md                 the update log, distinct from the repo's CORRECTIONS.md
.unlisted                  why this page is not on the hub
```

## How it regenerates

```
python3 accountability/derive_accountability.py
node tools/bundle.mjs accountability
python _data/build/verify_claims.py accountability
node tools/verify.mjs accountability && node tools/collide.mjs accountability
node tools/columns.mjs accountability && node tools/textsize.mjs --mobile accountability
```

`derive_accountability.py` reads and never re-fetches: `../funding-map/data/funding.json`,
`../scorecard/data/scorecard.json`, `../timeline/data/timeline.json`,
`../federal-money/data/techhub.json`, `../federal-money/data/federal.json`,
`../location-quotient/data/lq.json`, `data/promises.json`, `data/recipient_types.json`.

`claims.json` re-runs each sentence against the **upstream** file, not against this page's
generated output, the way `index/claims.json` does. A correction on `funding-map/` fails
this page instead of leaving a stale figure standing. One claim, `acc-generated-fresh`, runs
the other way: it checks the shipped `accountability.json` against those upstream files, so
a page rendering yesterday's arithmetic fails loudly.

## Provenance registration (done)

`_data/SOURCES.json` now carries this page in `by_artifact`, so `verify.mjs` passes and the
"Reproduce this" block renders:

```json
"accountability": ["usaspending", "public_record", "qcew", "ipeds"]
```

- `usaspending` — the award register, the EDA Tech Hub award file, and the background rate
  of routine federal obligations (bands A, B, C, and the additionality sentence in F).
- `public_record` — the compiled public event register behind the promise register and the
  three R&D counts (bands D and E).
- `qcew` — the 364 plastics and rubber establishments across the twelve PIC counties, the
  one line of context beside the membership goal (band D).
- `ipeds` — the two board talent-row defects quoted verbatim in the band F source line.

Every other gate passes: 24 of 24 claims, no collisions, all elements on-column at seven
viewports, all text at or above the 12px rendered floor at 375px.

## Two traps

**1. Two subtractions that look like one number.** `$81,186,269` is awarded minus the
Chamber's lines; `$75,020,661` is assigned minus the Chamber's lines. Both are true, they
differ by the $6.2 million with no recipient named yet, and printing them on one page is
the constructed-unit trap: a reader cannot tell which denominator moved. The page uses
`$75,020,661` in the callout and on the chart, one denominator, guarded by
`acc-attribution-note`. Do not introduce the other figure without renaming both.

**2. A register that narrows quietly.** The promise register is append-only. If a forward
commitment disappears from `timeline.json`, the honest record is a dated entry in that row's
`history[]`, never a deleted row. `derive_accountability.py` raises when the row count
diverges from the forward-event count, and `acc-promises` asserts the two ID sets are
identical, so a swap that keeps the count at eighteen still fails. Never "fix" that failure
by editing `promises.json` to match.

## The update contract (archetype 4)

| What | When | Trigger | How it fails loudly | Owner |
|---|---|---|---|---|
| `derive_accountability.py` re-run | On amendment of the award register, and on any commit touching an upstream `data/*.json` | Upstream change | `acc-generated-fresh` fails on a stale generated file; `acc-attribution`, `acc-staging` and `acc-coalition` fail on the upstream file directly | PIC comms desk |
| Promise register read | **Quarterly, at quarter close, by a named person** | Calendar | The derive script raises when a `timeline.json` date differs from a row's `current_date` with no dated `history[]` entry | **Not yet assigned — Open Question 6.** Band D ships only with an answer |
| Calibration statistic | Quarterly, from resolved rows only | Calendar | `acc-promises-calibration` asserts `n` is counted from row status, never typed, and that no rate renders below the floor | Same |
| Staleness stamp | Continuous | `meta.fetched` | `PV.methodology()` stamps "Data as of {fetched}" into the masthead from the data. **A build failure when `fetched` is more than 180 days old is specified and not yet built** (it belongs in `tools/`, outside this page's scope) | Build |
| `UPDATES.md` | Every deploy that changes a reading | Deploy | An entry per deploy; an empty log is a signal, not a tidy state | Whoever deploys |
| `CORRECTIONS.md` | Whenever a published number changes | Correction | Repo law: dated, append-only, distinct from `UPDATES.md` | Repo |
| Band E table | On any new public count of the R&D programme | Publication | `acc-reconcile` asserts the three timeline events and their parsed numbers; a fourth count that is not in the table is caught at the quarterly read | PIC comms desk |
| Band F list 2 ages | Quarterly | Calendar | Each line carries `defined_on` and the page prints how long it has been empty | Build |
| Full gate run | Every PR and every deploy | CI | `npm run gates`, plus `columns.mjs` and `centres.mjs`, which are not in CI | Repo |

**Named check for Done:** `npm run gates && python3 accountability/derive_accountability.py`
passes on a clean tree, and a mobile render of every band is read by eye at 375px, because
`collide.mjs` is desktop-only and `.chart svg`-only and has reported no collisions on a page
carrying two visible ones.

## The seven open questions (verbatim from the spec), and what each changes

1. **Is there a dated, citable public document setting the 150-members-and-$1M-by-2028
   goal?** The repository holds none. With one, the goal becomes a promise-register row with
   a source. Without one, the row says PIC states the goal and no public document sets it,
   which is itself reportable. Either is publishable; inventing a source is not.
   *Changes:* today the goal renders in `.goalrow`, outside the register and outside every
   count. With a source it becomes an eighteen-plus-one row in `promises.json` and
   `acc-promises` moves from 18 to 19.

2. **Will the programme office state what each published R&D count counted** (proposals,
   full applications, cycles, or executed agreements) for 39/14, "5 of 38" and 59? Band E
   ships either way; this fills its last column and turns a disclosure into a reconciliation.
   *Changes:* three cells in band E read "not stated" today, and the figure title counts
   them. Answers fill the cells and the title recomputes; no shape changes.

3. **Do we emit the slip record?** The internal inventory documents 21 events with a
   planned-to-actual slip and the publication gate withholds them. Publishing even an
   aggregate over those 21 would report a statistic derived partly from records the gate
   exists to withhold, so the only defensible version is restricted to events already
   public, states how many were excluded, and separates PIC-owned from partner-owned dates.
   This decision cannot be un-made: a slip ledger published once and quietly dropped later
   is itself a story.
   *Changes:* today band F list 2 carries the line "Which published dates slipped before
   this register opened" with `fill_by: on the slip-record decision`. A yes adds a slip
   column to the register and removes that line; a no converts `fill_by` to a permanent
   reason.

4. **What is the floor for n before the keeping rate renders?** Recommendation: six resolved
   commitments. Below that the page prints the count and no rate.
   *Changes:* the calibration block prints `n = 0` and names six as **a stated default, not
   a decision**, in the block itself. A different floor is one value in
   `promises.json` `calibration.floor_n`; `acc-promises-calibration` pins the page to
   whatever it says.

5. **Reproducibility or reversibility for a consented roster?** Committing `roster.json`
   keeps the room's contract and makes names permanent. Fetching it at build time keeps
   names out of history and breaks reproducibility for that one file. Only one can be true.
   *Changes:* nothing today. The page ships in **mode 0, the spec's default: no roster at
   all.** The words "member" and "roster" appear only in the band C caption that denies the
   conflation and in the empty rows of band F. Mode 1 (counts only) would add
   `data/roster.json` and fill one cell; mode 2 (consented names) would add a second table
   and three build gates. Neither is built.

6. **Who reads the promise register each quarter, by name?** Band D ships only with an
   answer. Everything else on this page ships without one.
   *Changes:* the update contract above reads "Not yet assigned" in the owner column, which
   is the one cell in this README that should never say that. Until it is answered, the
   spec's own instruction is to ship bands A, B, C and F and hold band D, because an
   unmaintained promise register is worse evidence than no page.

7. **Does MarCom accept a hero that leads with $4.1 million rather than $106.3 million?**
   The page's whole credibility rests on that subtraction. If the answer is no, this is a
   different page and should not be built.
   *Changes:* everything. The draft is built subtraction-led so the question can be judged
   against something real. A no does not move the hero; it kills the page as specified.

## Defaults taken because a question is unanswered

These are defaults, not decisions. Each is stated on the page where it appears.

- **Roster: mode 0**, no roster and no counts (Q5). Band C is a register of recipients of
  record, and the caption says so.
- **Keeping rate: no rate below n = 6** (Q4). The calibration block prints the floor and
  labels it a default.
- **Slip record: not published** (Q3). It is a line in band F list 2 with a fill condition
  rather than a permanent reason.
- **Membership goal: shown, uncited, outside the register** (Q1), with an empty current-
  reading cell and its reason beside it.

## What the spec specifies that this draft could not build

- **The `county` column in band C.** The spec calls it a one-time collection from the award
  records. No shipped file in this repository carries a county for any recipient, so the
  column is absent rather than typed from memory. See `data/recipient_types.json` `_county`.
- **The upstream `kind`/`role`/`county` patch to `funding-map/data/funding.json`**, and its
  companion claim in `funding-map/claims.json`. Editing another page was out of scope, so the
  typing lives in `data/recipient_types.json` with a build guard that fails on any untyped
  recipient. Fold it upstream and delete that file.
- **The harness sentence and `acc-harness`.** The spec's rule holds (never print a hard-typed
  claim count) and this page prints none. It also cannot print a *read* one: `index/data/counts.json`
  reports 227 claims across 12 pieces while the repository carries 15 `claims.json` files, because
  `_data/build/derive_index.py` reads a hardcoded page list. Printing that figure would publish a
  number the reader can falsify in one directory listing, so the sentence is omitted until
  `derive_index.py` discovers pages by glob.
- **`tools/verify_promises.mjs`** and the 180-day staleness build failure. Both live in
  `tools/`, outside this page's scope. The derive script enforces the same promise-register
  rule locally and raises on a date that moved with no `history[]` entry, so the discipline
  is real today; putting it in `npm run gates` is the remaining step.
- **The `timeline/` swimlane component reused as-is.** `timeline/` is a legacy page whose
  figure code is not importable. The swimlane here is page-local and inherits the status
  encoding (hollow ring with a centre pip for scheduled, solid disc for delivered) plus
  `moved` and `missed`, added now so the first slip is not a schema change in the week it
  happens.
## The cold open, and what it cost (fixed 2026-08-28)

The draft shipped with the lead figure's top at **1,547px** measured at 1280 — no chart in
the opening screen, which is the one composition rule this house does not bend. It is now at
**882px**. Four changes, in the order page-design prefers them, and nothing about the band
order or the argument moved:

1. **The stat row moved out of the hero** to sit under the attribution chart's source line,
   which is what page-design prescribes when a hero cannot both carry stat cards and clear
   the fold. The three cards are unchanged; they now read as that figure's summary rather
   than as a KPI tile row a reader meets before any evidence. `.figv` was written for the
   dark hero, so `styles.css` restates its four colours for paper and gives the key card the
   INK rule the bars are drawn in. `acc-hero` still guards all three numbers; its `text`
   now says where they render.
2. **The draft banner is one line.** It says what it has to say — unreviewed, not published,
   not through marketing or communications review — in a sentence, at 49px instead of 241px.
   What the long version also said (which open questions are unanswered, which sections
   carry a stated default) is said on the page at each place it applies, and here.
3. **The headline is three rendered lines**, not four, which was a standing violation of the
   fixed headline stack independent of the fold. The subtraction stays above the fold and is
   now *more* complete there: the standfirst carries `4.9 percent of the $85,335,784 awarded`,
   which previously only appeared in a stat card 800px down.
4. **Band A's lede and how-to-read line lost a duplicated sentence.** Both said match is a
   promise made by other organisations and is never summed into the bar; the figure keeps it,
   because a figure has to survive being screenshotted alone.

**One reading changed.** Band A's H2 read "PIC holds 4.9 percent of the money it reports
securing". 4.9 percent is of the **$85,335,784 awarded**; of the $106.3 million reported
secured the same $4,149,515 is 3.9 percent. The H2 named the wrong denominator for the ratio
printed beside it — the constructed-unit trap this page's own README warns about, two
subtractions that look like one number. It now reads "4.9 percent of the $85.3 million
awarded". No published page ever carried the wrong sentence (this one has never been linked),
so it is recorded here rather than in `CORRECTIONS.md`; if the draft was circulated, it
belongs there too.

## Editorial notes for review

- One `.note` callout on the page, in band A, as the ink budget allows. Band B's two
  mandatory qualifications ride on the chart and in its beat, never in a tooltip.
- Band E's fifth row asserts a **disagreement** between two shipped files about award
  ED25OIE0G0108. `acc-reconcile-apex` fails the day somebody harmonises them, so a person
  decides which description of the Notice of Award is right.
- The spec's methodology defect 4 says "thirteen tracked degree programmes"; the shipped
  `scorecard.json` `meta.excludes` says eleven. The page quotes the shipped string verbatim
  and `acc-defects` asserts the quotation still matches.
