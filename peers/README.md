# First In The Nation

**Where does Northeast Ohio actually rank, and what will BLS not tell us?**

Source: BLS QCEW *by-industry* files — every US county, metro and state for one
industry-year. This endpoint is what makes any peer comparison possible.

**What a row is:** one (year, area, NAICS) annual-average cell, private ownership.
`emp` counts JOBS covered by unemployment insurance. Private ownership leaves out
government employers.

```
index.html      page shell
styles.css      page-local CSS: figure chrome, metro finder, mobile re-layout
app.js          four charts, each with a desktop and a phone rendering
data/peers.json THE DATA (65 KB). Edit the builder, not this.
claims.json     24 assertions, re-run by _data/build/verify_claims.py
shots/          desktop.png, mobile.png
```

## Rebuild

```
cd ../_data/build
python fetch_peers.py     # ~26 requests, writes peers.json (5.4 MB raw)
python derive_peers.py
```

## Read before quoting anything from this page

- **The state claim is complete.** 51 of 51 states disclosed, zero suppressed. Ohio is
  first with 54,846 jobs, 10,248 clear of second-place Texas. This is the number to lead
  with in any funder conversation because it carries no asterisk.
- **The metro claim is a rank among the disclosed, and nothing more.** Cleveland is 4th
  and Akron 6th of the **155 metros that disclose**. 227 metros are withheld; their
  employment is unknown, not estimated, and they hold 6,142 establishments between them.
  The four words &ldquo;among the metros the bureau discloses&rdquo; are not removable.
- **Correction, 2026-08-28.** An earlier version of this README and of the page presented
  **&ldquo;6th to 16th&rdquo;** as the defensible statement, bounding Akron's rank by counting the
  suppressed metros with more establishments than Akron's 117. **That bound is invalid.**
  Establishment count does not bound employment: a suppressed metro with fewer but larger
  plants beats Akron on jobs. The true worst case is 6th of 382, which is not a useful
  sentence. The page now states the disclosed-only rank and shows the withheld field on
  the scatter instead of pretending it can be bounded. Corrections here are dated and
  append-only; the previous wording is quoted above rather than deleted.
- **Suppression is not random.** BLS withholds cells that could identify an employer,
  which systematically removes large diversified metros. A ranking built on disclosed data
  alone leans toward mid-size specialized regions, which is exactly what Akron is. The
  155 disclosed metros hold 216,109 jobs, 30% of the 721,430 the states add up to.
- **One passage on the page has no dataset behind it.** What Elkhart, Hickory, Erie and
  Greenville make is carried in `claims.json` as `quadrant-towns` with `verify: "manual"`,
  and the page says so in its own text. It needs one editor pass that opens each source
  and records the URL and date before publication. Until then it is a debt, not a check.

## Known data gaps

- **Cleveland has no time series here.** The trend extract in `derive_peers.py` keeps
  metros that finished top-30 by 2024 employment *and* carry at least eight disclosed
  years. Cleveland clears the first test and fails the second, so the chart shows it as a
  single ghosted 2024 point with the absence labelled. Closing this needs a re-fetch of
  QCEW by-industry NAICS 326, private ownership, annual averages, area `C1741`, for
  2015&ndash;2024, recording each year's `disclosure_code` so the number of withheld years
  can be published rather than deduced.
- Three of the 24 series carry a one- or two-year gap where that metro's cell was
  withheld. The line connects across the gap; the trend table's note says so.
- **Wording fix, 2026-08-28.** The trend lede called these &ldquo;the 24 metros with a full
  decade in this file&rdquo;, which contradicted the sibling claim that three of the 24 miss
  a year. It now says 24 metros *in this extract*; the counts never moved.

## Reporting we have not done

The page has two human-scale beats and neither came from anyone we spoke to. The first is
sourced from company and trade-body statements (Elkhart, Hickory, Erie, Greenville). The
second is arithmetic: Akron's 6,910 jobs across 117 establishments, about 59 a site,
guarded as `akron-per-site`. That is a rung-3 vignette and it ships as one; it is an
average across sites of every size, never evidence about a particular employer. The rung-1
ask that would replace both, drafted and unsent:

> To the Greater Akron Chamber and to one plant manager at a molder in Summit or Portage
> County: seven metro areas in the country carry 4,000 or more plastics and rubber jobs at
> twice the national concentration, and Akron is one of them, alongside Elkhart, Erie,
> Hickory, Greenville, Scranton and Greensboro. What does that company keep look like from
> inside a plant here? Who do you lose people to, and who do you win them from?

## Composition pass, 2026-08-28

A visual review at 1:1 found the apparatus competing with the findings. What moved, and
where it went, so nothing reads as deleted:

- Hero cut to kicker, headline, a 53-word standfirst and a byline. The four-term glossary
  now sits at the end of band 1 as a `.terms` aside at footnote scale; the first chart
  starts at 1,244px on desktop and 1,570px at 375px, down from roughly 1,600 and 2,200.
- Source lines cut to source, period and one limitation, at or under 45 words each, with
  no bold. The overflow moved INSIDE each figure's existing table disclosure (`.tnote`):
  the top-20 share, the corner thresholds, the trend extract's gaps.
- The footprint banner is one line; the county list, the wider fourteen-county definition
  and the rejected 6th-to-16th bound are in the methodology box. The banner no longer names
  another footprint by its internal label.
- The methodology's data-dictionary strings are re-set in reader words on the way in,
  because the committed `meta.row` and `meta.derived_note` carry backticks that rendered as
  literal characters. Fix the builder to remove them at source and this override can go.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/peers/
node ../tools/bundle.mjs peers          # → ../dist/peers.html
python ../_data/build/verify_claims.py peers
```
