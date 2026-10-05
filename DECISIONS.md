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
- **Kind is per page, by a strict rule** (John, 2026-10-05): figure when any number in that
  page's Was differs from its Is (compared as a multiset, spelled-out numbers included), else
  wording. An entry's own "No figure changed" never overrides it; where the two disagree, the
  build stops until a hand reading with its reason is recorded. **Headline changed** means the page's H1 changed, listed by hand.
- **The summary is a short link at the end of the byline** ("6 corrections"), John's call on
  2026-10-05: a line above the first chart cost every page a line of its cold open. The full
  sentence is the link's accessible name and title, and heads the page's view of the log.

---

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
