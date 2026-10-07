# Decisions

Why the room is the way it is, append-only. Newest first. Each entry: the decision, who made it,
the date, and why. Process and workflow decisions live outside this repository; this file holds
product and domain decisions that a reader or rebuilder needs.

---

## 2026-10-07 — W4 content: the short kicker, the plant box, and where a chip will not fit (Claude, for John's review)

- **The hub card is the one source of each kicker.** Every card leads with a short question
  (`<p class="kick">`, at most 40 characters) above its full question; the story's eyebrow and
  any "Start with a question" link must read the same words (verify_consistency.py [kicker]).
  Federal money's link now reads "How big is the Tech Hub award?".
- **"If you run a plant here"** is claims.json `plant`, one to three sentences rendered after
  the closer. Each names claims that exist on the page, and every figure in it must be stated
  by an automatically checked claim it names ([plant]; disclosure holds the rendered box).
- **A chip's year may come from its claim's source field**, and every year in the period counts:
  a claim sentence often omits the vintage its file carries, and claim text was not to change.
- **Where no chip fits, the scope says why.** Cluster health, federal money and timeline have no
  cold-open headroom, and the quote rule needs a scoped claim, so a scope may carry `unchipped`
  (the reason). It still binds the quote; disclosure prints the waiver on every run. No
  ceiling was raised; several hero figures on full pages carry no chip (listed in the PR).
- **The job-count link may sit after the passage that prints the total** where the total is not
  a hero figure (churn, wages) or the hero row is full (cluster health).

## 2026-10-07 — W4 reader comprehension: what readers get, and the shared template behind it (John Swanson decided the features; mechanism by Claude)

John's decisions, 7 October 2026:

1. **Scope chips.** A compact grey line under each headline number names its industry code,
   place, period and source: "NAICS 326 · Ohio · 2024 annual avg · BLS QCEW".
2. **"Quote this".** One board-safe sentence per story, scope built in, inside the
   How-we-checked / Cite box (collapsed; the first screen is unchanged).
3. **Titles.** The literary title stays the H1; the hub's question for the story is its eyebrow
   (kicker), e.g. "WHERE DOES OHIO RANK?" over "First In The Nation". The kicker must equal the
   hub's question.
4. **Job counts.** The hub's "Why the job counts differ" paragraph becomes a five-row table
   (Total | Industry | Year | Source | Story) generated from data; each story whose number is one
   of the five links to it at the foot of that number.
5. **Glossary.** One shared definitions file; each page renders a collapsed "Words on this page"
   block with only the terms it uses; peers' existing block migrates into it.
6. **"If you run a plant here".** Up to three sentences per story, each tied to a claim the page
   already checks; John reviews all of them in the content PR.

Rollout: PR 1 is the shared template, with peers as the worked example; PR 2 is per-story
content. Fitness is the 2026-10-04 entry's: John is the first user, citing a story in a board or
funder packet, and non-use by 31 December 2026 is a finding.

