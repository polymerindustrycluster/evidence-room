"""Build the shared quantitative dataset for the rebuilt PIC prototypes.

Gate step 0: define what a row is, for each source.
  companies.json  -> one COMPANY classified in the PIC vault (785 in NEO-14)
  intake CSV      -> one 2026 APPLICATION (59)
  Census CBP      -> one ESTABLISHMENT, i.e. a plant (653 in NEO-14)
These are three different units and never share an axis.
"""
import json, csv, io, os, re, collections, statistics as st

DATA = r"C:\Users\JohnSwanson\Desktop\PIC Visualization Prototypes\studio\src\data"
INTAKE = r"C:\Users\JohnSwanson\OneDrive - Greater Akron Chamber\Documents\1-Projects\CRM-Buildout\data\pic-innovation-intake-export-2026-07-07.csv"
SP = r"C:\Users\JOHNSW~1\AppData\Local\Temp\claude\C--Users-JohnSwanson\4c63a6c4-70a2-47df-93a9-36ab016c1b60\scratchpad"

prev = json.load(open(os.path.join(SP, "chain-data.json"), encoding="utf-8"))
recs = json.load(open(os.path.join(DATA, "companies.json"), encoding="utf-8"))

# ---------------------------------------------------------------- shared spine
# PIC's own intake taxonomy. The vault's 20 value-chain roles map onto it, so
# supply (classified companies) and demand (2026 applications) share one axis.
SPINE = [
    ("feedstock",  "Raw materials & feedstock",     ["Monomers"]),
    ("producers",  "Producers & compounders",       ["Polymer Producer", "Additives",
                                                     "Formulator/Compounder"]),
    ("converters", "Converters & fabricators",      ["Fabricator - Injection/Compression Molding",
                                                     "Fabricator - Extrusion",
                                                     "Fabricator - Film/Sheet",
                                                     "Fabricator - Foam",
                                                     "Fabricator - Thermoforming",
                                                     "Fabricator - Blow Molding",
                                                     "Fabricator - Rotary Molding"]),
    ("oems",       "OEMs & end-use brands",         ["Finished Product OEM"]),
    ("recyclers",  "Recyclers & reclaimers",      ["Recycler - Mechanical",
                                                     "Recycler - Chemical"]),
    ("equipment",  "Equipment & technology",        ["Machinery/Equipment Mfg",
                                                     "R&D/Testing/Lab Services"]),
]
# Verified against the distinct atomic values in the export, not assumed. The
# recycling label is "Reclaimers", not "Reprocessors" — guessing it cost 11 rows
# and would have published a zero that was a parsing bug, not a finding.
INTAKE_KEY = {
    "raw materials & feedstock": "feedstock",
    "polymer producers & compounders": "producers",
    "converters & fabricators": "converters",
    "oems & end-use brands": "oems",
    "recyclers & reclaimers": "recyclers",
    "equipment & technology providers": "equipment",
}
ROLE_TO_STAGE = {r: k for k, _, roles in SPINE for r in roles}

# ------------------------------------------------------------------- SUPPLY
neo = [r for r in recs if r.get("in_neo14")]
supply = collections.Counter()
for r in neo:
    for stage in {ROLE_TO_STAGE[x] for x in (r.get("polymer_value_chain") or [])
                  if x in ROLE_TO_STAGE}:
        supply[stage] += 1

# ------------------------------------------------------------------- DEMAND
rows = list(csv.DictReader(io.open(INTAKE, encoding="utf-8-sig", errors="replace")))

def money(s):
    s = re.sub(r"[^0-9.]", "", s or "")
    try:
        return float(s)
    except ValueError:
        return None

def trl(s):
    m = re.search(r"\d", s or "")
    return int(m.group()) if m else None

apps = []
for r in rows:
    stages, other = [], []
    raw = (r.get("Value-chain position") or "")
    for part in [p.strip() for p in raw.split(",")]:
        if not part:
            continue
        k = INTAKE_KEY.get(part.lower())
        if k:
            if k not in stages:
                stages.append(k)
        elif part.lower().startswith("other"):
            other.append(part.split(":", 1)[-1].strip())
        else:
            other.append(part)          # never silently dropped
    apps.append({
        "trl": trl(r.get("Current TRL")), "target": trl(r.get("Target TRL")),
        "mrl": trl(r.get("Current MRL")),
        "req": money(r.get("Requested funding")), "match": money(r.get("Match amount")),
        "track": (r.get("Track") or "").strip(),
        "org": (r.get("Org type") or "").strip().split(":")[0].strip(),
        "state": (r.get("Org state") or "").strip().upper(),
        "gate0": (r.get("Gate 0") or "").strip(),
        "stages": stages, "other": other,
    })

demand = collections.Counter()
demand_dollars = collections.Counter()
for a in apps:
    for s in a["stages"]:
        demand[s] += 1
        if a["req"]:
            demand_dollars[s] += a["req"]

# ----------------------------------------------------------- money & ranking
AVAILABLE = 2_200_000
reqs = sorted([a["req"] for a in apps if a["req"]])
total_req = sum(reqs)
total_match = sum(a["match"] for a in apps if a["match"])

# Cumulative curve: applications sorted cheapest-first, how far does the money go?
cum, running = [], 0.0
for i, v in enumerate(reqs, 1):
    running += v
    cum.append({"n": i, "amount": v, "cum": running})
reach_cheapest = sum(1 for c in cum if c["cum"] <= AVAILABLE)

