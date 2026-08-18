# First In The Nation

**Where does Northeast Ohio actually rank, and what does BLS refuse to tell us?**

Source: BLS QCEW *by-industry* files — every US county, metro and state for one
industry-year. This endpoint is what makes any peer comparison possible.

**What a row is:** one (year, area, NAICS) annual-average cell, private ownership.
`emp` counts JOBS covered by unemployment insurance.

```
index.html      page shell
app.js          four charts
data/peers.json THE DATA (65 KB). Edit the builder, not this.
claims.json     six assertions, re-run by _data/build/verify_claims.py
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
  first in plastics and rubber employment with 54,846 jobs. This is the number to lead
  with in any funder conversation because it carries no asterisk.
- **The metro claim is bounded, not exact.** Akron ranks 6th of 155 *disclosed* metros.
  227 metros are suppressed and **10 of them have more establishments than Akron's 117** —
  Chicago (518), New York (407), Atlanta (298), Dallas (276), Houston (232) among them.
  Any could exceed 6,910 jobs. The defensible statement is **6th to 16th**, and the bound
  is drawn on the chart rather than buried in a footnote.
- **Suppression is not random.** BLS withholds cells that could identify an employer,
  which systematically removes large diversified metros. A ranking built on disclosed
  data alone is biased toward mid-size specialized regions — exactly the kind Akron is.
- Establishment counts survive disclosure far more often than employment. That asymmetry
  is what makes the upper bound computable at all.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/peers/
node ../tools/bundle.mjs peers          # → ../dist/peers.html
python ../_data/build/verify_claims.py peers
```
