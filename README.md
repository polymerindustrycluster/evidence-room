# The PIC Evidence Room

Data journalism on the Northeast Ohio polymer economy — employment, wages, patents,
research reach, talent, prices — published by the Polymer Industry Cluster with the
working shown.

**Live site:** https://polymerindustrycluster.github.io/evidence-room/

## What makes this different

Regional economic claims usually arrive as slideware: a number, a logo, no trail. Every
page here carries, machine-enforced:

- **A source registry.** `_data/SOURCES.json` names each dataset's endpoint, its **exact
  filter values** (NAICS codes, CIP codes, CPC classes, subfield IDs — the values, not a
  description of them), and the script that fetched it. The "Reproduce this" block on each
  page renders straight from this registry, so it cannot drift from the code.
- **A claims harness.** Every published sentence is backed by an assertion in that page's
  `claims.json`, re-run against the data that produced it, with a stated `falsified_if`
  condition. `python _data/build/verify_claims.py` runs them all.
- **A limitations contract.** Every prose metadata key is classified — limitation, method
  note, or structural — and an unclassified key **fails the build** rather than being
  silently dropped or silently published. Every page states what its instrument cannot see.
- **A consistency harness.** `python _data/build/verify_consistency.py` checks the facts
  recorded in more than one place: registry ↔ scripts ↔ pages ↔ bundles ↔ hub.
- **Dated corrections.** When a published number changes, [CORRECTIONS.md](CORRECTIONS.md)
  says what it was, what it is, and what caused the change. Entries are appended, never
  rewritten. Silent edits are forbidden by [METHODS-SOP](_data/METHODS-SOP.md) — and the log
  is not empty on day one, because the review that decided what could be published found
  errors and they are all in there, including the ones on pages that did not make the cut.

## What this is not

Working research by PIC staff, not official statistics. The limitations on each page are
load-bearing — read them. Some analyses were built with AI assistance; each page's
methodology block states exactly what was checked and what was not. And one thing no
harness proves: if a derivation is wrong and the data, the claim, and the sentence were all
built from it, every gate passes. The guard for that is you — see
[METHODS-SOP §8](_data/METHODS-SOP.md), then open an issue.

## Reproduce it

```bash
# fetch scripts live in _data/build/ — each names its endpoint and filters
python _data/build/fetch_qcew.py      # example; some sources need a free API key (named in SOURCES.json)

# the gates
node tools/verify.mjs                  # pages render, provenance present
node tools/collide.mjs                 # no overlapping or clipped marks
python _data/build/verify_claims.py    # every sentence still holds
python _data/build/verify_consistency.py
```

Raw fetched data is not committed — it is re-fetchable by construction, and that is the
point. What is committed: the derive scripts, each page's derived `data/*.json`, and the
registry that lets you check our work.

## Found an error?

Open an issue — the **Data error** template asks for the page, the figure, and what you
think it should be. Quote the sentence, name the page, and, if you can, the number you get
instead and how you got it. Confirmed errors get a dated entry in
[CORRECTIONS.md](CORRECTIONS.md).

The single most useful thing you can send is a **derivation** that disagrees with ours. The
gates in this repository check that our sentences match our data; they cannot check that our
data was built correctly in the first place. That is the gap described in
[METHODS-SOP §8](_data/METHODS-SOP.md), and an outside derivation is the only thing that
closes it.

## Not in this repository

Twenty-two analyses are here after the 2026-08-31 promotion of four workshop pages
(atlas, programs, reach, collaboration — each through a cross-model stage-7 audit and its
named fixes before arriving). Six more exist internally and are not published, each for a
stated reason:

- **Member-company records.** Two pages rest on a catalogue of company records including
  membership status. Publishing those is a consent question that has not been answered.
- **Applicant data.** Two pages describe a funding round application by application,
  including applications that were not funded. Naming an unsuccessful applicant is not
  something a funder gets to do.
- **Partner reporting under embargo.** One page quotes project reporting that requires
  partner sign-offs it does not yet have (the permission gate is printed on the page
  itself).
- **Rebuilt, awaiting fresh review.** Two pages were rebuilt after their audit verdicts
  (a corrected comparator on one, a corrected decomposition on the other) and are held
  until the rebuilt text gets a fresh independent pass rather than being waved through
  because a gate went green.
- One further page is held pending conversations it names.

Their absence is stated here rather than left to be discovered.

## License

Code: MIT (see LICENSE). Text and figures: CC BY 4.0 (see LICENSE-CC-BY-4.0) — reuse with
attribution to the Polymer Industry Cluster. Underlying federal data is public domain; each
page names its sources.

To cite this work, see [CITATION.cff](CITATION.cff). Cite the version you used: the federal
series behind these pages are revised after publication — [one of the pages here is about
exactly that](revisions/) — so a figure quoted without a date is not reproducible.
