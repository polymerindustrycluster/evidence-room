# Every Number Moves

**How much do published figures change after publication?**

Source: ALFRED — the archival vintages behind FRED, 2019–2026.

**What a row is:** one (series, reference month) with every value ever published for it

```
index.html      page shell
app.js          charts and interaction
data/revisions.jsonTHE DATA (154 KB). Edit the builder, not this.
shots/          desktop.png, mobile.png
```

## Rebuild the data

```
cd ../_data/build
python derive_rest.py
```

Raw pulls live beside that script so a derivation can be re-run without re-fetching.

## Read before quoting anything from this page

- Revisions here are small (median ~0.15%) and that IS the finding — a trend drawn from fresh producer-price data is safe to act on.
- This does not generalise. County employment and QWI revise substantially more, and QWI restates whole histories on re-benchmarking. Running this method against the employment series is the follow-up.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/revisions/
node ../tools/bundle.mjs revisions          # → ../dist/revisions.html
```
