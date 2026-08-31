"""Atlas step 1 of 2: institutions + coordinates. -> atlas_rows.json

The atlas maps INSTITUTIONS, never people (standing decision 2026-08-19), and in v1 it
maps the TEACHING layer only: every institution that ever filed a polymer-group program
in IPEDS (the polymer-programs-db census), plus the four institutions CONFIRMED to teach
polymer science invisibly under chemistry codes. The OpenAlex research layer is named,
not mapped: its candidate list is zero-verified and the API is metered — mapping
unverified rows would put dots on a map that no claim could defend.

Coordinates come from the IPEDS directory (same Urban Institute API, keyless). The
directory trap from the registry applies: a year's file omits institutions that closed
before it, so each unitid is tried at 2023 and then at its own last active year. A row
that still has no coordinate ships in the page's "not mapped" table rather than at a
guessed location — with one exception class: closures old enough that no directory year
carries coordinates (the field starts in 2009) get a hand city-centroid, and the row
says so in `coord_source`.

  python derive_atlas.py            (coords cached in ipeds_coords.json; delete to refetch)
  node project_atlas.mjs            (step 2: projection + basemap -> atlas/data/viz-data.json)
"""
import json
import os
import sqlite3
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DB = os.environ.get("PROGRAMS_DB") or os.path.join(
    r"C:\Users\JohnSwanson\Documents\pic-github\polymer-programs-db", "programs.sqlite")
CACHE = os.path.join(HERE, "ipeds_coords.json")
OUT = os.path.join(HERE, "atlas_rows.json")
API = "https://educationdata.urban.org/api/v1/college-university/ipeds/directory"
UA = {"User-Agent": "PIC-evidence-room/1.0 (jswanson@greaterakronchamber.org)"}

# Directory coordinates begin in 2009; institutions gone before then can never be
# looked up. City centroids, stated as such. AMI's street address is in its 990s but a
# national dot map does not need it.
HAND_COORDS = {
    200794: (41.0399, -81.5512, "hand: Akron OH city centroid — closed before the "
                                "directory carried coordinates"),
    143899: (41.8781, -87.6298, "hand: Chicago IL city centroid — pre-2009 closure"),
    381848: (42.1292, -80.0851, "hand: Erie PA city centroid — pre-2009 closure"),
    130703: (41.0534, -73.5387, "hand: Stamford CT city centroid — pre-2009 closure"),
    174659: (44.5625, -92.5338, "hand: Red Wing MN city centroid — pre-2009 closure"),
    238139: (43.0167, -88.0070, "hand: West Allis WI city centroid — pre-2009 closure"),
    238148: (44.0886, -87.6576, "hand: Manitowoc WI city centroid — pre-2009 closure"),
}

# Confirmed census-invisible institutions — the four the census README names as verified
# cases of polymer science taught under chemistry/chemical-engineering codes. Hand rows,
# hand coordinates, and the page marks them as a different thing entirely.
INVISIBLE = [
    {"name": "University of Chicago (Pritzker School of Molecular Engineering)",
     "city": "Chicago", "state": "IL", "lat": 41.7897, "lon": -87.5997},
    {"name": "Dartmouth College", "city": "Hanover", "state": "NH",
     "lat": 43.7044, "lon": -72.2887},
    {"name": "Rutgers University", "city": "Piscataway", "state": "NJ",
     "lat": 40.5008, "lon": -74.4474},
    {"name": "Brown University", "city": "Providence", "state": "RI",
     "lat": 41.8268, "lon": -71.4025},
]

cx = sqlite3.connect(DB)
cx.row_factory = sqlite3.Row

rows = [dict(r) for r in cx.execute("""
    SELECT i.unitid, i.name, i.city, i.state,
           COUNT(*)                                          AS programs,
           SUM(CASE WHEN p.status='active' THEN 1 ELSE 0 END) AS active_programs,
           SUM(p.total_awards)                               AS total_awards,
           MIN(p.first_year)                                 AS first_year,
           MAX(p.last_year)                                  AS last_year,
           GROUP_CONCAT(DISTINCT p.level)                    AS levels,
           GROUP_CONCAT(DISTINCT p.cip_title)                AS cip_titles
    FROM program p JOIN institution i USING (unitid)
    WHERE p.cip_group='polymer' AND p.source='ipeds'
    GROUP BY i.unitid ORDER BY total_awards DESC""")]

cache = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}


def coords(unitid, last_year):
    key = str(unitid)
    if key in cache:
        return cache[key]
    if unitid in HAND_COORDS:
        lat, lon, src = HAND_COORDS[unitid]
        cache[key] = {"lat": lat, "lon": lon, "url": None, "source": src}
        return cache[key]
    for year in dict.fromkeys([2023, last_year, max(2009, last_year)]):
        if year < 2009:
            continue
        try:
            with urllib.request.urlopen(urllib.request.Request(
                    f"{API}/{year}/?unitid={unitid}", headers=UA), timeout=30) as r:
                res = json.load(r).get("results") or []
        except Exception:
            res = []
        if res and res[0].get("latitude") is not None:
            # url_school is the institution's own site — the only institution-level link the
            # federal record carries. IPEDS has NO program-level URLs, so the page links the
            # institution and its federal record and says so; it does not invent a program page.
            site = (res[0].get("url_school") or "").strip()
            if site and not site.startswith("http"):
                site = "https://" + site
            cache[key] = {"lat": res[0]["latitude"], "lon": res[0]["longitude"],
                          "url": site or None, "source": f"IPEDS directory {year}"}
            return cache[key]
        time.sleep(0.12)
    cache[key] = None
    return None


mapped, unmapped = [], []
for i, r in enumerate(rows):
    c = coords(r["unitid"], r["last_year"])
    if i % 25 == 0:
        json.dump(cache, open(CACHE, "w", encoding="utf-8"))
        print(f"  {i}/{len(rows)} …")
    if c:
        r.update(lat=c["lat"], lon=c["lon"], coord_source=c["source"],
                 url=c.get("url"),
                 # Deterministic from the unitid: the federal record's own page for this
                 # institution, which lists its programs by CIP. Always constructible, never
                 # guessed; a long-closed institution may not resolve, and the page says so.
                 navigator=f"https://nces.ed.gov/collegenavigator/?id={r['unitid']}")
        mapped.append(r)
    else:
        unmapped.append(r)
json.dump(cache, open(CACHE, "w", encoding="utf-8"))

out = {
    "fetched": "2026-08-21",
    "institutions": mapped,
    "unmapped": unmapped,
    "invisible": INVISIBLE,
    "totals": {
        "ever": len(rows),
        "active": sum(1 for r in rows if r["active_programs"] > 0),
        "states": len({r["state"] for r in rows}),
        "mapped": len(mapped), "unmapped": len(unmapped),
    },
}
json.dump(out, open(OUT, "w", encoding="utf-8"), indent=1)
print(f"institutions {len(rows)} · mapped {len(mapped)} · unmapped {len(unmapped)} "
      f"· active {out['totals']['active']} · states {out['totals']['states']}")
print(f"wrote {OUT}")
