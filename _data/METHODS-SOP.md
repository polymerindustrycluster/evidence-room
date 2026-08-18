# Methods SOP — the judgments no check can make

**Owner:** Director of Innovation, Polymer Industry Cluster (Greater Akron Chamber) ·
**Review trigger:** any new footprint, source family, or artifact type — not a calendar
date, because calendar reviews get skipped and nobody notices.

This document is deliberately short, and deliberately contains **no numbers, no county
lists, no artifact counts, no source-to-script mappings, and no metadata key lists.** Every
one of those is machine-owned and would rot here. Two independent model families reviewed
the reproducibility system on 2026-08-17 and both said the same thing: a long methods
narrative becomes theatre, and `_data/*.md` in this repo has already proved it — one doc
says facilities are "dominated by Ashtabula" when the data says Summit, and another prints a
pre-fix year series inside a table labelled "corrected."

**If a rule can be checked, it is not in here — it is in `verify_consistency.py`.** What is
here is what a machine cannot adjudicate.

## Where to look for the facts

| question | answer lives in |
|---|---|
| which sources a page rests on, with exact filter values | `_data/SOURCES.json` |
| which script produces which dataset | `_data/SOURCES.json` → `script` |
| whether every published sentence still holds | `python _data/build/verify_claims.py` |
| whether the records that should agree do agree | `python _data/build/verify_consistency.py` |
| whether a page renders without breaking | `node tools/verify.mjs` |
| whether marks collide or leave frame | `node tools/collide.mjs` |
| what changed after publication, and why | `CORRECTIONS.md` |
| what each page claims, its exposure, and whether it may be published | `_data/ARTIFACT-REVIEW.md` — **internal, not published.** Every page in this repository is one the review cleared; pages it did not clear are absent rather than hidden, and the staging script fails if one appears. |

---

# 1. Definitions that must be decided, not inferred

**The footprint.** PIC-12 is PIC's official twelve-county set and the one the cluster-health
dashboard uses; NEO-14 is inherited from the vault. They share ten counties. **Federal-data
pages use PIC-12. Vault-sourced pages use NEO-14. A page never mixes them.** If a page must
show both — a deliberate comparison — it says so in its own prose *and* in its limitations,
and the harness's footprint check will need an explicit exemption rather than a silent pass.

**Where a company is.** Decide per dataset and state it: headquarters, plant site, grant
recipient, or inventor residence are four different questions and produce four different
maps. Never let a reader assume.

**What counts as polymer.** A classification, never a keyword. The keyword bound pulled in
medical-device work and returned nearly three times as many records. Any new source needs its
bound named in `SOURCES.json` filters before it is used, not after.

**Units and vintage.** Every figure declares: jobs or establishments or awards; current or
constant dollars; fiscal or calendar year. Two pages using different answers to the same
question is a defect even when each page is internally right.

# 2. Zero is a judgment

A code filter returning nothing renders identically to a real finding of zero. **Before
publishing any zero, confirm by hand that the filter is live** — run it against a period or
geography you know is non-empty. `check_empty_data` catches a committed empty file; it cannot
see a filter that empties at runtime, and it never will.

The same applies to suppression. A suppressed cell is not a zero. If a source withholds, the
page says withheld, and the limitation says how much of the total is unknown.

# 3. Claims

**A claim's assertion must be able to fail the sentence it protects.** A band wide enough
that the sentence could become wrong while the assertion passes is not a guard. This is
inference and no harness will ever check it — `verify_claims.py` runs assertions; it cannot
tell you a band is too loose. Known live example: a `talent` claim asserted a 30–42% band and
the value moved to 31%, so it passed while its sentence drifted.

**`verify:"manual"` is a debt, not a category.** Use it only when the fact is
document-sourced and genuinely not re-runnable. Every manual claim carries the document it
came from and, if that document is undated or unconfirmed, says so in the claim text. A
manual claim whose source cannot be named should not be published. **Never convert a failing
automated claim to manual.**

**A page with no `claims.json` is an exception that needs a name.** Add it to `NO_CLAIMS_OK`
in the harness with a reason. "It is only a register" is not automatically true — a register
that publishes a summary total is making a claim.

# 4. Limitations

The renderer publishes limitation prose from a page's metadata. **The check confirms
presence; only a human confirms truth.** Before any page's prototype flag comes off, read its
Limitations section and ask: is each line true, and is the most damaging limit present?

A limitation copied from another page, a leftover TODO, or boilerplate satisfies every
automated check and misleads a reader more than silence would.

