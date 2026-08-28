# PIC funding map

An interactive map of the public money behind the Polymer Industry Cluster:
three awards, seven programs, twenty-one recipients, `$106,290,451` in awards
plus match. Destined for `picinnovation.org/funding`.

Self-contained: vanilla JS, inline SVG, no frameworks, no CDN, no build step.

```
index.html          page shell on the house anatomy — mast, hero, four bands, closer
styles.css          page-local additions only; widths, type, palette and the mast/hero/
                    band/closer chrome come from ../_shared/pic-viz.css
app.js              layout, rendering, annotations, interaction, hero stats, methods box
data/funding.json   THE DATA. Edit this and nothing else.
claims.json         every published sentence's guard — re-run by _data/build/verify_claims.py
```

## Run it locally

`fetch()` cannot read `data/funding.json` over `file://`, so serve the folder
over HTTP:

```
cd web/funding-map
python -m http.server 8899
# then open http://localhost:8899/
```

Opening `index.html` directly still shows the headline, the totals, the
disclosures and a link to the raw data, but not the diagram or the table.

## Updating the data

**Edit `data/funding.json`. Nothing else.** Everything downstream — the
diagram geometry, the card view, the HTML table, the CSV, the legend, the
provenance list, the screen-reader description of the graphic — is derived
from it at runtime. There are no hard-coded figures in `app.js` or
`styles.css`.

The hand-typed exceptions live in `index.html`, because they must survive with
JavaScript switched off. Every one of them is guarded by an assertion in
`claims.json` (run `python3 _data/build/verify_claims.py funding-map`), and they
must be updated by hand if the data changes:

- the `$106 million` in the headline, and the `$85.3M` / `$21.0M` / `$79.2M` in
  the standfirst
