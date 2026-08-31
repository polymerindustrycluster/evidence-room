# scorecard — PIC's own performance, kept apart from cluster health

An EOS-style board view of what **PIC is accountable for**. Every other artifact in this
repository measures the regional polymer economy. This one measures the organisation, and
the two are held apart on purpose.

**This page is not linked from `index/`.** It stands alone: it is an internal working
view, and the hub is a public reading list.

## The distinction this page exists to hold

Cluster health measures the regional polymer economy, which PIC influences through award
money, convening and programs but does not control. The scorecard measures what PIC
itself answers for. They are never averaged, summed, or scored on one line. Letting
organisational growth stand in for regional outcomes, or regional growth stand in for
organisational performance, is the standard way economic-development reporting goes
wrong, so group D is separated structurally (its own group, its own ground, gray marks,
an `outside PIC` owner) and by a claim (`sc-context-separate`) that fails if a context
row is ever moved into an accountable group.

## Governance: why seven cells are empty

This repository is public and its history is permanent, and `CONTRIBUTING.md` rule 5
forbids member, applicant, or personal data. Every metric whose measurement lives in
PIC's membership register, general ledger, pipeline, or drawdown records is therefore
published here as a **defined empty slot**: the metric name, an operational definition,
an owner field, a cadence, a target field, and a visible "not published here" state.

No estimate, no rounded band, no zero. Three locks enforce it:

1. `derive_scorecard.py` raises if a vault row acquires a value at build time.
2. `app.js` throws in `assertEmpty()` if one arrives at render time.
3. `claims.json`'s `sc-empty-slots` fails if one is ever present in the shipped file.

Populating those rows requires a copy of this page kept **outside** a public repository.

## Row inventory

18 rows. 15 accountable (groups A, B, C), 3 context (group D). 8 accountable rows carry a
figure recomputed from public data; 7 are empty slots.

| Group | Row | State | Source |
|---|---|---|---|
| A | Members in good standing | empty slot | PIC membership register |
| A | Dues revenue, trailing twelve months | empty slot | PIC general ledger |
| A | Renewal rate | empty slot | PIC membership register |
| A | Earned-revenue share | empty slot | PIC general ledger |
| B | Award dollars with a named recipient | **92.8%** | funding-map |
| B | Named recipients under an executed agreement | **21** | funding-map |
| B | EDA implementation awards obligated to a project lead | **7 of 7** | federal-money/techhub |
| B | Ohio Innovation Hub dollars with a named recipient | **80.3%** | funding-map |
| B | Total public money secured | **$106.3M** | funding-map |
| B | Award dollars disbursed to recipients | empty slot | PIC drawdown records |
| C | Polymer-program credentials awarded, region | **63** | occupations (IPEDS) |
| C | Bachelor-level polymer credentials | **6** | occupations (IPEDS) |
| C | Materials-program credentials awarded, region | **33** | occupations (IPEDS) |
| C | Completions of a PIC-funded training program | empty slot | PIC and APEX program records |
| C | Member companies taking a program participant | empty slot | PIC program records |
| D | Plastics and rubber jobs, PIC-12 | 18,594 | occupations (QCEW) |
| D | Routine federal obligations to regional polymer firms | $34.9M a year | federal-money |
| D | Ohio's national rank in plastics and rubber jobs | 1st | peers |

### Group B is an assignment test, not a payment test

"Reached a named recipient" means the register carries an executed line item naming the
organisation that holds the money. $79,170,176 of $85,335,784 passes that test. The
$6,165,608 that does not is entirely inside the Ohio Innovation Hub grant, in two
workstreams (startup support, $3,523,500; PIC Translational R&D, $2,642,108).

**Obligated is not disbursed.** An obligation is a legal commitment to pay and an
executed sub-grant is a signed agreement to pay. Neither is a payment, and no public
source states PIC's drawdown, which is why `b-disbursed` is the one empty row inside an
otherwise populated group. A fully assigned award that has disbursed nothing and one that
has disbursed everything look identical on this page.

## What John must supply from the vault

Each line below is the exact definition the number has to satisfy, so populating a cell
later is a lookup rather than a judgment call. Put the filled copy **outside this
repository**.

