"""Nominal polymer wages against what they actually buy.

Every wage comparison in PIC's material is nominal, which quietly assumes a dollar is a
dollar everywhere. It is not. BEA publishes Regional Price Parities — a price index per
metro, US average 100 — so a weekly wage can be restated in constant purchasing power and
the two rankings compared.

THE JOIN
  QCEW metro wages (NAICS 326, private, annual average weekly wage) ÷ that metro's RPP/100.
  Both are metro-level, both are 2023, and no county sums are involved — this page is a
  metro page from end to end and never touches the PIC-12 footprint.

WHAT THIS IS NOT
  Not a cost-of-living ranking and not a claim that Akron is a better place to live. It
  answers exactly one question: after adjusting for local prices, how does a polymer
  paycheque here compare with the same job elsewhere. Suppressed metros are absent, not
  zero, so every rank is among the disclosed.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
YEAR = 2023
NAICS = "326"
HOME = {"10420": "Akron", "17410": "Cleveland", "15940": "Canton"}

P = json.load(open(os.path.join(HERE, "peers.json"), encoding="utf-8"))
R = json.load(open(os.path.join(HERE, "rpp.json"), encoding="utf-8"))

rpp = {r["area"]: r["rpp"] for r in R["rows"]
       if r["line"] == "1" and r["year"] == YEAR and r["rpp"]}
rent = {r["area"]: r["rpp"] for r in R["rows"]
        if r["line"] == "3" and r["year"] == YEAR and r["rpp"]}
name = {r["area"]: r["name"] for r in R["rows"] if r["line"] == "1"}

# QCEW codes a metro as "C" + the CBSA code with its trailing zero dropped: Akron is CBSA
# 10420, which QCEW writes C1042 and BEA writes 10420. The join is that reconstruction, and
# it is checked rather than trusted — see the assertion on the hit rate below.
def to_cbsa(qcew_area):
    return qcew_area[1:] + "0" if qcew_area.startswith("C") else None

rows, misses = [], 0
for w in P["rows"]:
    if w["kind"] != "metro" or w["naics"] != NAICS or w["year"] != YEAR: continue
    if w.get("suppressed") or not w.get("wage") or not w.get("emp"): continue
    a = to_cbsa(w["area"])
    if a is None: continue
    if a not in rpp:                               # RPP covers metros QCEW may not, and back
        misses += 1
        continue
    nom = w["wage"]
    rows.append({"area": a, "qcew": w["area"], "name": name.get(a, a),
                 "emp": w["emp"], "estabs": w["estabs"],
                 "nominal": nom, "rpp": rpp[a], "rent": rent.get(a),
                 "real": round(nom / (rpp[a] / 100), 1),
                 "home": a in HOME})

hit = len(rows) / (len(rows) + misses) if (rows or misses) else 0
print(f"join: {len(rows)} matched, {misses} unmatched — {hit:.1%} hit rate")
assert len(rows) > 100 and hit > 0.5, (
    f"metro join is broken ({len(rows)} rows, {hit:.1%}). QCEW writes C+CBSA[:4]; BEA "
    f"writes the full CBSA. A zero or tiny join here must fail the build, not publish an "
    f"empty page — this is the same failure mode as a dead CIP code.")

by_nom = sorted(rows, key=lambda r: -r["nominal"])
by_real = sorted(rows, key=lambda r: -r["real"])
for i, r in enumerate(by_nom): r["rank_nominal"] = i + 1
for i, r in enumerate(by_real): r["rank_real"] = i + 1
for r in rows: r["climb"] = r["rank_nominal"] - r["rank_real"]

# The comparison set that matters: metros with a real polymer presence, so the ranking is
# against places that actually do this work rather than against every metro in the country.
BIG = sorted([r for r in rows if r["emp"] >= 2000], key=lambda r: -r["emp"])
for i, r in enumerate(sorted(BIG, key=lambda x: -x["nominal"])): r["big_rank_nominal"] = i + 1
for i, r in enumerate(sorted(BIG, key=lambda x: -x["real"])): r["big_rank_real"] = i + 1
for r in BIG: r["big_climb"] = r["big_rank_nominal"] - r["big_rank_real"]

homes = [r for r in rows if r["home"]]
out = {"meta": {
    "source": f"BLS QCEW {YEAR} NAICS {NAICS} private metro average weekly wage; "
              f"BEA Regional Price Parities {YEAR} (MARPP, all items)",
    # A full sentence, because this string is published verbatim under the methodology
    # box's "What one row is" heading and in the slope table note, where a bare
    # lowercase fragment read as a broken sentence in both places.
    "row": "One row is one metro: its nominal average weekly wage, its price level, and "
           "that wage restated in national-average purchasing power.",
    # Reader prose, not a register token: this string is published verbatim in the
    # methodology box, where a bare all-caps "METRO." read as a broken sentence.
    "geography": "Metro, not county: this page never uses the PIC-12 county footprint. "
                 "Price parities are published for metropolitan areas only and cannot "
                 "be summed to a county footprint.",
    # "RPP" is a register token the page never introduces to a reader, and this string
    # is published in figure chrome. Say what the index does in reader words instead.
    "not": "Not a cost-of-living ranking and not a quality-of-life claim. The price "
           "level compares one fixed national basket across metros; it says nothing "
           "about the jobs, schools or airports.",
    "suppression": "Metros where QCEW withholds NAICS 326 wages are absent, not zero. "
                   "Every rank is among the disclosed.",
    "year": YEAR, "n_metros": len(rows), "n_big": len(BIG), "big_floor": 2000},
  "metros": rows, "big": BIG,
  "home": sorted(homes, key=lambda r: -r["emp"])}
p = os.path.join(WEB, "realwage", "data", "realwage.json")
os.makedirs(os.path.dirname(p), exist_ok=True)
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"wrote {p} {round(os.path.getsize(p)/1024)} KB — {len(rows)} metros, {len(BIG)} with 2k+ jobs")
for r in homes:
    print(f"  {r['name'][:34]:36s} nominal ${r['nominal']:.0f} rank {r['rank_nominal']:3d}  "
          f"RPP {r['rpp']:.1f}  real ${r['real']:.0f} rank {r['rank_real']:3d}  "
          f"climb {r['climb']:+d}")
print("\n  top 5 real, among metros with 2,000+ polymer jobs:")
for r in sorted(BIG, key=lambda x: -x["real"])[:5]:
    print(f"    ${r['real']:.0f}  {r['name'][:40]:42s} (nominal ${r['nominal']:.0f}, RPP {r['rpp']:.1f})")