**How a metadata key becomes public (decided 2026-08-17).** Every prose key is classified in
`_shared/picviz.js` into one of three sets, and **a key in none of them fails the build**:

- `LIMITS` — caveats that change how a reader should read the number. Rendered under
  *Limitations*.
- `METHOD` — how it was computed. True and useful, but not a caveat; filing definitions
  under *Limitations* was diluting the section. Rendered under *What one row is, and how it
  was computed*.
- `STRUCTURAL` — provenance and scaffolding. Not rendered as prose.

**Fail-closed publication, fail-loud validation.** An unclassified key is never published —
drafts, `editor_note`, TODOs and half-written caveats live in unclassified keys, and a typo
like `limtations` must not ship an unreviewed sentence. It is also never silently dropped,
which is how 28 real limitations went unpublished until this was found.

Adding a metadata key is therefore a deliberate act: **write the key, then classify it.**
This replaced two earlier designs that both failed — an eight-name allowlist that discarded
anything unfamiliar, and a denylist that published anything unfamiliar.

# 5. When two pages disagree

Name the canonical one and make the other cite it. Do not average, do not footnote both.
Divergent copies of a dataset under one filename are currently a WARN in the harness because
it cannot know which is right — that is exactly the judgment this section exists to force.

# 6. Corrections

A published number that changes gets a dated correction note in the artifact and an entry in
`CORRECTIONS.md`, stating what it was, what it is, and what caused the change. **Silent
edits are forbidden.** Corrections are appended, never rewritten: an entry that is edited
later is no longer evidence of anything.

The bar for an entry is *a reader could have quoted the old version*, not *the change was
embarrassing*. Several pages carry their own correction blocks in the body for exactly this
reason — the point is not to look careful, it is that someone holding the previous number
can find out what happened to it.

# 7. Release

One command, not a checklist to remember:

```powershell
node tools/verify.mjs           # renders, provenance present
node tools/collide.mjs          # no overlapping or out-of-frame marks
python _data/build/verify_claims.py        # every sentence still holds
python _data/build/verify_consistency.py   # records that should agree, do
node tools/bundle.mjs           # rebuild — shared-file edits stale EVERY bundle
```

Then the part no command covers:

1. **Read the Limitations section** of every page whose flag is coming off. Presence is
   checked; truth is not.
2. **Confirm any zero** was measured, not produced by a dead filter.
3. **Record the verdict** in `ARTIFACT-REVIEW.md`. Publication verdicts belong to the owner
   named at the top of this document and to nobody else — not to a reviewer, not to a
   passing gate, and not to whoever happens to be running the release.

# 8. What this system does NOT prove

Stated plainly so nobody mistakes green checks for correctness. Two independent reviews
ranked this the highest-consequence gap, above every defect the harness catches:

**If a derivation is wrong and the data, the claim and the sentence were all built from it,
every gate passes.** The claims harness re-runs assertions against the same product that
produced them; agreement is not independent validation. Nothing here catches a wrong join, a
wrong denominator, a wrong NAICS filter, or a misread of what a source measures.

## The blind spot, with a real example

There is a second failure the harness cannot see, and it is worth naming concretely because
it happened here rather than in principle.

A claim has two halves: an English sentence and a machine assertion. **Only the assertion is
checked.** If the sentence and the assertion say different things, the gate reports the
assertion, and green means nothing about the sentence.

On the talent page, a claim read *"Northeast Ohio's share of America's polymer degrees fell
from about 18 percent in 2016 to about 10 percent in 2023."* The series said **35.9 percent
and 18.2 percent.** Every number in the sentence was wrong by roughly half, and it passed
every gate for months.

Why it passed: the assertion tested a *shape* — `last < 0.75 × peak` — which is equally true
at 10 percent and at 18. Why it was wrong: an earlier fix to a transposed classification code
(`140320` for `14.3201`) restored a whole university's degrees to the numerator and moved the
whole series. The charts corrected themselves, because charts read the data. The sentence did
not, because a human typed it.

**The rule that follows: assert the quantities the sentence actually names, not a property
they happen to have.** A shape assertion survives the correction that invalidates the prose,
which is precisely when you need it to fail. Where a number appears in body copy, compute it
from the data rather than typing it — several pages now do, and each of those places is one
where this cannot happen again.

The wider guard is not a script. It is a second pair of eyes on the derivation before the
numbers reach a page, and the discipline of writing down what would falsify the finding
*before* running the query.
