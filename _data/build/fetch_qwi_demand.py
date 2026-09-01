"""The demand term. Is the polymer talent shortage visible in the price of labor?

WHY THIS EXISTS. The register's strongest candidate — "the region has a large engineering
workforce and a collapsed polymer on-ramp, so the binding constraint is conversion, not
supply" — was ruled unbuildable by both council families for one reason: **no candidate
carried a demand term.** A binding-constraint claim with only supply evidence is not
testable. If employers were competing for scarce polymer workers, the price of those workers
would move; if it has not moved, the constraint is not binding and the ask is misdirected.

THE TEST, AND WHAT WOULD KILL IT
  Real earnings in polymer manufacturing (NAICS 326) across PIC-12, against real earnings
  across ALL industries in the same twelve counties, same quarters, same instrument. A
  shortage predicts polymer pulling AWAY. Flat or converging kills the shortage reading.

SAME INSTRUMENT ON BOTH SIDES. The benchmark is the identical QWI series with `industry=00`
instead of `326` — one parameter. Comparing QWI polymer earnings against, say, an OEWS
occupational wage would compare two different definitions of "pay" with different universes
and different reference periods, which is the substitution this project's register was
red-teamed for.

CONSTANT DOLLARS. EarnBeg is nominal. A nominal series rising over thirteen years says
nothing at all, so both sides are deflated by CPI-U to the latest quarter before anything
is compared, and the nominal series is kept so the adjustment reconciles.

  python fetch_qwi_demand.py
"""
import json, os, time, urllib.request
from footprints import PIC12, META

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
YEARS = list(range(2012, 2026))
INDUSTRIES = {"326": "Plastics and rubber products manufacturing",
              "00": "All industries"}


def keys():
    """The master .env at the user's home. Names only ever printed, never values."""
    env = {}
    for p in (os.path.expanduser("~/.env"), os.path.join(HERE, "..", "..", "..", ".env")):
        if os.path.exists(p):
            for line in open(p, encoding="utf-8", errors="ignore"):
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.split("=", 1)
                    env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env


KEYS = keys()
CK = KEYS.get("CENSUS_API_KEY")
if not CK:
    raise SystemExit("no CENSUS_API_KEY in the environment — this fetch needs the same key "
                     "fetch_footprint.py uses.")

counties = [c[2:] for c in PIC12]
out = {}
for ind, label in INDUSTRIES.items():
    got = []
    for year in YEARS:
        for q in (1, 2, 3, 4):
            url = ("https://api.census.gov/data/timeseries/qwi/sa?get=Emp,EarnBeg"
                   f"&for=county:{','.join(counties)}&in=state:39&industry={ind}"
                   f"&year={year}&quarter={q}&key={CK}")
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                            timeout=90) as r:
                    d = json.loads(r.read().decode())
            except Exception:
                continue
            head, *body = d
            for row in body:
                o = dict(zip(head, row))
                try:
                    emp, earn = int(o["Emp"]), int(o["EarnBeg"])
                except (TypeError, ValueError):
                    continue
                if emp and earn:
                    got.append({"year": year, "quarter": q, "county": o["county"],
                                "emp": emp, "earn": earn})
        print(f"  industry {ind} {year}: {len(got):,} rows so far", flush=True)
    out[ind] = got

# Employment-weighted mean earnings per quarter, because a small county and a large one are
# not two equal observations of "what the region pays".
def by_quarter(rows):
    agg = {}
    for r in rows:
        k = (r["year"], r["quarter"])
        a = agg.setdefault(k, {"emp": 0, "wsum": 0})
        a["emp"] += r["emp"]
        a["wsum"] += r["earn"] * r["emp"]
    return [{"year": y, "quarter": q, "emp": v["emp"],
             "earn": round(v["wsum"] / v["emp"])}
            for (y, q), v in sorted(agg.items()) if v["emp"]]


series = {ind: by_quarter(rows) for ind, rows in out.items()}
for ind, s in series.items():
    if not s:
        raise SystemExit(f"FATAL: industry {ind} returned nothing. A missing benchmark is "
                         f"worse than no chart — the polymer series alone cannot answer "
                         f"whether its movement is specific to polymer.")

res = {"meta": {
    "source": "Census QWI (seasonally adjusted), EarnBeg, PIC-12 counties, "
              f"{YEARS[0]}Q1-{YEARS[-1]}Q4.",
    "row": "one quarter: employment-weighted mean monthly earnings across the twelve "
           "counties, for one industry cut.",
    "measure": "EarnBeg is average monthly earnings of employees who also worked for the "
               "same employer in the prior quarter — stable jobs, not new hires.",
    "benchmark": "The identical series with industry=00 (all industries) in the same "
                 "counties and quarters. One parameter differs, so the two are comparable.",
    "why": "A binding talent shortage should show in the price of labor. If polymer "
           "earnings do not pull away from the all-industry benchmark, the shortage "
           "reading is not supported and a supply-side ask is aimed at the wrong thing.",
    "nominal": "These figures are NOMINAL. derive_demand.py deflates them by CPI-U before "
               "anything is compared; a nominal series over thirteen years is not evidence.",
    "footprint": META["pic12"],
    "industries": INDUSTRIES,
    "fetched": time.strftime("%Y-%m-%d")},
    "series": series}

p = os.path.join(HERE, "qwi_demand.json")
json.dump(res, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"\nwrote {p}")
for ind, s in series.items():
    print(f"  {ind} {INDUSTRIES[ind][:38]:<38} {len(s)} quarters, "
          f"{s[0]['year']}Q{s[0]['quarter']} ${s[0]['earn']:,}/mo -> "
          f"{s[-1]['year']}Q{s[-1]['quarter']} ${s[-1]['earn']:,}/mo (nominal)")
