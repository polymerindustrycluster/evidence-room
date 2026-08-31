# The Hollowing of Polymer Education

**Which layer of polymer education contracted, by how much, and against what baseline —
every US polymer degree and certificate program in the federal record, 1991–2023.**

Sources: IPEDS completions by six-digit CIP via the Urban Institute Education Data API
(the polymer-programs-db census build of 2026-08-21); the same pull re-run for six peer
technician CIPs as a control; College Scorecard field-of-study earnings and debt for the
one polymer CIP the Scorecard publishes unsuppressed.

**What a row is:** one (institution, program CIP, award level) with a completions count for
every year it conferred. Programs are enumerated from the union of all years — a single
year undercounts, because a program with no completions that year is invisible in it.

```
index.html          page shell
app.js              seven charts and their table twins
claims.json         11 assertions — 9 machine-checked against data/viz-data.json, 2 manual
data/viz-data.json  THE DATA (18 KB). Edit the deriver, not this.
INTEGRATION-NOTE.md what the controller must wire before this page is reachable or shippable
```

## Rebuild the data

The census lives in a sibling checkout (`Documents/polymer-programs-db`), which is itself
reproducible from the public API with no key:

```
cd ../../../polymer-programs-db
python fetch_ipeds_national.py     # ~200 API calls -> raw_ipeds_national.json
python build_db.py                 # -> programs.sqlite (generated, never hand-edited)
python fetch_control_cips.py       # -> control_cips.json (the control, same rule)

cd ../pic-github/evidence-room/_data/build
python derive_programs.py          # -> ../../programs/data/viz-data.json, with printed
                                   #    cross-checks against every number the page states
```

Set `PROGRAMS_DB` if the sibling checkout is elsewhere.

## Read before quoting anything from this page

- **Every count is a floor, not a census.** IPEDS records the CIP an institution *chose*;
  rubber and coatings have no CIP; UChicago, Dartmouth, Rutgers and Brown teach polymer
  science invisibly under chemistry codes. Say "at least."
- **"Ended" is not "closed."** Institutions keep teaching under other codes; three of nine
  named closures failed a catalogue check in this project's history. No named-casualty
  list without one.
- **The survival comparison is a construct, and the construct is stated**: substantive =
  more than ten lifetime completions; active = a completion in 2023. Moving the threshold
  moves the rates (28% → 71% with a stricter one, in the census's own README); the control
  uses the identical rule, which is what makes the comparison a comparison.
- **The 2020 certificate recode is corrected before counting.** Uncorrected, it splits
  continuous programs and manufactures a phantom 2018–19 closure wave — written up,
  investigated, and retracted in the census's `STORY-SPEC.md`, and the retraction is more
  instructive than the finding would have been.
- **Never quote "147 institutions → 41."** Mixed denominators (a 33-year union against a
  one-year snapshot). The census documents the kill.
- **No talent-pipeline argument rests on this page alone** — polymer completions have no
  denominator here; total US conferrals rose over the same period, so the polymer *share*
  fell further than the count. And no per-state "zero programs" claim, ever: state counts
  are filing behaviour.
- **The earnings panel is five institutions** because that is the complete unsuppressed
  record, not a sample; no average of them describes the field. Vintages differ by measure
  and any debt-to-earnings ratio mixes cohorts.
- **This page contains none of the words** career, pathway, K-12, or roadmap. It is a data
  page about programs and completions; anything built on it for other audiences is a
  separate artifact with separate owners — and workforce interpretation for Northeast Ohio
  is co-authored, not asserted (see INTEGRATION-NOTE).

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/programs/
node tools/bundle.mjs programs          # → dist/programs.html
```
