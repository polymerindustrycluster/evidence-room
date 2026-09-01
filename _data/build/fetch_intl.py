"""Did the rest of the country keep its international polymer students, or lose them too?

THE QUESTION THIS SETTLES. The talent page now shows that nationally the two degree codes
this region confers ended 2023 slightly above their 2012 level while PIC-12 ended a third
below, and separately that the region's DOMESTIC conferrals were flat throughout — 27 in
2012, 30 in 2023. Everything that moved here was international.

Two explanations fit that, and they lead to opposite conclusions:

  EXPOSURE     the region's programmes were disproportionately international, so a national
               shift in international enrolment hit here harder. Nothing about the region's
               teaching changed. Nobody's failure.
  PERFORMANCE  international students kept going to polymer programmes elsewhere and stopped
               coming here. That is a regional question with a regional answer.

The discriminating test is the OTHER institutions: if the rest of the field held its
international share while this region's collapsed, the regional reading survives. If
everyone's fell, the region was simply more exposed to a national shift.

METHOD. IPEDS reports nonresident-alien status in the same field as race, so a degree
conferred to a student on a visa is countable. This pulls CIP 143201 nationally, per
institution, with the race dimension broken out and sex=99 so the partitions do not cross —
the same constraint fetch_ipeds.py documents. race=99 is the total row; race=8 is
nonresident. Never sum them.

WHAT IT CANNOT SAY. Nonresident-alien status is a visa category, not a country of origin,
and a degree conferred is not a person who left. Small programmes swing hard on single
students, so shares are reported with the counts behind them.

  python fetch_intl.py
"""
import json, os, time, urllib.request, collections

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
API = "https://educationdata.urban.org/api/v1/college-university/ipeds/completions-cip-6"
YEARS = list(range(2012, 2024))
CIP = "143201"                       # polymer/plastics engineering — the shared field
NEO = {200800: "University of Akron", 201645: "Case Western Reserve University"}
NONRESIDENT = 8                      # pinned empirically in fetch_ipeds.py; see RACE there


def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                        timeout=180) as r:
                return json.load(r)
        except Exception as e:
            if i == tries - 1:
                print(f"    FAILED {url[:110]}: {e}")
                return None
            time.sleep(2 + 3 * i)


tot = collections.defaultdict(int)      # (unitid, year) -> all awards
intl = collections.defaultdict(int)     # (unitid, year) -> nonresident awards
names = {}

for year in YEARS:
    url = f"{API}/{year}/?cipcode_6digit={CIP}&majornum=1&sex=99"
    n = 0
    while url:
        d = get(url)
        if not d:
            break
        for r in d.get("results", []):
            aw = r.get("awards_6digit") or 0
            if not aw:
                continue
            u, race = r["unitid"], r.get("race")
            if race == 99:
                tot[(u, year)] += aw
                n += aw
            elif race == NONRESIDENT:
                intl[(u, year)] += aw
        url = d.get("next")
    print(f"  {year}: {n:,} awards across {len({u for (u, y) in tot if y == year})} "
          f"institutions", flush=True)

if not tot:
    raise SystemExit("FATAL: no national rows for CIP " + CIP)

# Institutions are grouped ONCE, by whether they are the region's, and never re-cut after
# the numbers are seen.
def agg(keep):
    out = []
    for y in YEARS:
        t = sum(v for (u, yy), v in tot.items() if yy == y and keep(u))
        i = sum(v for (u, yy), v in intl.items() if yy == y and keep(u))
        out.append({"year": y, "awards": t, "intl": i,
                    "share": round(i / t, 4) if t else None})
    return out


neo = agg(lambda u: u in NEO)
rest = agg(lambda u: u not in NEO)
insts = sorted({u for (u, y) in tot})

# per institution, so a reader can see whether "the rest" is one big programme or many
per = []
for u in insts:
    t = sum(v for (uu, y), v in tot.items() if uu == u)
    i = sum(v for (uu, y), v in intl.items() if uu == u)
    per.append({"unitid": u, "neo": u in NEO, "awards": t, "intl": i,
                "share": round(i / t, 4) if t else None})
per.sort(key=lambda r: -r["awards"])

first_ok = [r for r in neo if r["share"] is not None][:3]
last_ok = [r for r in neo if r["share"] is not None][-3:]
rf = [r for r in rest if r["share"] is not None][:3]
rl = [r for r in rest if r["share"] is not None][-3:]
avg = lambda rs: sum(r["share"] for r in rs) / len(rs)

out = {"meta": {
    "source": f"IPEDS completions via the Urban Institute API, CIP {CIP}, national, "
              f"{YEARS[0]}-{YEARS[-1]}, majornum=1, sex=99 with the race dimension broken "
              "out. race=99 is the total row; race=8 is nonresident alien.",
    "row": "one (institution, year): degrees conferred, and how many went to students on "
           "visas.",
    "question": "Did international students keep going to polymer engineering programmes "
                "elsewhere while this region's left? If the rest of the field held its "
                "international share and PIC-12's collapsed, the gap is regional. If "
                "everyone's fell, the region was simply more exposed.",
    "groups": "Two groups fixed before the numbers were seen: the region's two institutions, "
              "and every other institution in the country conferring this code.",
    "not": "Nonresident alien is a visa category, not a country of origin, and a degree "
           "conferred is not a person who stayed or left. Small programmes swing hard on "
           "single students, so every share is published with its counts.",
    "cip": CIP, "neo": list(NEO.values()),
    "years": YEARS, "fetched": time.strftime("%Y-%m-%d")},
    "totals": {"institutions": len(insts),
               "neo_start": round(avg(first_ok), 4), "neo_end": round(avg(last_ok), 4),
               "rest_start": round(avg(rf), 4), "rest_end": round(avg(rl), 4)},
    "neo": neo, "rest": rest, "per_institution": per}

p = os.path.join(HERE, "intl.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
t = out["totals"]
print(f"\nwrote {p} — {t['institutions']} institutions nationally confer CIP {CIP}")
print(f"  PIC-12 two:  international share {t['neo_start']:.1%} -> {t['neo_end']:.1%}")
print(f"  other {t['institutions']-2}:   international share {t['rest_start']:.1%} -> "
      f"{t['rest_end']:.1%}")
