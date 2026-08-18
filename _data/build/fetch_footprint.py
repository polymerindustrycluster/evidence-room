"""Add the two counties PIC's footprint has and ours did not.

DECISION (John, 2026-08-14): federal-data pages adopt PIC-12 so they reconcile with the
cluster-health dashboard; vault-sourced pages stay NEO-14 because that is how company
records are tagged. Every page prints which footprint it used.

  PIC-12 only  : Ashtabula (39007), Trumbull (39155)   <- fetched here
  NEO-14 only  : Crawford, Huron, Richland, Tuscarawas
  shared       : 10

Appends to qcew.json and qwi.json rather than replacing them, so both footprints stay
computable from one pull.
"""
import csv, io, json, os, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
NEW = {"39007": "Ashtabula", "39155": "Trumbull"}
WANT = {"10", "31-33", "325", "3252", "3255", "326", "3261", "3262"}
LABEL = {"10": "All industries", "31-33": "Manufacturing", "325": "Chemical manufacturing",
         "3252": "Resin, synthetic rubber & fibers", "3255": "Paint, coating & adhesive",
         "326": "Plastics & rubber products", "3261": "Plastics products",
         "3262": "Rubber products"}
KEYS = {}
for line in open(os.path.expanduser("~/.env"), encoding="utf-8", errors="ignore"):
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        KEYS[k.strip()] = v.strip().strip('"').strip("'")


def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


# ------------------------------------------------------------------- QCEW
qcew = json.load(open(os.path.join(HERE, "qcew.json"), encoding="utf-8"))
have = {(r["year"], r["area"]) for r in qcew}
added = 0
for year in range(2015, 2026):
    for area, name in NEW.items():
        if (year, area) in have:
            continue
        try:
            with urllib.request.urlopen(urllib.request.Request(
                    f"https://data.bls.gov/cew/data/api/{year}/a/area/{area}.csv",
                    headers=UA), timeout=60) as r:
                txt = r.read().decode("utf-8", "replace")
        except Exception as e:
            print(f"  QCEW {year} {name}: {type(e).__name__}"); continue
        for row in csv.DictReader(io.StringIO(txt)):
            if row["industry_code"] in WANT and row["own_code"] in ("0", "5"):
                qcew.append({
                    "year": int(row["year"]), "area": area, "area_name": name,
                    "own": row["own_code"], "naics": row["industry_code"],
                    "label": LABEL[row["industry_code"]],
                    "emp": num(row["annual_avg_emplvl"]),
                    "estabs": num(row["annual_avg_estabs"]),
                    "wages": num(row["total_annual_wages"]),
                    "weekly_wage": num(row["annual_avg_wkly_wage"]),
                    "lq_bls": num(row["lq_annual_avg_emplvl"]),
                    "disclosure": (row["disclosure_code"] or "").strip(),
                })
                added += 1
        time.sleep(0.25)
    print(f"  QCEW {year}: {added} rows so far", flush=True)
json.dump(qcew, open(os.path.join(HERE, "qcew.json"), "w", encoding="utf-8"),
          separators=(",", ":"))
print(f"qcew.json now {len(qcew)} rows ({added} added), "
      f"{len({r['area'] for r in qcew})} areas")

# -------------------------------------------------------------------- QWI
qwi = json.load(open(os.path.join(HERE, "qwi.json"), encoding="utf-8"))
rows = qwi["rows"]
have_q = {(r["year"], r["quarter"], r["county"]) for r in rows}
addq = 0
for year in range(2012, 2026):
    for q in (1, 2, 3, 4):
        need = [c[2:] for c in NEW if (year, q, c[2:]) not in have_q]
        if not need:
            continue
        url = ("https://api.census.gov/data/timeseries/qwi/sa?get=Emp,HirA,Sep,EarnBeg"
               f"&for=county:{','.join(need)}&in=state:39&industry=326"
               f"&year={year}&quarter={q}&key={KEYS['CENSUS_API_KEY']}")
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                        timeout=60) as r:
                d = json.loads(r.read().decode())
        except Exception:
            continue
        head, *body = d
        for row in body:
            o = dict(zip(head, row))
            def i(v):
                try:
                    return int(v)
                except (TypeError, ValueError):
                    return None
            rows.append({"year": year, "quarter": q, "county": o.get("county"),
                         "emp": i(o.get("Emp")), "hires": i(o.get("HirA")),
                         "seps": i(o.get("Sep")), "earnings": i(o.get("EarnBeg"))})
            addq += 1
        time.sleep(0.15)
    print(f"  QWI {year}: {addq} added", flush=True)
json.dump({"rows": rows}, open(os.path.join(HERE, "qwi.json"), "w", encoding="utf-8"),
          separators=(",", ":"))
print(f"qwi.json now {len(rows)} rows ({addq} added), "
      f"{len({r['county'] for r in rows})} counties")