| Row id | The figure needed | Exact definition | Cadence |
|---|---|---|---|
| `a-members` | integer | Organisations whose dues are paid and whose membership has not lapsed on the last day of the quarter. One organisation counts once regardless of how many staff it sends. | quarterly, at quarter close |
| `a-dues` | dollars | Dues cash **received** in the twelve months ending at quarter close. Excludes sponsorship, event fees and grant income (those sit in `a-earned`). | quarterly, at quarter close |
| `a-renewal` | percent | Members whose renewal date fell in the period and who renewed within ninety days of it, divided by all members whose renewal date fell in the period. Lapsed-then-rejoined counts as a renewal only inside that window. | quarterly, at quarter close |
| `a-earned` | percent | (dues + fee-for-service + sponsorship) ÷ total operating revenue, trailing twelve months. Grant drawdown sits in the denominator and never in the numerator. | quarterly, at quarter close |
| `b-disbursed` | dollars and percent | Cash actually paid out against executed awards at quarter close, ÷ dollars awarded ($85,335,784). Payments to sub-recipients count on the date PIC or the agency disbursed them, not on the invoice date. | quarterly, at quarter close |
| `c-completions` | integer | Individuals who **finished** a workforce program paid for by the APEX Good Jobs Challenge award or the Ohio workforce workstream. Counted at completion, never at enrolment; one person counts once per program. | quarterly, at quarter close |
| `c-placements` | integer | Member organisations that took at least one participant from a PIC-supported program into a placement, internship or apprenticeship in the trailing twelve months. | quarterly, at quarter close |

Two fields are also missing on **every** row and are not this page's to invent:

- **Owner.** No owner cell names a person, because this repository holds no owner
  assignment. An EOS row without a named owner is not yet a scorecard row. Seven of the
  fifteen accountable rows are blocked on data; all fifteen are blocked on an owner.
- **Target.** Three targets are set and all three are ceilings fixed by a signed award
  document (`$85,335,784 awarded`, `7 of 7 awards`, `$31,250,000 awarded`). Twelve read
  "not set". None was set by PIC, and that absence is itself the finding.

## Rebuilding

```
cd scorecard && python3 derive_scorecard.py       # fetches nothing; reads four sibling pages
cd .. && node tools/bundle.mjs scorecard
node tools/verify.mjs scorecard
node tools/collide.mjs scorecard
python3 _data/build/verify_claims.py scorecard
node tools/columns.mjs scorecard
node tools/textsize.mjs --mobile scorecard
```

`derive_scorecard.py` fetches nothing. It reads `funding-map/data/funding.json`,
`federal-money/data/techhub.json`, `federal-money/data/federal.json`,
`occupations/data/viz-data.json` and `peers/data/peers.json`, and every claim re-runs
against those same files rather than against the derived one alone, so a correction on a
source page fails this page's gate instead of leaving a stale board number behind.

## Known state

- **`node tools/verify.mjs scorecard` fails on one check: `scorecard is not in
  SOURCES.json`.** The provenance gate requires a `by_artifact` entry, which lives in
  `_data/SOURCES.json`. This page was built under an instruction not to touch `_data/`,
  so the entry has not been added. The one-line patch, using registry keys that already
  exist: `"scorecard": ["usaspending", "ipeds", "qcew"]`. Everything else in
  `verify.mjs` passes at both widths (no console errors, no overflow, no empty slots, no
  uninterpolated templates, no stranded prose).
- The lead visual is the hero's coverage squares rather than a chart, and the page's
  centrepiece is a table. That is deliberate: the argument is which cells are empty, and
  only a table shows an empty cell as empty.
- No footprint banner. The page is not county-scoped as a whole (the award rows have no
  county at all); the two rows that are county-scoped name PIC-12 in their own source
  cell.
- **A data-integrity reading, reported and not corrected.** Every one of the eleven
  tracked degree programmes that reports a 2019 count in
  `occupations/data/viz-data.json` carries the identical count again for 2020, so the
  polymer series prints 118 twice. Independent programmes do not repeat in lockstep. This
  page draws those two columns pale, reads the 2021–2023 window instead, and guards the
  observation in `sc-dup-1920`. The claim asserts the repetition, not its cause: nothing
  here establishes which of the two years, if either, is the real one. It belongs to the
  occupations page's fetch script to resolve.

## Update log

- **1.0 (2026-08-28)** — first build. Register as of 2026-08-13; IPEDS through 2023;
  QCEW 2024; USAspending FY2019–FY2026. 18 claims, 0 manual.
