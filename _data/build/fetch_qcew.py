"""Cheap fix #1: the location-quotient denominator, fetched locally.

QCEW open data publishes, per county-year: employment and establishments for every
industry INCLUDING total-all-industries (code 10), plus BLS's own location quotient.
That means PIC can compute its concentration ratio from components AND cross-check it
against the published figure — a number it owns rather than licenses.

Nothing here writes to Supabase. Production backfill is a separate, human-gated call.
"""
import csv, io, json, os, time, urllib.request, urllib.error, collections

SP = os.path.dirname(os.path.abspath(__file__))
NEO = {  # the 14 counties the studio already uses
    "39153": "Summit", "39035": "Cuyahoga", "39133": "Portage", "39151": "Stark",
    "39055": "Geauga", "39085": "Lake", "39093": "Lorain", "39103": "Medina",
    "39077": "Huron", "39099": "Mahoning", "39169": "Wayne", "39157": "Tuscarawas",
    "39139": "Richland", "39033": "Crawford",
}
AREAS = dict(NEO)
AREAS["US000"] = "United States"
AREAS["39000"] = "Ohio"

WANT = {"10": "All industries", "31-33": "Manufacturing",
        "325": "Chemical manufacturing", "3252": "Resin, synthetic rubber & fibers",
        "3255": "Paint, coating & adhesive", "326": "Plastics & rubber products",
        "3261": "Plastics products", "3262": "Rubber products"}
YEARS = list(range(2015, 2026))

from contact import UA  # noqa: E402  (one address, see contact.py)


def fetch(year, area):
    url = f"https://data.bls.gov/cew/data/api/{year}/a/area/{area}.csv"
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return None if e.code == 404 else None
    except Exception:
        return None


def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


rows, missing = [], []
for year in YEARS:
    got_any = False
    for area, name in AREAS.items():
        txt = fetch(year, area)
        if txt is None:
            missing.append((year, name))
            continue
        got_any = True
        for r in csv.DictReader(io.StringIO(txt)):
            if r["industry_code"] in WANT and r["own_code"] in ("0", "5"):
                rows.append({
                    "year": int(r["year"]), "area": area, "area_name": name,
                    "own": r["own_code"], "naics": r["industry_code"],
                    "label": WANT[r["industry_code"]],
                    "emp": num(r["annual_avg_emplvl"]),
                    "estabs": num(r["annual_avg_estabs"]),
                    "wages": num(r["total_annual_wages"]),
                    "weekly_wage": num(r["annual_avg_wkly_wage"]),
                    # BLS's own LQ, kept so our computed value can be checked against it
                    "lq_bls": num(r["lq_annual_avg_emplvl"]),
                    # 'N' = not disclosable. A suppressed cell is labeled, never zeroed.
                    "disclosure": (r["disclosure_code"] or "").strip(),
                })
        time.sleep(0.25)
    print(f"{year}: {'ok' if got_any else 'NOT PUBLISHED'} — {len(rows)} rows so far", flush=True)

out = os.path.join(SP, "qcew.json")
json.dump(rows, open(out, "w", encoding="utf-8"), separators=(",", ":"))
print("\nwrote", out, round(os.path.getsize(out) / 1024), "KB,", len(rows), "rows")
yrs = sorted({r["year"] for r in rows})
print("years:", yrs[0], "→", yrs[-1])
print("areas:", len({r["area"] for r in rows}), "| suppressed cells:",
      sum(1 for r in rows if r["disclosure"] == "N"))
if missing:
    agg = collections.Counter(y for y, _ in missing)
    print("not published:", dict(agg))
