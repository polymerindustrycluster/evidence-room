"""Fetch the remaining cluster-vitals sources straight from origin.

Deliberately NOT read from the production Supabase: sourcing from origin keeps these
prototypes reproducible by anyone with the same free keys, and keeps them from coupling
to a governed production table. Nothing here writes anywhere but this folder.

Each source is independent — a failure writes a stub and the others continue.
"""
import json, os, sys, time, urllib.request, urllib.parse, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)

KEYS = {}
for line in open(os.path.expanduser("~/.env"), encoding="utf-8", errors="ignore"):
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        KEYS[k.strip()] = v.strip().strip('"').strip("'")


def get(url, timeout=90):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def save(name, obj, note=""):
    p = os.path.join(HERE, f"{name}.json")
    json.dump(obj, open(p, "w", encoding="utf-8"), separators=(",", ":"))
    n = len(obj.get("rows", obj if isinstance(obj, list) else []))
    print(f"  saved {name}.json  {round(os.path.getsize(p)/1024)} KB  {n} rows  {note}", flush=True)


# --------------------------------------------------------------- FRED + ALFRED
def fred():
    key = KEYS["FRED_API_KEY"]
    series = {
        "WPU072": "PPI: rubber and plastic products",
        "WPU06": "PPI: industrial chemicals",
        "PCU326326": "PPI: plastics and rubber products manufacturing",
    }
    rows, vintages = [], []
    for sid, label in series.items():
        try:
            d = get(f"https://api.stlouisfed.org/fred/series/observations?series_id={sid}"
                    f"&api_key={key}&file_type=json&observation_start=2005-01-01")
            for o in d.get("observations", []):
                if o["value"] not in (".", ""):
                    rows.append({"series": sid, "label": label, "date": o["date"],
                                 "value": float(o["value"])})
        except Exception as e:
            print(f"  FRED {sid} current failed: {e}", flush=True)
        # ALFRED: every vintage of every observation — this is the revisions dataset
        try:
            d = get(f"https://api.stlouisfed.org/fred/series/observations?series_id={sid}"
                    f"&api_key={key}&file_type=json&observation_start=2019-01-01"
                    f"&realtime_start=2019-01-01&realtime_end=9999-12-31")
            for o in d.get("observations", []):
                if o["value"] not in (".", ""):
                    vintages.append({"series": sid, "label": label, "date": o["date"],
                                     "value": float(o["value"]),
                                     "vintage_start": o["realtime_start"],
                                     "vintage_end": o["realtime_end"]})
        except Exception as e:
            print(f"  FRED {sid} vintages failed: {e}", flush=True)
        time.sleep(0.4)
    save("fred", {"rows": rows}, f"{len({r['series'] for r in rows})} series")
    save("fred_vintages", {"rows": vintages},
         f"{len(vintages)} vintage rows over {len({v['date'] for v in vintages})} periods")


# ------------------------------------------------------------------------ EIA
def eia():
    key = KEYS["EIA_API_KEY"]
    targets = [
        ("natural-gas/pri/fut/data", {"facets[series][]": "RNGWHHD"},
         "Henry Hub natural gas spot", "usd_per_mcf"),
        ("electricity/retail-sales/data", {"facets[stateid][]": "OH",
         "facets[sectorid][]": "IND", "data[0]": "price"},
         "Ohio industrial electricity price", "cents_per_kwh"),
    ]
    rows = []
    for route, facets, label, unit in targets:
        q = {"api_key": key, "frequency": "monthly", "start": "2005-01",
             "sort[0][column]": "period", "sort[0][direction]": "asc", "length": "5000"}
        q.setdefault("data[0]", "value")
        q.update(facets)
        try:
            d = get(f"https://api.eia.gov/v2/{route}/?" + urllib.parse.urlencode(q, doseq=True))
            for o in d.get("response", {}).get("data", []):
                v = o.get("value", o.get("price"))
                if v is None:
                    continue
                rows.append({"label": label, "unit": unit, "date": o["period"] + "-01",
                             "value": float(v)})
        except Exception as e:
            print(f"  EIA {label} failed: {e}", flush=True)
        time.sleep(0.4)
    # A series that returned nothing is a bad request, not an empty world. Without this the
    # run exits 0 having written half a dataset, and the printed count scrolls past.
    got = {r["label"] for r in rows}
    missing = {t[2] for t in targets} - got
    if missing:
        raise SystemExit(f"FATAL: EIA series returned no rows: {sorted(missing)}. "
                         f"Check the route and facets before writing eia.json.")
    save("eia", {"rows": rows}, f"{len(got)} series")


