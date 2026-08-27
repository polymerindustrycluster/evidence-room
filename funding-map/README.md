# PIC funding map

An interactive map of the public money behind the Polymer Industry Cluster:
three awards, seven programs, twenty-one recipients, `$106,290,451` in awards
plus match. Destined for `picinnovation.org/funding`.

Self-contained: vanilla JS, inline SVG, no frameworks, no CDN, no build step.

```
index.html          page shell — headline, machines, disclosures, section structure
styles.css          all styling, brand tokens at the top
app.js              layout, rendering, annotations, interaction
data/funding.json   THE DATA. Edit this and nothing else.
claims.json         every published sentence's guard — re-run by _data/build/verify_claims.py
fonts/              Aptos, copied from ../../megadeck/fonts
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

- the `$106.3M` hero figure and its `data-value` attribute on `#total-count`,
  and the `$106 million` in the headline
- the `$85.3M` / `$21.0M` hero sub-line
- the three source tiles in the masthead
- the three machine cards (amounts, counts, and each card's fact line)
- the figure title's `twenty-one recipients` and the verdict sentence under
  the diagram (`$85.3M` / `$79.2M` / `more than half` / `largest line`)
- the two vignette kickers (`$10.09M`, `$4.70M`)
- the `as of` date in the methods section and the figure source line

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
  *"awarded or committed amounts; disbursement follows milestones."*
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

## Open questions for a human

- **Font licensing.** Aptos ships with Microsoft Office. It is bundled here to
  match the deck, but redistributing it from a public site is a licensing
  question worth answering before launch. To drop it, delete the `@font-face`
  blocks at the top of `styles.css`; the stack already falls back to Segoe UI
  Variable and then a system sans, and nothing else changes.
- **Two project labels** are inferences rather than retrieved award text:
  Huntsman's "carbon black and nanotubes from methane" and the University of
  Akron's EDA award as "Workforce (WISE)". The dollar figures and award IDs are
  solid. Both labels come from the deck's own project list.
