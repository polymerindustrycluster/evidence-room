# The Spike Ended, Prices Didn't

**What happened to the energy going in and the prices coming out?**

Source: U.S. EIA (Henry Hub, Ohio industrial electricity) and FRED/BLS producer price indexes, monthly, 2015–2026.

**What a row is:** one (series, month) observation

```
index.html      page shell
app.js          charts and interaction
data/scissors.json THE DATA (35 KB). Edit the builder, not this.
shots/          desktop.png, mobile.png
```

## Rebuild the data

```
cd ../_data/build
python derive_rest.py
```

Raw pulls live beside that script so a derivation can be re-run without re-fetching.

## Read before quoting anything from this page

- Series are in $/mcf, ¢/kWh and index points. They are rebased to 100 at 2019-01 so that ONE axis is honest. This page exists partly to avoid the dual-axis anti-pattern.
- An index shows movement from the base month only — a series that starts high and stays flat looks like one that is cheap and flat.
- The gap chart is a difference of two same-based indexes, which is legitimate. It is NOT a margin: resin feedstock, labour and freight are not in it.

## Run and publish

```
cd .. && python -m http.server 8899     # http://localhost:8899/cost-scissors/
node ../tools/bundle.mjs cost-scissors          # → ../dist/cost-scissors.html
```
