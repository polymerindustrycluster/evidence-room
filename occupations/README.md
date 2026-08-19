# The Occupations Inside Polymer Manufacturing

**Which jobs make up plastics and rubber manufacturing, what does each pay in the four
Northeast Ohio metros against the same job nationally, and what schooling do the people
doing them report?**

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
index.html          page shell
app.js              four charts and their table twins
claims.json         12 assertions, all machine-checked against data/viz-data.json
data/viz-data.json  THE DATA (59 KB). Edit the builder, not this.
shots/              desktop.png, mobile.png
INTEGRATION-NOTE.md what the controller must wire before this page is reachable or shippable
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
- **The projected openings are a projection** — a modelled path with no confidence band, for
  the eighteen-county JobsOhio Northeast region, a superset of the footprint.
- **The page deliberately contains none of the words** career, pathway, kindergarten,
  retirement, K-12, roadmap, or map. It is a data page about occupations and wages; anything
  built on it for other audiences is a separate artifact with separate owners.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/occupations/
node tools/bundle.mjs occupations       # → dist/occupations.html
```
