"""The PIC-12 geography lookup — ZIPs and city names, built from an authoritative crosswalk.

WHY THIS EXISTS, AND WHAT IT REPLACES. An earlier `_pic12_cities.json` was derived from the
city/county pairs in `epa.json`. That was wrong in a way that reached published numbers:

  - **FRS `county_name` is unreliable.** It lists a Lisbon, Ohio facility (ZIP 44432) in
    "SANTA CLARA COUNTY". Facility rows carry whatever county string was filed.
  - A handful of facilities with out-of-region ZIPs therefore entered the map, and **their
    city names came with them** — COLUMBUS (ZIP 43229) mapped to Portage, FRANKLIN (45005)
    to Summit, SPRINGFIELD (45501) to Geauga, OAKWOOD (45873) to Cuyahoga.
  - Matching on those names then swept in every award and patent from the OTHER Ohio town of
    the same name. Measured damage: **634 spurious SBIR awards** (Columbus alone) and
    **309 of 3,147 patent applications — 9.8% of the branch-plant base.**

Blanket-excluding ambiguous names is also wrong: Clinton, Green, Newton Falls, Jefferson and
Madison are genuine PIC-12 towns. The only correct fix is an authoritative ZIP-to-county
crosswalk, which is what this builds.

SOURCE. Census 2020 ZCTA-to-county relationship file, pipe-delimited:
`www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt`.

A ZCTA CAN STRADDLE COUNTY LINES, and several here do. `AREALAND_PART` gives the land area of
each ZCTA-county piece, so each ZCTA is assigned to the county holding the LARGEST piece. A
ZCTA mostly in Portage and slightly in Stark counts once, in Portage. Assigning it to both
would double-count; assigning it to neither would drop it.

WHAT A CITY NAME IS AND IS NOT. City is a POSTAL name, not a jurisdiction — mail addressed to
"Akron" reaches several townships. City matching is offered because some sources (USPTO
inventor addresses) carry no ZIP at all, but **ZIP matching is preferred wherever a ZIP
exists**, and a name is admitted only when the majority of its ZCTAs fall inside PIC-12.
"""
import collections
import json
import os
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REL = ("https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/"
       "tab20_zcta520_county20_natl.txt")
CACHE = os.path.join(HERE, "_zcta_county.txt")
from contact import UA  # noqa: E402  (one address, see contact.py)

PIC12 = {"39007": "Ashtabula", "39035": "Cuyahoga", "39055": "Geauga", "39085": "Lake",
         "39093": "Lorain", "39099": "Mahoning", "39103": "Medina", "39133": "Portage",
         "39151": "Stark", "39153": "Summit", "39155": "Trumbull", "39169": "Wayne"}

if not os.path.exists(CACHE) or os.path.getsize(CACHE) < 1_000_000:
    print("fetching Census ZCTA-county relationship file")
    with urllib.request.urlopen(urllib.request.Request(REL, headers=UA), timeout=300) as r:
        open(CACHE, "wb").write(r.read())

best = {}                      # zcta -> (county_fips, land_area_of_that_piece)
with open(CACHE, encoding="utf-8-sig", errors="replace") as fh:
    hdr = fh.readline().rstrip("\n").split("|")
    iz, ic, ia = (hdr.index("GEOID_ZCTA5_20"), hdr.index("GEOID_COUNTY_20"),
                  hdr.index("AREALAND_PART"))
    for line in fh:
        p = line.rstrip("\n").split("|")
        if len(p) <= max(iz, ic, ia):
            continue
        z, c, a = p[iz].strip(), p[ic].strip(), p[ia].strip()
        if not z or not c:
            continue
        try:
            area = int(a or 0)
        except ValueError:
            area = 0
        # keep the county holding the LARGEST land piece of this ZCTA
        if z not in best or area > best[z][1]:
            best[z] = (c, area)

zips = {z: PIC12[c] for z, (c, _) in best.items() if c in PIC12}
if len(zips) < 150:
    raise SystemExit(f"FATAL: only {len(zips)} PIC-12 ZCTAs. Expected ~250; the crosswalk "
                     f"columns or the FIPS set is wrong.")
print(f"  PIC-12 ZCTAs: {len(zips):,} across {len(set(zips.values()))} counties")

# City names: admitted only when the MAJORITY of that name's facilities sit on PIC-12 ZIPs.
# epa.json supplies the city<->ZIP observations; the crosswalk supplies the truth about which
# ZIPs are in the footprint. Neither alone is sufficient.
cities, dropped = {}, {}
epa = os.path.join(HERE, "epa.json")
if os.path.exists(epa):
    obs = collections.defaultdict(lambda: [0, 0, collections.Counter()])
    for r in json.load(open(epa, encoding="utf-8"))["frs"]:
        city = (r.get("city") or "").strip().upper()
        z = (r.get("postal") or "").strip()[:5]
        if not city or not z.isdigit() or z == "00000":
            continue
        rec = obs[city]
        rec[1] += 1
        if z in zips:
            rec[0] += 1
            rec[2][zips[z]] += 1
    for city, (inside, total, counties) in obs.items():
        if total and inside / total >= 0.5:
            cities[city] = counties.most_common(1)[0][0]
        elif total:
            dropped[city] = f"{inside}/{total} facilities on PIC-12 ZIPs"
    print(f"  city names admitted: {len(cities):,}   rejected: {len(dropped):,}")
    for c in ("COLUMBUS", "FRANKLIN", "SPRINGFIELD", "OAKWOOD", "CLINTON", "GREEN",
              "MADISON", "JEFFERSON", "NEWTON FALLS", "TROY"):
        state = f"KEPT ({cities[c]})" if c in cities else \
                (f"REJECTED — {dropped[c]}" if c in dropped else "not observed")
        print(f"     {c:<14}{state}")

json.dump({"meta": {
    "source": "Census 2020 ZCTA-to-county relationship file; city names cross-checked "
              "against epa.json facility ZIPs",
    "zcta_straddles_counties": "assigned to the county holding the largest AREALAND_PART; "
                               "assigning to both double-counts, to neither drops it",
    "city_is_a_postal_name": "not a jurisdiction. Prefer ZIP matching wherever a ZIP exists; "
                             "city matching exists for sources like USPTO that carry none.",
    "city_rule": "admitted when >=50% of that name's observed facilities sit on PIC-12 ZIPs",
    "replaces": "_pic12_cities.json built from FRS county_name, which is unreliable — it "
                "placed an Ohio town in SANTA CLARA COUNTY and let COLUMBUS into the "
                "footprint, contaminating 9.8% of the patent base and 634 SBIR awards",
    "counties": PIC12, "n_zips": len(zips), "n_cities": len(cities)},
    "zips": zips, "cities": cities, "rejected_cities": dropped},
    open(os.path.join(HERE, "pic12_geo.json"), "w", encoding="utf-8"), indent=1)
print(f"wrote pic12_geo.json — {len(zips):,} ZIPs, {len(cities):,} city names")
