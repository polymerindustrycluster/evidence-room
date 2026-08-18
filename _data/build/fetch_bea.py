"""BEA county GDP by industry — value added, which QCEW cannot give.

The earlier attempt used SAGDP2N, a state table with a wrong suffix. The county table is
CAGDP2. Value added is a different measure from employment: a county can shed jobs and
grow output, and that divergence is the productivity story.

WHAT A ROW IS
  One (county, year, industry line) value-added figure in thousands of current dollars.
  BEA suppresses with (D); those are carried as null, never zero.
"""
import json, os, time, urllib.request
from footprints import PIC12, META
HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
K = {}
for l in open(os.path.expanduser("~/.env"), encoding="utf-8", errors="ignore"):
    if "=" in l and not l.startswith("#"):
        k, v = l.split("=", 1); K[k.strip()] = v.strip().strip('"').strip("'")

# Line codes 14 and 15 (durable / nondurable) DO NOT EXIST in CAGDP2 and were requested
# here until 2026-08-15. The loop below catches per line and continues, so the run exited
# successfully while silently returning three lines of five — and the meta string below
# went on describing a durable/nondurable resolution the data never had. Same failure class
# as a transposed CIP code. The assert after the loop is the guard.
LINES = {"1": "All industry total", "3": "Private industries",
         "13": "Manufacturing"}
GEO = ",".join(PIC12) + ",39000,00000"
rows = []
for line, label in LINES.items():
    url = (f"https://apps.bea.gov/api/data/?UserID={K['BEA_API_KEY']}&method=GetData"
           f"&datasetname=Regional&TableName=CAGDP2&LineCode={line}"
           f"&GeoFIPS={GEO}&Year=ALL&ResultFormat=JSON")
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
            d = json.loads(r.read().decode())
        res = d["BEAAPI"]["Results"]
        data = res["Data"] if isinstance(res, dict) else res[0]["Data"]
    except Exception as e:
        print(f"  line {line}: {type(e).__name__} {str(e)[:70]}", flush=True); continue
    n = 0
    for o in data:
        v = (o.get("DataValue") or "").replace(",", "")
        suppressed = v in ("(D)", "(NA)", "(NM)", "(L)", "")
        rows.append({"line": line, "label": label, "geo": o.get("GeoFips"),
                     "geo_name": o.get("GeoName"), "year": int(o["TimePeriod"]),
                     "value": None if suppressed else float(v),
                     "suppressed": suppressed, "unit": o.get("CL_UNIT", "")})
        n += 1
    print(f"  line {line} {label}: {n} rows", flush=True)
    time.sleep(0.8)

# A line code that returns nothing is a bad code, not an empty county. Fail loudly rather
# than write a file that silently describes fewer series than it claims. Same guard as
# tal-cip-codes-live in verify_claims.py.
got = {r["line"] for r in rows}
missing = set(LINES) - got
if missing:
    raise SystemExit(f"FATAL: BEA line codes returned no rows: {sorted(missing)}. "
                     f"A code that returns nothing is a bad code — check CAGDP2 before "
                     f"writing bea.json.")

out = {"meta": {"source": "BEA Regional, table CAGDP2 — GDP by county",
    "row": "one (county, year, industry line) value-added figure, thousands of current dollars",
    "footprint": META["pic12"],
    "suppression": "BEA (D) → suppressed:true, value null. Never zero.",
    "not": "Value added is not employment and not wages. A county can lose jobs and grow "
           "output; that divergence is the point of having this alongside QCEW.",
    "caution": "BEA publishes no polymer-specific line at county level. The finest cut "
               "available in CAGDP2 is line 13, TOTAL manufacturing — durable and "
               "nondurable (lines 14/15) do not exist in this table. Total manufacturing "
               "contains plastics and rubber AND chemicals AND food AND paper AND metals "
               "AND machinery, so it is context and a productivity denominator, never the "
               "cluster.",
    "fetched": "2026-08-14"}, "rows": rows}
p = os.path.join(HERE, "bea.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"wrote {p} {round(os.path.getsize(p)/1024)} KB, {len(rows)} rows, "
      f"{len({r['geo'] for r in rows})} geos, "
      f"{min((r['year'] for r in rows), default=0)}-{max((r['year'] for r in rows), default=0)}")
