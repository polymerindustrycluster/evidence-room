# sources/ — what shipped, what is deferred, and how each deferred piece gets built

Written 2026-08-29 alongside the v1 page. The page tells a reader one line: "more recipes
are coming." This file is that promise made specific, so the next person to pick it up —
including a later session of this one — does not have to reconstruct the reasoning.

## Purpose and audience

The page exists so that a second organisation can do this work without our help. Named
audiences, in the order they were considered:

1. **Another Ohio Innovation Hub or EDA Tech Hub** with a different industry. The largest
   group and the one the design targets. They do not want our answer, they want our method
   applied to rubber, or aerospace, or ag-tech.
2. **A member of the public checking a claim** on this site. Needs one path to one number.
3. **Ourselves in a year**, when the codes and filters are no longer in anyone's head.

Every other page here makes an interpretive claim someone must stand behind. This one hands
over method, which is why it is the most defensible page on the site and the one with the
least MarCom exposure.

## The acceptance test, for v1 and for everything below

**Could someone with no access to this repository follow it and land on the same number?**

Not a review, a replication. Give a reviewer the rendered page only — no source, no data,
no README, no brief — name one published figure, and ask them to reproduce it from the
agencies' own sites. Where they stall is the edit list. Where they land on a *different*
number, either the page or the analysis has a real defect. This is the same protocol that
found two severity-5 defects on this site after eleven gates were green, and it works for
the same reason: the reviewer cannot see the source.

A deferred item is not done until its recipe passes this test.

## v1, shipped

- One worked question carried end to end: industry concentration, on QCEW.
- The generated registry of all fourteen sources, with what each is, what it cannot tell
  you, whether a key is required, licence, and which pages depend on it.
- Classification as a judgement made three times: NAICS, SOC, CIP-6, with the CIP
  core-versus-adjacent split as the worked boundary call.
- Suppression as its own section. Withheld is not zero.
- Vintage: series revise, pages are stamped, your number may differ and that is expected.
- Geography compressed into the classification section: county, metro and state are
  published separately and do not sum into one another.

Generated from `_data/SOURCES.json` and `_data/catalog.json` by `_data/build/
derive_sources.py`, both of which are already policed by `verify_consistency.py`. Nothing on
the page is typed that could be derived, because everything typed on this site drifted
within a week.

---

## Deferred items

Each carries: what it is, why it is worth doing, the material that already exists, its
acceptance criterion, and what could go wrong. Ordered by value per unit of work.

### D1. Recipe 2 — the wage premium

**What.** "Does this industry pay better than the rest of my regional economy?" QCEW again,
but the measure is a ratio against a local denominator rather than a national share.

**Why it earns its place.** It is the second-most-asked question after concentration and it
teaches a different trap: the **unit of the median**. This site printed "the typical polymer
job pays 1.2 times" when the median was over industry-county *pairings*, not jobs. The
job-weighted figure is 1.26. Both are defensible; only one matches the sentence. A
replicator will make exactly this mistake, because the pairing median is the easy one to
compute.

**Material that exists.** `wages/` in full, including the de-duplicated tally and the
job-weighted median it now prints; `wages/claims.json`; the family/child nesting rules.

**Acceptance.** A reviewer reproduces both medians from QCEW for one county and can say
which one answers "what does a job here pay".

**Risk.** The nesting explanation is already in the classification section; this recipe must
reference it rather than repeat it, or the page starts saying the same thing twice.

### D2. Recipe 3 — the labor shed

**What.** "Where do the people who work here actually live?" LODES origin-destination.

**Why.** It is the recipe most likely to be *new* to a reader — most economic development
offices have never pulled LODES — and it teaches that a job is not a person and that a
worker resident in another state is counted or not depending on which file you take.

**Material.** `laborshed/` in full, including the two PIC-12 totals reconciled by identity
(1,735,169 all-residents against 1,702,542 Ohio-only, joined by the 1,524,279 held from
inside on both bases). That identity is the single best teaching artifact on this site for
"the same place has two correct totals."

**Acceptance.** A reviewer pulls one state's LODES file, filters to a county, and can state
which basis their number is on.

**Risk.** LODES is a large bulk download rather than an API; the recipe must be honest about
the size and about `JT00` meaning all jobs in all sectors, so nobody expects an industry cut
that does not exist.

### D3. Award identifiers, with the NSF case as the worked example

**What.** How to verify a specific award rather than trusting a page: USAspending by award
id, `api.nsf.gov/services/v1/awards.json` by keyword or id.

**Why it may be the most valuable deferred item despite being third.** It is the only piece
that teaches a reader to check *us*, and the worked example is live and instructive: this
site printed "NSF backs NEO-SMART with $160M" from a typed event title. The award record
(2532460) gives an estimated total of **$14,999,983** with **$7,499,984** obligated, a
ten-year cooperative agreement. The $160M is the NSF Engines Type 2 *program* ceiling,
contingent on renewals, and no source ties it to this award. Reading a press description as
an award value overstated a federal award by more than ten times, on a site whose premise is
checkability. Publishing our own error, with the lookup that catches it, is worth more than
any dataset.