# ------------------------------------------------------------------------ BEA
def bea():
    key = KEYS["BEA_API_KEY"]
    rows = []
    # SAGDP2N: real GDP by state by industry. LineCode 32 = chemical mfg, 33 = plastics/rubber
    for line, label in (("32", "Chemical manufacturing"),
                        ("33", "Plastics and rubber products manufacturing"),
                        ("11", "Manufacturing")):
        try:
            d = get(f"https://apps.bea.gov/api/data/?UserID={key}&method=GetData"
                    f"&datasetname=Regional&TableName=SAGDP2N&LineCode={line}"
                    f"&GeoFIPS=39000&Year=ALL&ResultFormat=JSON")
            for o in d["BEAAPI"]["Results"].get("Data", []):
                v = (o.get("DataValue") or "").replace(",", "")
                if v and v not in ("(D)", "(NA)", "(NM)"):
                    rows.append({"line": line, "label": label, "year": int(o["TimePeriod"]),
                                 "value": float(v), "unit": o.get("CL_UNIT", "")})
        except Exception as e:
            print(f"  BEA line {line} failed: {e}", flush=True)
        time.sleep(0.6)
    save("bea", {"rows": rows}, f"{len({r['label'] for r in rows})} series")


# ---------------------------------------------------------------- Census QWI
def qwi():
    key = KEYS["CENSUS_API_KEY"]
    NEO = ["153", "035", "133", "151", "055", "085", "093", "103",
           "077", "099", "169", "157", "139", "033"]
    rows = []
    for year in range(2012, 2026):
        for q in (1, 2, 3, 4):
            url = ("https://api.census.gov/data/timeseries/qwi/sa?get=Emp,HirA,Sep,EarnBeg"
                   f"&for=county:{','.join(NEO)}&in=state:39&industry=326"
                   f"&year={year}&quarter={q}&key={key}")
            try:
                d = get(url, timeout=60)
            except urllib.error.HTTPError as e:
                if e.code in (204, 404):
                    continue
                print(f"  QWI {year}Q{q}: HTTP {e.code}", flush=True); continue
            except Exception as e:
                print(f"  QWI {year}Q{q}: {e}", flush=True); continue
            head, *body = d
            for r in body:
                o = dict(zip(head, r))
                rows.append({
                    "year": year, "quarter": q, "county": o.get("county"),
                    "emp": _i(o.get("Emp")), "hires": _i(o.get("HirA")),
                    "seps": _i(o.get("Sep")), "earnings": _i(o.get("EarnBeg")),
                })
            time.sleep(0.2)
        print(f"  QWI {year}: {len(rows)} rows", flush=True)
    save("qwi", {"rows": rows}, f"{len({(r['year'],r['quarter']) for r in rows})} quarters")


def _i(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


# ------------------------------------------------------------- USAspending
def usaspending():
    """Federal obligations landing in the PIC-12 counties, broken out by NAICS.

    The naics_codes filter is what 422'd earlier; the working shape is to ask for the
    NAICS *category* over a county place-of-performance list and filter client-side.

    Place of performance is a REPORTED FIELD on the award, not an observation of where
    work happened. A prime recipient in one county performing work in another, or a
    centrally administered contract, puts the code somewhere other than the activity.

    FOOTPRINT (corrected 2026-08-15): this pulled NEO-14 while the decided rule in
    footprints.py assigns FEDERAL sources to PIC-12. It was the one federal page on the
    wrong footprint — it included Crawford, Huron, Richland and Tuscarawas and OMITTED
    Ashtabula and Trumbull, so federal.json could not reconcile with the cluster-health
    dashboard. Now imports the single definition rather than restating a list.
    """
    from footprints import PIC12
    NEO = {c[2:]: n for c, n in PIC12.items()}
    rows = []
    for fy in range(2019, 2027):
        for cat in ("naics", "county"):
            payload = {
                "filters": {
                    "time_period": [{"start_date": f"{fy-1}-10-01", "end_date": f"{fy}-09-30"}],
                    "place_of_performance_locations": [
                        {"country": "USA", "state": "OH", "county": c} for c in NEO],
                },
                "limit": 100,
            }
            try:
                req = urllib.request.Request(
                    f"https://api.usaspending.gov/api/v2/search/spending_by_category/{cat}/",
                    data=json.dumps(payload).encode(),
                    headers={**UA, "Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=120) as r:
                    d = json.loads(r.read().decode())
                for o in d.get("results", []):
                    code = str(o.get("code") or "")
                    if cat == "naics" and not (code.startswith("325") or code.startswith("326")):
                        continue
                    rows.append({"fy": fy, "kind": cat, "code": code,
                                 "name": o.get("name"), "amount": o.get("amount")})
            except Exception as e:
                print(f"  USAspending FY{fy} {cat} failed: {e}", flush=True)
            time.sleep(0.8)
        print(f"  USAspending FY{fy}: {sum(1 for r in rows if r['fy']==fy)} rows", flush=True)
    save("usaspending", {"rows": rows}, f"{len({r['fy'] for r in rows})} fiscal years")


JOBS = {"fred": fred, "eia": eia, "bea": bea, "qwi": qwi, "usaspending": usaspending}
want = sys.argv[1:] or list(JOBS)
for name in want:
    print(f"--- {name} ---", flush=True)
    try:
        JOBS[name]()
    except Exception as e:
        print(f"  {name} ABORTED: {type(e).__name__}: {e}", flush=True)
print("done")
