# Corrections

Every published number that changes gets an entry here: what it said, what it says now, and
what caused the change. Entries are **appended, never rewritten** — an entry edited later is
no longer evidence of anything.

The bar for an entry is *a reader could have quoted the old version*, not *the change was
embarrassing*. Several pages also carry a correction block in the body where the error is
most likely to be re-made; those are the same events, described where they matter.

Newest first. Report an error by opening an issue — the **Data error** template asks for the
page, the figure, and what you think it should be.

---

## 2026-08-17 — the pre-publication review

This repository was reviewed page by page before anything was published. Eleven pages
cleared and are here. Ten did not and are absent, for reasons ranging from confidential
source data to the defects below. The corrections that follow were found in that review; they
are recorded because the pages existed internally and their numbers had circulated, and
because a corrections log that starts empty on launch day is telling you nothing.

Four of these are on pages that are **not** in this repository. They are listed anyway. A
correction log that only admits errors on the work that survived review is a marketing
document.

### The share of national polymer degrees — *talent*, not published

**Was:** "Northeast Ohio's share of America's polymer degrees fell from about 18 percent in
2016 to about 10 percent in 2023."
**Is:** 35.9 percent in 2016 to 18.2 percent in 2023 — a fall of about half, over the same
period, at twice the level.

**Cause.** An earlier repair to a transposed classification code — `140320` was typed for
`14.3201`, and a code that does not exist returns no rows, which looks exactly like a real
program with no graduates — restored a second university's degrees to the numerator and moved
the entire series. The charts on the page updated, because charts read the data. The sentence
did not, because a human had typed it.

**Why no check caught it.** The claim's assertion tested that the last value was below three
quarters of the peak. That is true at 10 percent and true at 18 percent, so the assertion kept
passing while the sentence it was supposed to defend became false. The assertion now pins both
endpoints the sentence names. This is written up as a named limitation in
`_data/METHODS-SOP.md` §8, because it is the clearest evidence available that a passing gate is
not a correct page.

### Hires per year — *talent*, not published

**Was:** a heading reading "against ten thousand hires", with the chart beneath it drawing
8,111.
**Is:** 8,111 — roughly 8,100 where the text says "roughly". The heading and the lede are now
computed from the same constant the chart uses and cannot diverge from it again.

**Cause.** A rounded figure typed into a heading. It overstated by 23 percent, in the
direction that makes the argument louder, which is the direction that costs the most when
someone checks.

### The bound on the research collaboration count — *collaboration*, not published

**Was:** a summary card describing seven papers as those that "mention polymers — a keyword in
the text, not a subject code."
**Is:** those seven are papers *classified* in OpenAlex subfield 2507, Polymers and Plastics.

**Cause.** The card described a keyword search that had been replaced by a subject
classification. It was the inverse of the actual method, and it sat directly beneath a
paragraph stating the method correctly.

### "No new joint federal award since 2017" — *collaboration*, not published

**Was:** "no new joint federal award has started since 2017", unbounded.
**Is:** "within the window measured here, 2012 to 2024, no new joint federal award started
after 2017" — with the CWRU-led NEO-SMART NSF Engine (awarded 14 July 2026) named on the page
as falling outside the window.

**Cause.** A sentence written without the window its own data carries. The award data ends in
2024 and cannot speak to what came after it, so the arithmetic was never wrong — but the
sentence was refutable in one link, and by another page in the same project.

### The partner-direction summary — *reach*, not published

**Was:** "joins more than it leads with Michigan and Harvard."
**Is:** neither institution appears in that chart, in the table behind it, or anywhere in the
underlying data. The passage is now generated from the chart's own rows.

**Cause.** A sentence about a chart, written by hand, describing a chart that had changed.

### The published data source line — *reach*, not published

**Was:** the methodology box described the works as "matching 'polymer'".
**Is:** works in OpenAlex subfield 2507.

**Cause.** The pull filtered on the subfield; only the string describing it still named the
keyword — the same keyword bound the page's own methodology text explains was discarded for
sweeping in unrelated biomedical research. The pull was always right; its description was
not, which is the harder kind to notice, because nothing downstream disagrees with a string.

### Three affiliation-parser artifacts — *reach*, not published

**Was:** Shaker Heights Public Library appeared among the largest research partners with
seven papers led; two further public libraries appeared with one each.
**Is:** all three are quarantined, named, and their paper counts reported, alongside the one
artifact that had already been caught.

**Cause.** The exclusion list was hand-written and one entry long, so it caught the case
someone had already looked at and missed a case seven times larger. It is still a denylist
and still only catches what someone has noticed; that limitation is recorded in the script.

### The credit-concentration closer — *credit*, not published

**Was:** "strip out one tire company and this region's credit export looks like its
neighbors."
**Is:** the region's rate already sits inside the peer range with that company included, and
removing it moves the figure further from the state's own rate, not closer.

**Cause.** A closing line that asserted a dependence the page's own benchmark disproves two
sections above it, and then pointed the wrong way. The finding it was reaching for is real
and is now stated directly: a regional headline should not move ten points on one firm's
choice of filing address.

### Documents that render in standards mode

**Was:** every page in this project except two was served without a doctype, and so rendered
in quirks mode — laid out to the CSS box model, but measured against a much older one.
**Is:** all pages declare `<!DOCTYPE html>`, a language, and a viewport.

No published figure changed. It is here because it affected every page, it was invisible
precisely because the pages still looked correct, and someone reproducing this work should
know it was wrong for a long time.
