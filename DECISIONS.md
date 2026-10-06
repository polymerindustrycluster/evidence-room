# Decisions

Why the room is the way it is, append-only. Newest first. Each entry: the decision, who made it,
the date, and why. Process and workflow decisions live outside this repository; this file holds
product and domain decisions that a reader or rebuilder needs.

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