How the template implements them (Claude, for John's review):

- **Each piece is declared in data and opt-in per page; once a page opts in, the gates fail it
  when it is missing or disagrees.** Pages not yet opted in are listed as warnings by
  `verify_consistency.py`, so coverage is visible rather than assumed.
- **Scope lives on the claim** (`scope` in claims.json), and the chip is printed from it under
  the figure that names the claim (`PV.figures`, fifth field). The chip's year must be in the
  claim's sentence, and its industry and source in the claim's `source`.
- **The quote is bound to claims.** claims.json `quote` names the claims it rests on; every
  number in it must appear in one of their sentences or scopes, and it must carry the scope of
  one of them, so a retyped figure fails even while every claim passes.
- **The hub's question for a story** is its "Start with a question" link where it has one, and
  otherwise its card heading. The hub's static markup is the one source; a story's eyebrow
  carries `data-kicker` and `verify_consistency.py` holds it to those exact words. Most cards
  have only a long heading today, so the content PR either shortens them or accepts long kickers.
- **Blocks a reader needs without scripting ship as static HTML** (PR #54 review): the hub's
  job-count table and every "Words on this page" block are written into the page's own
  index.html by `_data/build/render_static.py`, between `pv:static` marker comments, from the
  same files the script reads; the script leaves them alone when present. `verify_consistency.py`
  `[static]` fails a region that is missing, empty or stale. A new page declares its glossary,
  adds the two marker lines and runs the script.
- **The job-count table comes from `_data/jobcounts.json`**, each row naming the story claim
  that prints its total; `index-headcount-key` still re-reads every total from its page's data
  file and binds each to its industry cell, and `[jobcounts]` ties each row's total, year and
  story to its clause of that claim and to the story's own claim. The table pans inside its own
  box on a phone. A story's link is required once its row is marked `linked`; peers is, and the
  other four follow in the content PR.
- **Definitions live in `_data/glossary.json`; page-specific sentences, and every figure, live
  in the page's `glossary.notes`**, where numbers must match that page's checked claims; the
  static block is page text, so the noun check reads it.
- **Peers' twelve-county figure moved from second to third in the hero row.** There its link to
  the table uses the free line beside the longer concentration note. In second place it pushed
  the first chart 21px past the page's cold-open ceiling. No ceiling was raised.

---

## 2026-10-05 — How the corrections log and summary lines implement D3 (Claude, for John's review)

- **The log is a page, `corrections/`, rendered at derive time** by
  `_data/build/derive_corrections.py` from `CORRECTIONS.md`, word for word, and held to it by
  `verify_consistency.py`. It is PUBLISHED with no hub card: apparatus, not a story, so it is not
  counted among the pieces or in the source register (`masthead.UNCARDED` names it and why).
- **"Corrections since publication" leaves out corrections made before a page was first
  published** (the scorecard and accountability before release, and the 17 August
  pre-publication review on collaboration and reach). They stay in the log.
- **No wording/figure split** (John, 2026-10-05): automatic wording/figure classification was
  wrong in both directions; the summary counts corrections and says whether the headline changed.
  **Headline changed** means the page's H1 changed, listed by hand and checked against the entries.
- **The summary sits in the how-we-checked box** (John, 2026-10-06): "N corrections since
  publication. Headline unchanged." (or the dates it changed), linking to the page's view of
  the log. Above the first chart, and then in the byline row, it cost pages their cold open.

---

## 2026-10-05 — A page's version date is git's, and every date carries a label (John Swanson approved the wording; mechanism proposed by Claude)

- **The byline's "Revised" and the "Cite as" version are one date** (the byline prints it short,
  "Revised 5 Oct 2026", so the byline row does not wrap; the cite keeps the full date): the author date of the newest
  non-merge commit touching the page's folder (a folder with uncommitted edits is dated today), so
  a merge re-dates nothing. `_data/build/stamp_cite.py` writes it, with the page's title and
  canonical URL, to `_data/cite.json`. That file is **generated, never committed**: `tools/bundle.mjs`
  regenerates it before every build and CI again right before the Pages upload (full-history
  checkout), so no contributor has a step to forget and a parallel PR cannot go stale.
  `tools/disclosure.mjs` checks each rendered page against the file of the same run. Shared code in
  `_shared/` does not revise a page: the date says when the page's own files changed.
- **The box copies its byline's model-credit clauses verbatim**, so each model keeps the role the
  byline gives it (Codex "updated the federal context" on accountability and scorecard, not the
  analysis); the gate compares role-and-model pairs.
- **"Newest data retrieved" means the newest retrieval anywhere in the page's data**, nested ones
  included (`masthead.newest_date`): funding map's USAspending check and cost-scissors' CPI pull
  were newer than the dates their mastheads showed. A register's own cutoff stays labelled
  separately where the page shows it. **The citation names both authors**: "Swanson, J., Polymer Industry Cluster (year)",
  and CITATION.cff lists John Swanson (person) and the Polymer Industry Cluster (entity) (John
  Swanson, 5 October 2026).
- **The canonical URL is CITATION.cff's url plus the page folder**; the hub cites the room at the
  root.
- **Every date says what it dates.** The masthead's "Data as of" became "Newest data retrieved", in
  words. A byline month that dated the page was removed in favour of "Revised"; a byline month
  that dated the data stayed, labelled "retrieved" (location quotient, occupations) or "newest
  vintage" (revisions); funding map's "Figures as of" was already labelled.
- **The box says how many sentences a person checked by hand.** "Every numbered sentence is re-run
  against the data it ships with" is not true of a page with manual claims, so on those pages it
  adds "except N that rest on a document read by a person".

## 2026-10-04 — Responses to the three external reviews (John Swanson)

Three independent reviews of the published site (4–5 October 2026) were triaged into errors,
accessibility fixes, trust features, reader-comprehension work and owner decisions.

- **NEO-14 means the vault set only.** The fourteen counties the GAC-PIC vault tags companies
  against keep the name NEO-14 (canonical in pic-geo). Chain's footprint, PIC-12 plus Columbiana
  and Tuscarawas, is renamed **PIC-12+2**. Two sets under one name made the counties unknowable.
- **The PIC-12/NEO-14 difference is stated in both directions** (pic-geo v1.0.1): they share ten
  counties; NEO-14 adds Crawford, Huron, Richland and Tuscarawas and leaves out Ashtabula and
  Trumbull. Fixed in pic-geo first, then re-vendored, per the vendored-copy rule.
- **Three statuses, everywhere:** PUBLISHED, PROTOTYPE (chain, reach, collaboration) and
  INTERNAL (scorecard, accountability). Status shows on the page itself, not only on the index.
- **Unlisted pages stay public with banners.** Scorecard and accountability remain deployed and
  linked from the sources page, labelled INTERNAL; unlisting is not access control.
- **Corrections move below the headline finding**, with a generated one-line summary at the top
  of the page saying how many corrections there are, of what kind, and whether the headline moved.
- **The byline keeps its model credits**, and a short "How this was made and checked" box with a
  "Cite as" line sits beside it on every page.
- **Falsifiability is shown on the page** through a plain-language `breaks_if` field on each
  story's hero claim; `falsified_if` stays the precise internal condition.
- **The index says who PIC is and who the room is for**: an initiative of the Greater Akron
  Chamber, written for people who run, fund or site polymer operations in Northeast Ohio.
- **PIC Open is fixed on both sides**: its count and "help" wording in that repository, and the
  index link here relabelled.
- **Chain publishes a register methodology summary** (sources, inclusion rules, refresh); the
  records stay private.
- **Prototypes count toward county coverage**, marked as prototypes, and the rule is stated at
  the control.
- **Fitness:** the first user of the reader features (status banners, cite-as, breaks-if, scope
  chips) is John Swanson, citing a story in a board or funder packet. If none has been used that
  way by **31 December 2026**, that non-use is a finding, recorded here.
