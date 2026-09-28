# Polymer Education’s 2016–2023 Decline

**Which selected-code program records still reported completions in 2023?** The technician
active share is lower than either polymer degrees or six peer technician trades under
the same substantive-program rule. The scope is three named polymer CIPs, 1991–2023;
2020 is quarantined. This is not a count of all polymer teaching or current capacity.

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
claims.json         quantitative guards plus explicitly documentary claims
data/viz-data.json  THE DATA (18 KB). Edit the deriver, not this.
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

The base rate's control does NOT come through that sibling. It is pulled in this repository,
keyless, from the same public endpoint, and merged into the page file in place:

```
python3 _data/build/fetch_ipeds_control_baserate.py --check   # pull and verify, write nothing
python3 _data/build/fetch_ipeds_control_baserate.py           # and write layers.control.base
```

It refuses to write unless it first reproduces the page's own published 2023 active-share control
(48%) to the point from the live API, which is what licenses the base-rate numbers beside it.

## Read before quoting anything from this page

- **Every count is a floor, not a census.** IPEDS records the CIP an institution *chose*;
  rubber and coatings have no CIP; UChicago, Dartmouth, Rutgers and Brown teach polymer
  science invisibly under chemistry codes. Say "at least."
- **"Ended" is not "closed."** Institutions keep teaching under other codes; three of nine
  named closures failed a catalogue check in this project's history. No named-casualty
  list without one.
- **Definitions are fixed.** Small = ten or fewer lifetime completions; brief = first-to-last
  reporting span of five calendar years or less, inclusive; substantive = more than ten
  lifetime completions; active = a positive completion in 2023. Small and brief overlaps
  both sets. Neither is a failed-start measure.
- **Both comparisons use the same six trades, on two different populations and pull dates.** The 2023 active-share comparison counts
  substantive programs only (more than ten completions); the base rate counts every start
  with the threshold off, because thresholding on size throws away the population the number
  is about. Never quote 8,736 against 6,648: they are two counts of the same six trades under
  two different rules, and the page states which is which.
- **Missing years affect both threshold membership and coverage.** The Urban mirror
  never served the `C2023_A` collection year (`_data/build/ipeds_mirror_fix.py` names this
  page as still carrying that hole). A missing year can understate a record's lifetime
  completions or reporting span. Recovered years may also add records to the denominator.
  These snapshot shares are not failure probabilities; a shared mirror does not guarantee
  cancellation in the ratio between fields.
- **The active-share comparison is a construct, and the construct is stated**: substantive =
  more than ten lifetime completions; active = a completion in 2023. Moving the threshold
  moves the rates; the control
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
  separate artifact with separate owners; workforce interpretation needs additional evidence.

## Revision of 2026-09-08

The page separates the 57% small-record share from the 45% small-and-brief share, removes
historical-first and stability claims, preserves Akron's graduate contribution (42 of 44
completions in 2023), and replaces the unsupported grant overlap with the later 2024
announcement chronology. The national and Akron annual series, threshold counts, top
technician records and degree composition were rechecked against the held sibling census.
The missing 2020 remains missing in both line charts. All six evidence charts re-layout
at phone width; table records remain available. See the dated in-page correction.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/programs/
node tools/bundle.mjs programs          # → dist/programs.html
```
