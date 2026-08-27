# The Occupations Inside Polymer Manufacturing

**Can the region staff, pay and replace the jobs that make it a polymer capital?** The
page answers in four beats, each carrying the last one's conclusion forward: the industry
is mostly floor work (the distinctive engineer/scientist share is 4.0%); the metros pay
that floor near the national rate but pay the degree occupations under it, in every metro;
the degree occupations are exactly the engineer and scientist jobs; and the local polymer
degree count ran 118–179 a year from 2014 through 2021, then 54 and 63.

Sources: BLS Employment Projections National Employment Matrix (2024–34, industry 326000);
BLS Occupational Employment and Wage Statistics, May 2024, metropolitan and national files;
O*NET 30.3 (U.S. Department of Labor, CC BY 4.0); IPEDS completions by CIP via the Urban
Institute Education Data API; BLS QCEW 2024 (one regional estimate); Ohio Department of Job
and Family Services 2022–2032 occupation projections (JobsOhio Northeast).

**What a row is:** one detailed occupation (six-digit SOC code) — its share of national
plastics-and-rubber employment, its annual median wage in each metro and nationally, its
reported education distribution and Job Zone; plus, for the degree occupations, one
(institution, program, award level) row of degrees conferred.

```
index.html          page shell (hero poses the question; four bands answer it)
styles.css          page-local chrome: figure titles, occupation selector, stat band,
                    band tint, mobile re-layout override
app.js              four charts (desktop + mobile forms), selector, table twins
claims.json         22 assertions, all machine-checked against data/viz-data.json
data/viz-data.json  THE DATA (59 KB). Edit the builder, not this.
shots/              desktop.png, mobile.png
```

## Rebuild the data

```
cd ../_data/build
python fetch_occmix.py            # staffing pattern (already wired site-wide)
python fetch_oews.py              # metro wages — the occupation SET is defined here
python fetch_oews_national.py     # national wages, same set (reads oews.json)
python fetch_onet_education.py    # O*NET title, Job Zone, education (reads oews.json)
python fetch_ipeds_cip.py         # degrees by CIP (already wired site-wide)
python derive_occupations.py      # -> ../../occupations/data/viz-data.json
```

The occupation set lives in ONE place — the `SOC` dictionary in `fetch_oews.py`. The
national wage pull and the O*NET pull read it from `oews.json`, so the three files cannot
describe different lists. On 2026-08-18 the set was widened from 14 codes (the engineering,
science and technician occupations a polymer cluster is distinctive for) to 26, adding the
rest of the industry's fourteen largest occupations by national staffing share.

## Read before quoting anything from this page

- **The metros are never summed and never called PIC-12.** Akron, Cleveland, Canton-Massillon
  and Youngstown-Warren neither nest inside nor tile the twelve counties.
- **The wages are all-industry.** A metro's median for a chemist is across every industry that
  employs one, not what a plastics plant pays. The staffing shares are national.
- **The regional occupation counts are estimates** — national shares × the twelve counties'
  2024 industry employment — under a stated assumption. The sentence says so.
- **Withheld is withheld, never zero.** Tire builders are published for none of the four
  metros; the page says so rather than drawing a zero.
- **O*NET is not a requirement and not regional.** The education distribution is what surveyed
  workers report; the Job Zone is a national typical-entry rating; release 30.x reports the two
  lowest zones as one band. One SOC can hold several O*NET variants — the row says how it was
  joined.
- **Degrees are not hires.** The programs section counts people finishing, not staying.
- **The polymer-degree drop is two observed years (2022, 2023), broad across every polymer
  program, while the materials programs held their 2014–2021 range.** A CIP recoding (a
  program reclassified to a different six-digit code) would produce the same arithmetic
  without any real decline; the lede says so. Before treating the halving as a fact about
  people rather than about codes, confirm against the universities' own conferral counts
  (see the interview ask below).
- **The projected openings are a projection** — a modelled path with no confidence band, for
  the eighteen-county JobsOhio Northeast region, a superset of the footprint.
- **The occupation selector** highlights one SOC row across the mix, pay and education
  charts and recomposes one templated sentence. Claims guard the DEFAULT sentence and the
  data join; per-occupation variants recompose from the same guarded fields.
- **The page deliberately contains none of the words** career, pathway, kindergarten,
  retirement, K-12, roadmap, or map. It is a data page about occupations and wages; anything
  built on it for other audiences is a separate artifact with separate owners.

## Reporting that would elevate the page (drafted, not faked)

The human-scale beat currently rides on a translated vignette (the +$30 / −$16,200
paycheck pair, both from OEWS medians). One reporting call would upgrade it and one would
harden the pipeline finding:

1. **A hiring manager or plant HR lead at an Akron-metro molder** (any PIC member that
   posts molding-machine-setter openings). Three questions: What does a setter posting
   offer today, and how does that compare with the $41,260 metro median? How long does a
   setter opening stay unfilled? Do you compete for setters with non-polymer plants?
   Quote slots into the paycheck band, beside the +$30 card.
2. **The chairs of Akron's School of Polymer Science and CWRU's macromolecular
   program.** Three questions: Do your own conferral counts confirm the 2022–2023 drop the
   federal record shows? Was any program recoded to a different CIP code after 2021? What
   share of recent graduates take jobs inside the region? Quote slots into the pipeline
   band, beside the on-chart bracket.

The page ships at rung 3 (translated vignette) without these; it is not ship-blocked.

## Revision note, 2026-08-27

Editorial rebuild (skill-rebuild branch): re-sequenced into an argument (staffing → pay →
schooling → pipeline) with the organizing question in the dek; pay chart grouped into
labeled schooling bands with band ratios annotated on-chart; degree-pipeline decline
surfaced as a finding (previously a "Degrees, not hires." caveat note); occupation
selector added; paycheck vignette band added; guardrails de-duplicated to one statement
per binding layer; per-figure title/subtitle chrome added; per-form mobile re-layouts
replace the sideways-scroll fallback. No source data changed. Claims: 12 → 22. Removed
claim ids: none. Reworded claim texts (same assertions): occ-hero-one-in-nine (em-dash →
comma), occ-tire-builders, occ-beats-national, occ-degree-vs-floor, occ-programs,
occ-closer — each now names the sentence's new location. The former "The reading." note
under the pay chart moved onto the chart itself (band annotations) and into the lede; the
former "Degrees, not hires." note became the pipeline section's finding plus a source-line
clause.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/occupations/
node tools/bundle.mjs occupations       # → dist/occupations.html
```
