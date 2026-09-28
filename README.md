# The PIC Evidence Room

Data journalism on the Northeast Ohio polymer economy — employment, wages, patents,
research reach, talent, prices — published by the Polymer Industry Cluster with the
working shown.

**Live site:** https://polymerindustrycluster.github.io/evidence-room/

## What makes this different

Regional economic claims usually arrive as slideware: a number, a logo, no trail. Every
page here exposes the evidence and checks behind its claims:

- **A source registry.** `_data/SOURCES.json` names each dataset's endpoint, its **exact
  filter values** (NAICS codes, CIP codes, CPC classes, subfield IDs — the values, not a
  description of them), and the script that fetched it. The "Reproduce this" block on each
  page renders from this registry. Its filters still need to be checked against the fetcher
  and the records it actually returns.
- **A claims harness.** Recorded claims in each page's `claims.json` carry assertions
  against the data that produced them and a stated `falsified_if` condition.
  `python _data/build/verify_claims.py` runs them all. This is not coverage of every sentence
  or independent proof that the source was acquired or interpreted correctly.
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

# install the pinned browser dependency, then run the complete suite
npm ci
node tools/all.mjs
# --fast is the CI subset; it explicitly reports the checks it skips
```

Each page's derived `data/*.json` is committed, so a version identifies the data its charts
render. Raw source caches are not public here. A live refetch can differ because agencies
revise records, definitions change, or an endpoint becomes unavailable. Reproducing a pinned
input and refreshing an upstream source are different operations; neither guarantees
identical bytes from a later live request. See [REBUILDING.md](_data/REBUILDING.md) for the
tested producer paths, source-custody limits, and historical rebuild failures.

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

The [live index](https://polymerindustrycluster.github.io/evidence-room/) is the reader's
directory. Unreleased work remains outside this public repository when its sources or
editorial review do not support publication. Reasons include:

- **Restricted company records.** An internal classification or membership field does
  not become public merely because it is useful to a chart.
- **Applicant data.** An unsuccessful application is not material a funder may publish
  simply because it appeared in an internal analysis.
- **Partner reporting.** Material under embargo or awaiting an agreed sign-off stays
  outside the public tree.
- **Unfinished review.** A rebuilt comparison needs fresh independent scrutiny before
  an earlier verdict can apply to it.

An unlinked file in this repository is still public. The publication boundary is the
repository, not whether the index links to a page.

## License

Code: MIT (see LICENSE). Text and figures: CC BY 4.0 (see LICENSE-CC-BY-4.0) — reuse with
attribution to the Polymer Industry Cluster. Underlying federal data is public domain; each
page names its sources.

To cite this work, see [CITATION.cff](CITATION.cff). Cite the version you used: the federal
series behind these pages are revised after publication — [one of the pages here is about
exactly that](revisions/) — so a figure quoted without a date is not reproducible.
