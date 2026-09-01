"""The feedstock and resin links of the polymer price chain, appended to fred.json.

fetch_rest.py pulls the OUTPUT stage only — what this industry sells. With just that you
can show prices stayed high but not WHERE in the chain they stuck, which is the whole
question. This adds the two upstream stages and stamps every series with its link.

WHY THIS IS A FILE AND NOT A ONE-OFF
  It was a one-off. These three series were added with an inline script that was never
  saved, so the next `fetch_rest.py` overwrote fred.json, silently dropped them, and the
  cost-scissors page rendered blank with a TypeError. Every dataset in this project is
  supposed to rebuild from _data/build — a step that only ever existed in a shell history
  is not a step, it is a liability.

  Run order:  fetch_rest.py  ->  fetch_chain_prices.py  ->  derive_rest.py

WHAT A ROW IS
  One (series, month) index level or price. Bases and units differ per series and are
  never unified — the page indexes each to its own January 2019 before drawing.
"""
import json, os, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
K = {}
for l in open(os.path.expanduser("~/.env"), encoding="utf-8", errors="ignore"):
    if "=" in l and not l.startswith("#"):
        k, v = l.split("=", 1); K[k.strip()] = v.strip().strip('"').strip("'")

# stage is the link in the chain, and it is what the page groups and colors by
ADD = {"WTISPLC":         ("Crude oil, WTI spot", "feedstock"),
       "PCU325211325211": ("PPI: plastics material and resin manufacturing", "resin"),
       "WPU066":          ("PPI: plastics resins and materials", "resin")}
# series fetch_rest.py already pulls, tagged here so the whole file carries a stage
STAGE = {"WPU072": "product", "PCU326326": "product", "WPU06": "context"}
START = "1997-01-01"

p = os.path.join(HERE, "fred.json")
d = json.load(open(p, encoding="utf-8"))
have = {r["series"] for r in d["rows"]}
for r in d["rows"]:
    r["stage"] = STAGE.get(r["series"], r.get("stage", "context"))

for sid, (label, stage) in ADD.items():
    if sid in have:
        print(f"  {sid}: already present"); continue
    u = (f"https://api.stlouisfed.org/fred/series/observations?series_id={sid}"
         f"&api_key={K['FRED_API_KEY']}&file_type=json&observation_start={START}"
         f"&frequency=m&aggregation_method=avg")
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120) as r:
            obs = json.loads(r.read().decode())["observations"]
    except Exception as e:
        print(f"  {sid}: {type(e).__name__} {str(e)[:70]}"); continue
    n = 0
    for x in obs:
        if x["value"] in (".", ""): continue
        d["rows"].append({"series": sid, "label": label, "stage": stage,
                          "date": x["date"], "value": float(x["value"])}); n += 1
    print(f"  {sid:18s} {n} obs  {label}")
    time.sleep(0.4)

d["meta"] = {"source": "FRED / ALFRED, Federal Reserve Bank of St. Louis",
    "row": "one (series, month) index or price level",
    "stages": "feedstock -> resin -> product. The chain has three links, and 'did output "
              "prices follow input prices down' is unanswerable with only the last one.",
    "caution": "These are NATIONAL series. None is an Ohio delivered cost, and a producer's "
               "actual input price reflects contracts and hedges no public index shows. "
               "Read the divergence, never the level.",
    "fetched": "2026-08-15"}
json.dump(d, open(p, "w", encoding="utf-8"), separators=(",", ":"))
import collections
c = collections.Counter((r["stage"], r["series"]) for r in d["rows"])
print(f"\nwrote {p} {round(os.path.getsize(p)/1024)} KB, {len(d['rows'])} rows")
for (st, s), v in sorted(c.items()): print(f"  {st:10s} {s:18s} {v}")
missing = {"feedstock", "resin", "product"} - {r["stage"] for r in d["rows"]}
assert not missing, f"chain incomplete: no series tagged {missing} — cost-scissors will fail"
