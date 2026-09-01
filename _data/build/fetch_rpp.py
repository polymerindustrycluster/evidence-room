"""BEA Regional Price Parities — what a dollar actually buys, by metro.

Every wage comparison PIC has ever made is nominal. A $1,200 weekly wage in Akron and a
$1,200 weekly wage in San Jose are not the same wage, and RPP is the federal government's
own answer to how much they differ. It is published as an index where the national average
is 100, so Akron at 92.9 means the same basket costs 7.1% less here.

WHAT A ROW IS
  One (metro, year, item group) price index, national average = 100. Not a cost-of-living
  ranking, not a quality-of-life measure, and not a statement about any individual's
  spending. It is a price level for a fixed national basket.

WHAT IT CANNOT DO
  RPP deflates the price of things, not the cost of a career. It says nothing about whether
  the jobs, the schools or the airport are there. A low RPP is only an advantage if the
  wage holds up, which is exactly the comparison this enables and nobody has run.
"""
import json, os, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
K = {}
for l in open(os.path.expanduser("~/.env"), encoding="utf-8", errors="ignore"):
    if "=" in l and not l.startswith("#"):
        k, v = l.split("=", 1); K[k.strip()] = v.strip().strip('"').strip("'")

LINES = {"1": "All items", "2": "Goods", "3": "Rents", "4": "Utilities", "5": "Other services"}
YEARS = "2019,2020,2021,2022,2023"
rows = []
for line, label in LINES.items():
    url = (f"https://apps.bea.gov/api/data/?UserID={K['BEA_API_KEY']}&method=GetData"
           f"&datasetname=Regional&TableName=MARPP&LineCode={line}"
           f"&GeoFIPS=MSA&Year={YEARS}&ResultFormat=JSON")
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
            d = json.loads(r.read().decode())
        res = d["BEAAPI"]["Results"]
        data = res["Data"] if isinstance(res, dict) else res[0]["Data"]
    except Exception as e:
        print(f"  line {line}: {type(e).__name__} {str(e)[:70]}", flush=True); continue
    n = 0
    for o in data:
        v = (o.get("DataValue") or "").replace(",", "")
        try: val = float(v)
        except ValueError: val = None
        rows.append({"line": line, "item": label, "area": o.get("GeoFips"),
                     "name": o.get("GeoName"), "year": int(o["TimePeriod"]), "rpp": val})
        n += 1
    print(f"  line {line} {label}: {n} rows", flush=True)
    time.sleep(0.8)

out = {"meta": {
    "source": "BEA Regional Price Parities, table MARPP",
    "row": "one (metro, year, item group) price index, US average = 100",
    "not": "Not a cost-of-living ranking and not a quality-of-life measure. RPP prices a "
           "fixed national basket in each metro. A low index means goods and rents are "
           "cheaper here, nothing more.",
    "caution": "RPP is a METRO measure. It cannot be summed to a 12-county footprint, so "
               "anything using it is a metro-level page and says so.",
    "fetched": "2026-08-15"}, "rows": rows}
p = os.path.join(HERE, "rpp.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
yrs = sorted({r["year"] for r in rows})
print(f"wrote {p} {round(os.path.getsize(p)/1024)} KB, {len(rows)} rows, "
      f"{len({r['area'] for r in rows})} metros, {yrs[0]}-{yrs[-1]}")
