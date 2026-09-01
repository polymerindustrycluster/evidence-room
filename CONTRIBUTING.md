# Contributing

The most valuable contribution is a **disproof**: a sentence on a published page that you
can show is wrong. Open an issue with the page, the quoted sentence, the number you get,
and how you got it. Confirmed errors receive a dated public correction — that is a promise
in our methods policy, not a courtesy.

## Ground rules for changes

1. **Every sentence needs a guard.** A new or changed figure needs a claim in that page's
   `claims.json` with a real `falsified_if`. A band so wide it cannot fail is not a guard.
2. **Every metadata key must be classified** (limitation / method / structural) in
   `_shared/picviz.js` — an unclassified key fails the build, on purpose.
3. **Sources go in the registry**, `_data/SOURCES.json`, with exact filter values and the
   fetch script. Never in prose alone.
4. **Run the four gates** before a PR (see README). The Pages deploy runs them again and a
   failure blocks the deploy.
5. **No member, applicant, or personal data.** This repository is public and its history is
   permanent. If a contribution needs data that cannot be public, the contribution is a
   fetch script, not a dataset.
6. **Corrections are dated, never silent.** If your PR changes a published number, it must
   also add the correction note.

## Style

Read `_data/METHODS-SOP.md` first — it is short and it is the contract. Charts follow the
house rules (linear scales, named bars, constant dollars, no dual axes); the validators
will catch most violations, but the SOP explains why they exist.