# and largest-first, the other honest ordering
cum_desc, running = [], 0.0
for i, v in enumerate(sorted(reqs, reverse=True), 1):
    running += v
    cum_desc.append({"n": i, "amount": v, "cum": running})
reach_largest = sum(1 for c in cum_desc if c["cum"] <= AVAILABLE)

# ------------------------------------------------------------------ TRL data
trl_hist = collections.Counter(a["trl"] for a in apps if a["trl"])
target_hist = collections.Counter(a["target"] for a in apps if a["target"])
in_band = sum(1 for a in apps if a["trl"] and 3 <= a["trl"] <= 5)
jumps = [{"from": a["trl"], "to": a["target"], "req": a["req"], "track": a["track"],
          "org": a["org"]}
         for a in apps if a["trl"] and a["target"]]
req_by_trl = collections.defaultdict(list)
for a in apps:
    if a["trl"] and a["req"]:
        req_by_trl[a["trl"]].append(a["req"])

# 2025 white-paper TRLs, self-reported, quoted verbatim (kept separate: different year,
# different instrument — never pooled with the 2026 form data).
# Unfunded 2025 proposals are never named (chain_detag.py, 2026-08-31): naming an
# unsuccessful applicant is not something a funder gets to do.
WP2025 = [
    {"id": "P25.10", "name": "CWRU (Wnek)", "lo": 4, "hi": 5, "funded": True},
    {"id": "P25.11", "name": "Promerus + Los Alamos", "lo": 4, "hi": 4.6, "funded": True},
    {"id": "P25.12", "name": "UA (Eagan)", "lo": 3, "hi": 4, "tlo": 5, "thi": 6, "funded": True},
    {"id": "P25.15", "name": "Peak Nano + CWRU", "lo": 3, "hi": 3, "tlo": 6, "thi": 6, "funded": True},
    {"id": "P25.18", "name": "Synthomer + NPIC", "lo": 4, "hi": 4, "funded": True},
    {"id": "SY-AUX", "name": "Aeris Biosciences", "lo": 5, "hi": 5, "tlo": 7, "thi": 8, "funded": True},
    {"id": "SY-PKIN", "name": "PolyKinetix", "lo": 3, "hi": 5, "tlo": 8, "thi": 8, "funded": True},
    {"id": "P25.01", "name": "Unfunded proposal", "lo": 3, "hi": 3, "tlo": 4, "thi": 4, "funded": False},
    {"id": "P25.13", "name": "Unfunded proposal", "lo": 3, "hi": 4, "funded": False},
    {"id": "P25.14", "name": "Unfunded proposal", "lo": 1, "hi": 3, "funded": False},
    {"id": "P25.17", "name": "Unfunded proposal", "lo": 4, "hi": 4, "funded": False},
]

out = {
    "spine": [{"key": k, "label": l, "supply": supply[k], "demand": demand[k],
               "demand_usd": round(demand_dollars[k])} for k, l, _ in SPINE],
    "supply_meta": {
        "neo_total": len(neo),
        "unclassified": sum(1 for r in neo if not r.get("polymer_value_chain")),
        "cbp_estab": prev["meta"]["cbp_estab"], "cbp_emp": prev["meta"]["cbp_emp"],
    },
    "intake": {
        "n": len(apps), "available": AVAILABLE,
        "total_req": round(total_req), "total_match": round(total_match),
        "median": round(st.median(reqs)), "mean": round(st.mean(reqs)),
        "min": round(reqs[0]), "max": round(reqs[-1]),
        "fund_rate": total_req and AVAILABLE / total_req,
        "cum": cum, "cum_desc": cum_desc,
        "reach_cheapest": reach_cheapest, "reach_largest": reach_largest,
        "trl_hist": {str(k): v for k, v in sorted(trl_hist.items())},
        "target_hist": {str(k): v for k, v in sorted(target_hist.items())},
        "in_band": in_band, "jumps": jumps,
        "req_by_trl": {str(k): sorted(v) for k, v in sorted(req_by_trl.items())},
        "track": dict(collections.Counter(a["track"] for a in apps)),
        "org": dict(collections.Counter(a["org"] for a in apps)),
        "ohio": sum(1 for a in apps if a["state"] == "OH"),
        "gate_pass": sum(1 for a in apps if a["gate0"].lower() == "pass"),
        "gate_other": sum(1 for a in apps if a["gate0"].lower() != "pass"),
        "other_positions": sum(1 for a in apps if a["other"]),
        "no_stage": sum(1 for a in apps if not a["stages"]),
    },
    "wp2025": WP2025,
    "counties": prev["counties"],
}
p = os.path.join(SP, "viz-data.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print("wrote", p, round(os.path.getsize(p) / 1024, 1), "KB")
print()
print(f'{"STAGE":30s} {"SUPPLY":>7s} {"DEMAND":>7s} {"DEMAND $":>12s}')
for k, l, _ in SPINE:
    print(f'{l:30s} {supply[k]:7d} {demand[k]:7d} {demand_dollars[k]:12,.0f}')
print()
print(f"requested  ${total_req:,.0f}   match ${total_match:,.0f}   available ${AVAILABLE:,.0f}")
print(f"fund rate  {AVAILABLE/total_req*100:.1f}%")
print(f"money reaches {reach_cheapest} of {len(reqs)} apps cheapest-first, "
      f"{reach_largest} largest-first")
print(f"TRL 3-5: {in_band} of {len(apps)} = {in_band/len(apps)*100:.0f}%")
print("rows with an Other position:", sum(1 for a in apps if a["other"]),
      "| rows with no mapped stage:", sum(1 for a in apps if not a["stages"]))
