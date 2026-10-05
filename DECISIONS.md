# Decisions

Why the room is the way it is, append-only. Newest first. Each entry: the decision, who made it,
the date, and why. Process and workflow decisions live outside this repository; this file holds
product and domain decisions that a reader or rebuilder needs.

---

## 2026-10-05 — A page's version date is git's, and every date carries a label (John Swanson approved the wording; mechanism proposed by Claude)

- **"Page revised" and the "Cite as" version are one date**: the author date of the newest
  non-merge commit touching the page's folder (a folder with uncommitted edits is dated today).
  `_data/build/stamp_cite.py` writes it, with the page's title and canonical URL, to
  `_data/cite.json`, which the pages read; GitHub Pages serves the folders as they are, so nothing
  asks git at serve time. `tools/disclosure.mjs` re-runs the stamp and fails a page whose recorded
  date git no longer agrees with, so **any commit that edits a page folder must re-run
  `stamp_cite.py`**. CI checks out full history for this; a shallow clone fails as uninspectable.
  Shared code in `_shared/` does not revise a page: the date says when the page's own files changed.
- **The canonical URL is CITATION.cff's url plus the page folder**; the hub cites the room at the
  root.
- **Every date says what it dates.** The masthead's "Data as of" became "Newest data retrieved", in
  words. A byline month that dated the page was removed in favour of "Page revised"; a byline month
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