**Material.** Award ids already in shipped data: NSF 2532460; EDA ED25HDQ0G0038,
ED25OIE0G0108, ED25HDQ0G0013. `timeline/data/timeline.json` E205 carries the full retrieval
note and provenance.

**Acceptance.** A reviewer looks up one EDA award and one NSF award and can state the
difference between an obligation, an estimated total, and a program ceiling.

**Risk.** None material. This is additive and self-contained.

### D4. Nominal against real, and which deflator

**What.** Why a price or a dollar figure needs a basis, which deflator this site uses
(CPI-U), and what changes when you apply it.

**Why.** Three of `cost-scissors`' own readings flip under deflation: finished products are
+11% real against +40% cash, their real peak was August 2022 rather than the latest month,
and resin returns to roughly its January 2019 level. A replicator comparing across years
without a basis can reach the opposite conclusion from the same data.

**Material.** `cost-scissors/data/scissors.json` now ships a `deflator` block (CPI-U
annuals 2018–2025, with 2026 deliberately absent and clamped in app.js);
`federal-money` restates into 2025 dollars.

**Acceptance.** A reviewer takes one series, deflates it, and can say which of the page's
statements survive.

**Risk.** Easy to over-explain into an economics lesson. Keep it to: pick a basis, say which,
be consistent, and show one reading that flips.

### D5. Recipe 4 — federal contracting

**What.** "How much federal money reaches my industry here?" USAspending, filtered by NAICS
and place of performance.

**Why.** Teaches the limits of a code filter better than anything else: a NAICS-filtered
view of federal money **cannot see** university and research awards at all, because
universities file under 61xxxx and research outfits under 5417xx. It also teaches that an
obligation is not an outlay, and that place of performance is a reported field rather than
an observation.

**Material.** `federal-money/` in full, including the closed-year versus all-year average
distinction, which is itself a teachable basis decision.

**Acceptance.** A reviewer pulls one fiscal year for one county set and can name two things
their filter cannot see.

**Risk.** Overlaps D3 and D4; sequence it after both so it can lean on them.

### D6. How this site verifies itself

**What.** A short section on the claims harness: every numeric sentence carries a written
condition that would prove it wrong, and they re-run on every build.

**Why.** Possibly the most transferable thing here and certainly the most unusual. No other
Tech Hub is doing it, and the idea is cheap to copy even without our code.

**Why it is last.** It is about *us*, not about public data, and the page's whole value is
that it is not about us. If it crowds the recipes it has cost more than it added.

**Acceptance.** A reader can describe the idea in one sentence without having seen our
tooling.

**Risk.** Turning the page into a tour of our own harness. If it cannot be done in a short
section, it belongs on its own page or nowhere.

### D7. Localisation notes

**What.** A short "swap PIC-12 for your counties" section: which parameters change (the FIPS
list, the code set, the reference geography) and which stay.

**Why.** The whole page implies it; nothing says it.

**Material.** The fetch scripts already parameterise geography.

**Acceptance.** A reviewer names every value they would have to change for their own region.

### D8. Troubleshooting: "I got a different number"

**What.** The four reasons a replicator's figure will not match ours, in the order they
occur: a different vintage, a different basis, a different code set, and a suppression they
read as zero.

**Why.** It converts the most common failure of a replication guide into a supported path.
Vintage is already in v1; this collects all four in one place at the point of frustration.

---

## Sequencing

D1 → D3 → D4 → D2 → D5 → D8 → D7 → D6.

Rationale: D1 completes the pair of QCEW recipes a reader most wants, and shares v1's
source, so it is cheap. D3 is self-contained, additive, and carries the strongest lesson.
D4 unlocks D5, which should not ship before it. D2 needs a bulk-download explanation and is
the largest single piece. D8 is only worth writing once several recipes exist to be
confused by. D6 is the one that can be dropped entirely without the page failing.

Ship in pairs, as with everything else on this branch, and re-run the replication test after
each pair rather than at the end.

## How each one gets built, mechanically

1. Extend `_data/build/derive_sources.py` rather than adding typed prose. If a recipe needs
   a value, derive it from the page that already publishes it, so the guide cannot drift
   from the finding it describes.
2. Add claims to `sources/claims.json` for every number the new section prints, including
   its own counts.
3. Run `node tools/all.mjs` — one command, one verdict.
4. If claims change, `python3 _data/build/derive_index.py` and re-bless the typed literal in
   `index/index.html` and inside `index-inventory`'s assert, reading current values first.
5. Rebuild reader bundles with `node tools/readerbundle.mjs --out DIR sources` and run the
   replication test with a reviewer who has no repo access.

## Open questions for John

- **Scope of audience.** Is this aimed at other Tech Hubs specifically, or at any regional
  economic development office? The former justifies more polymer-specific worked examples;
  the latter argues for keeping every recipe industry-neutral in its wording.
- **Do we publish our own error in D3?** Recommended yes: the $160M-versus-$15M case is the
  best teaching material on the page. It does mean printing a mistake this site made.
- **Does D6 belong here or on its own page?** It is the most distinctive thing we have built
  and the least related to public data.
- **Maintenance owner.** The registry is generated and gated, so it will not rot silently,
  but a source that changes its API will fail a fetch rather than this page. Who watches?