- the three machine cards (award amounts, the match promised beside each, counts,
  and each card's fact line)
- the figure title's `twenty-one recipients` and the verdict sentence under
  the diagram (`$85.3M` / `$79.2M` / `more than half` / `largest line`)
- the two vignette kickers (`$10.09M`, `$4.70M`)
- the `as of` date in the byline and the figure source line, and the same date
  passed to `PV.methodology()` as `meta.fetched`

The four hero stat cards are NOT hand-typed any more: `renderHero()` builds them
from `meta.totals` through `PV.figures()`, and `#total-count` gets its
`data-value` from the same object, so the count-up animation and the printed
figure cannot disagree.

The three on-diagram annotations are NOT hand-typed: their numerals are
computed from `funding.json` at render time and formatted by `fmt()`.

The structure is `sources` → `programs` → `recipients`:

- a **source** is an award as it was made (`award`, `matchAmount`, `hue`)
- a **program** belongs to one source and carries the `chip` label and `tint`
- a **recipient** holds one entry in `awards[]` per program that funds it

A recipient's first award decides which group its row sits in on the diagram,
so keep the larger or defining award first. Ordering in each array is the
drawing order — recipients are listed in visual top-to-bottom order, not
alphabetically.

## The number-format rule

One rule, implemented once, in `fmt()` in `app.js`:

- **$1M and above** → two decimals and an M: `$11.12M`, `$18.52M`, `$1.50M`
- **below $1M** → whole thousands and a K: `$679K`, `$296K`, `$25K`

No raw comma-strings (`$678,614`) anywhere in a label. Full precision belongs
in the detail panel, the data table and the CSV — all three carry it.

The `$106.3M` hero is the one deliberate exception (one decimal), because that
is the figure as it is quoted everywhere else in PIC's materials. The verdict
sentence under the diagram uses the same one-decimal register (`$85.3M`,
`$79.2M`) for the same reason. On-diagram annotations use `fmt()` unchanged, so
an annotation always prints the same string as the band or row it points at.

## What must never be published here

These are internal per the build spec's sub-award disclosure ruling, and are
**not** in `funding.json`. Do not add them:

- **disbursement figures** — only `$1,191,433` of `$3,349,892` in sub-grants has
  actually moved and three of seven are still pre-award at `$0`. The mandatory
  substitute label, which is on the page and in every detail panel, is
  *"awarded or committed amounts; disbursement follows milestones."* Beside the
  figure it is preceded by a plain reading of it, *"Money is paid out as the work
  hits agreed checkpoints,"* because "disbursement" is the one term of art left in
  the sentence that decides whether a reader takes these bars for money spent. The
  mandated string still renders verbatim from `meta.disclosures[0]`; do not replace
  it with the plain sentence, and do not delete the plain sentence either.
- **partner-by-partner match commitments**, the Continental default, and the
  `$742K` match gap
- the **`$1,000,000` Innovation-Hub-as-APEX-match overlap**, which would net the
  total to roughly `$105.3M`
- the **Synthe6 professional-services value** — published two ways (`$15K` vs
  `$20K`) and unresolved. Only the `$25,000` cash award appears.

Three disclosures are mandatory and are rendered from `meta.disclosures`:
the committed-not-disbursed line, the EDA-verified-against-signed-NoA line,
and the NEO-SMART line (separate CWRU-led award, PIC is a core partner, not
PIC's money, not on the diagram).

## Design and behavior notes

**Color.** Hue means funding source and nothing else — blue EDA, green Ohio,
orange APEX. Within the Ohio green, a tint step separates PIC Translational R&D
(`#5E7A10`) and Synthe6 (`#B8D637`) from the hub's own workstreams (`#8FAE2B`).
Program chips (`EDA` / `R&D` / `SYNTHE6` / `OHIO HUB` / `APEX`) carry the same
distinction in a channel that survives greyscale and color blindness. Never
put white text on `#1A8A9E` — it measures 4.06:1. Dark surfaces are `#0C6473`.
Text colors on white come from `TINT[*].textInk`, each measured at 4.5:1 or
better.

**Two views, one dataset.** Above 900px of container width the ribbon diagram
renders (the breakpoint moved from 1120 when the page joined the shared column
system; the diagram only ever drew about 1,054px of ink). Below it, a grouped
card view takes over with the same chips, amounts and detail panel — sortable
by program, by amount, or A–Z, with every bar on one global dollar scale. It is
a designed alternative, not a fallback. The breakpoint is measured rather than
guessed: below it the longest recipient names can no longer sit beside their
chips and amount without being cut.

**Motion.** A staged reveal runs once: sources fade in, the three ribbon
streams draw left to right over about 700ms staggered by stream, then the
recipient rows land. Any interaction cancels the remainder immediately and it
never replays. The total counts up once when it enters the viewport. Hover
transitions are 140ms, the panel is 200ms. There is no perpetual motion of any
kind. Under `prefers-reduced-motion: reduce` everything renders instantly in
its final state with full functionality.

**Deep links.** `#recipient/flexsys`, `#program/oh-rd`, `#source/ohio` open and
scroll to that node. Opening a panel pushes a history entry, so Back closes it.

**Accessibility.** The SVG is `role="img"` with a generated description of the
whole diagram. Interaction is a layer of real HTML `<button>`s positioned over
it, so focus rings, hit targets and semantics are genuine — tab order runs
sources, then programs, then recipients; Enter or Space opens the panel; Escape
closes it and returns focus. The full data table below the graphic carries
every row. Focus ring is 3px `#0C6473` (6.8:1).

## Deploying (matching the pic-catena pattern)

Its own Netlify site, surfaced on the main domain by a force-200 proxy.

1. New Netlify site from this directory. No build command; publish
   directory is the folder itself.
2. `netlify.toml` is not required — there is nothing to build — but add one if
   you want headers.
3. On the **picinnovation.org** site, add the proxy rule to its `_redirects`
   (or `netlify.toml`), exactly as `catena` is wired:

   ```
   /funding      https://<this-site>.netlify.app/index.html   200!
   /funding/*    https://<this-site>.netlify.app/:splat       200!
   ```

   The `!` forces the rewrite even though the path could otherwise match.
4. Netlify normalizes trailing slashes, which has bitten this pattern before —
   verify both `/funding` and `/funding/` resolve after deploying.

## Revision, 27 August 2026 (append-only)

Editorial rebuild against the data-journalism review rubric. No figure changed;
one data label did (see the last bullet). What changed:

- **Headline reframed to the finding**: "A $106 million bet on Akron polymers
  runs through three very different machines", with "every dollar, every
  organization" kept as the standfirst's trust clause.
- **A "three machines" section** now sequences the awards one at a time, one
  character sentence each, before the combined map, with deep links into it.
- **Three annotations drawn on the Sankey**, numerals computed from the data:
  the $18.52M pilot facility as the single largest line (leader line from the
  left gutter); nine startups sharing $225K beside the seven federal leads'
  $51.00M (above the cohort rows); and the $6.17M with no named recipient yet
  (a ledger-style footing under the recipient column).
- **The legend moved above the diagram** and the encoding narration left the
  lede; the figure got its own title, subtitle and source line.
- **A verdict sentence closes the diagram section** ($85.3M awarded, $79.2M
  named, more than half with seven awardees, the largest line a building).
- **Two vignettes** (Flexsys / 6PPD-quinone, Full Circle / tire recycling)
  give the two most story-rich awards a human-scale beat; the 6PPD claim is a
  manually verified citation in `claims.json`.
- **A recipient finder** (select box) over the existing deep links.
- **Card view bars now share one global scale** with a stated maximum; the old
  per-group scaling drew $25K and $11.12M as identical full-width bars.
- **Every detail panel states** that disbursement to date is not public here.
- **`claims.json` added**: 18 machine-checked assertions plus 3 manual ones.
  The page no longer predates the claims harness.
- **Label edit in `funding.json`**: the Translational R&D band rider shortened
  from "$3.35M executed in seven sub-grants" to "$3.35M executed so far" so it
  fits the band's three-line stack (the figure is unchanged and guarded; the
  seven-sub-grant count stays in the reconciliation notes and claims).

## Revision, 28 August 2026 (append-only)

Fix round against an independent visual review. No figure and no number changed;
two data labels and one data typo did (last three bullets). What changed:

- **The page ends on a closer, not on apparatus.** The build appendix used to be
  injected after `</footer>`, so the last ~1,300px of the page was a limitations
  bullet wall. The order is now story, methods, sources appendix, closer, footer:
  a 72-word display-size closer resolves the hero's question, and the appendix
  sits above it behind a disclosure.
- **Byline and a three-stage footer added.** The provenance sentence in the
  methods box is not a byline; the as-of date now sits above the fold.
- **Three machine-truncated labels fixed.** The $51.00M gutter label wraps to two
  lines instead of shipping "EDA Sustainable Polymers Tech…"; "Workforce
  development" uses its `short` label in a band too thin for the full name; and a
  recipient row whose name cannot sit beside its chips now becomes a two-line row
  (the layout multi-program rows already used), so "Case Western Reserve
  University" renders whole at every width the diagram draws. Truncation is
  checked at eleven widths, not assumed.
- **The archive table became an editorial table.** Ranked by amount, ten rows
  visible, "Show all 19 rows" for the rest, the nine equal Synthe6 awards folded
  into one row that still names all nine companies, source and program merged
  into one column, zebra tint. The CSV still carries all 27 award lines. Desktop
  scroll fell from 8,776px to 7,005px.
- **The mobile table is one card per award** (recipient and amount first) instead
  of a 780px table clipped to "SOURCE | PROGRA" at first paint.
- **Caveat ink under the map cut from ~170 words to 44** (one limitation
  sentence, one source line, one disclosure control). The drawn-to-scale
  inventory, the NEO-SMART note and the four reconciliation paragraphs moved into
  disclosures; the reconciliation is now one generated sentence plus the table
  foot.
- **The appendix header rejoined the page's single text rail.** The shared core is
  a centred system (`.band .wrap > *` and `.closer .wrap > p` set auto margins);
  this page is left-set, so those two rules are overridden page-locally at equal
  or higher specificity. Widths are untouched, so columns.mjs still measures the
  same slots.
- **Nine sliver cards became one on mobile.** At the shared $18.52M maximum the
  nine $25K bars were ~1px each across ~1,000px of scroll. They are one card now,
  with all nine companies listed as their own buttons: nothing is dropped and
  every deep link still resolves. This is an editorial change to a mobile
  re-layout and is flagged as one.
- **Smaller fixes**: the chip-style legend block dropped (six self-labelling chips
  with no text, on a directly labelled chart); the "single largest line" leader
  extended so its tip sits inside the pilot-facility band rather than beside the
  hatched match block; the hub node widened so "Innovation Hub" stops running off
  a dark box onto white paper; the figure subtitle's last sentence now differs by
  breakpoint, because there is no wide diagram on a phone.
- **Label edit in `funding.json`**: `recipients[cwru].short` = "Case Western
  Reserve", the map label. The full legal name stays in the table, the CSV, the
  panel and the screen-reader description.
- **Typo fixes in `funding.json`**: straight quotes around "$51 million" in
  provenance and a straight apostrophe in the Synthe6 notShown line, both now
  typographer's quotes. House style bans straight quotes in rendered prose.
- **`claims.json` grew to 23** (19 machine-checked, 4 manual). New: the table's
  ranking and cohort fold; the two-workstream unrouted split; $6.17M rounding for
  the hero card; the byline's record types.

## Plain-reading pass (2026-08-28)

Every number on this page was correct and several were unreadable, because the
page named its constructed units without ever saying what they mean.

- **`$106.3M` is a sum of two unlike things** and said so only in the term of art
  "match and cost share". The hero now leads with the plain split (public money
  awarded, plus what partners and the state promised to put in beside it) and
  keeps the term behind it; the standfirst gives `$85.3M` and `$21.0M` before it
  gives the total.
- **The figure subtitle described the encoding, not the reading** ("hue names the
  source; a tint step separates…") and asserted "one dollar scale", which the
  Ohio workstream bands do not use. It now states the reading (left to right,
  taller means more dollars) and says out loud that the bands sit on a second,
  larger scale. That sentence lives in `.fig-sub-mode` and is empty in card mode,
  where there is no left-to-right and no band column.
- **`59.27% of the Ohio award`** was ambiguous by exactly `$10.42M`, because this
  page shows the Ohio money as both a `$31.25M` award and `$41.67M` with the state
  cost share. Both panels now name the denominator.
- **Terms of art translated at first contact**: obligates, grantee, workstream,
  disbursement, match. Later uses keep the term alone, which is the point of
  translating once.
- **Apparatus cut to pay for it**: the encoding recap in the subtitle, the map
  lede's duplicate of it, the second scale note in card mode, and "Grant Control
  No." in the figure source line. Visible caveat ink beside the figure is 40
  words against the 45-word budget.

## Revision, 28 August 2026 — migrated onto the house anatomy (append-only)

This page predated `_shared/pic-viz.css` and carried its own chrome. It now uses
the same skeleton as the other thirteen pages. No figure changed; the diagram, its
detail drawer and both fallbacks are untouched apart from one label fix.

- **Chrome rebuilt on `.mast` / `.hero` / `.band` / `.closer`.** The bespoke
  `.masthead` (its own eyebrow, headline, standfirst, topline and four award tiles)
  became a house mast plus a hero with a kicker, a three-line finding headline, a
  standfirst, a byline and a four-card `PV.figures()` stat row. The five `.section`
  blocks became four `.band` sections, each with a takeaway kicker, a takeaway H2, a
  lede, its figure and a source line, alternating ground for pacing.
- **The four masthead award tiles folded into the machines band.** Each machine card
  now carries its own award figure in the kicker and the match promised beside it in
  the fact line, so the six figures live once, next to the sentence that explains
  them, instead of twice in two registers.
- **`PV.methodology()` replaced the hand-rolled methods section and the
  `PVSources.render()` appendix**, and lands where it lands on every other page:
  between the last band and the closer. Its "Reproduce this" block comes from
  `_data/SOURCES.json`. The five `notShown` items and the four page-level limits
  from the old appendix are handed to it under classified meta keys, so the wording
  still has one home. Record-level provenance (which signed document each figure
  came from) has no slot in the generated box, so it rides in a disclosure beside
  the register it documents.
- **`styles.css` fell from 770 lines to 396.** Deleted: the page's own `--wrap`,
  palette, radius and motion tokens, the Aptos font stacks, the element resets, and
  every rule for masthead, topline, tiles, sections, ledes, methods grid, closer and
  band tint that `_shared/pic-viz.css` already provides — including the page-local
  override that pinned this page to a left rail while the rest of the site is a
  centred system. What is left is what the figures need.
- **The layout gates now apply to this page.** `columns.mjs` measures 24 elements at
  seven widths, `centres.mjs` reads its axis, and wrapping the diagram in `.chart`
  brought it inside `collide.mjs`'s reach for the first time — which immediately
  found a real collision: the APEX mechanism title, set on one 14px line, ran 183px
  past the mechanism column and under the Ohio "Workforce" band label by 18px. It is
  now wrapped to the mechanism column at 13px and stacked upward, like the hub label
  above it.
- **One claim retired.** `hand-verified-three` guarded the appendix sentence that
  named the three hand-verified statements. The generated methods box now states the
  split from `claims.json` itself ("19 re-run automatically … 3 rest on a document a
  person had to read"), so the count cannot be hand-typed and go stale — and dropping
  the claim makes that generated count correct, because it was reporting four manual
  entries for three statements about the world. Every other claim's text was updated
  to name where its sentence now sits.

## Open questions for a human

- ~~**Font licensing.**~~ Closed 28 August 2026: the page no longer names Aptos.
  It takes `--sans` from the shared core, like every other page, so the display
  face is a site-level decision for John rather than this page's own.
- **Two project labels** are inferences rather than retrieved award text:
  Huntsman's "carbon black and nanotubes from methane" and the University of
  Akron's EDA award as "Workforce (WISE)". The dollar figures and award IDs are
  solid. Both labels come from the deck's own project list.
