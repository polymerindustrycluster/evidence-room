"""Build the derived dataset for the PIC composability instrument prototype.

Inputs : studio/src/data/companies.json, neo14.geojson, Census CBP API
Output : chain-data.json (inlined into the prototype HTML)

!! DOES NOT RUN AS WRITTEN (checked 2026-08-15) !!
    DATA below points at C:\\Users\\JohnSwanson\\Desktop\\PIC Visualization Prototypes\\...
    which NO LONGER EXISTS -- that tree moved into this repo. OUT points at a *different
    agent session's* temp scratchpad. So `chain-data.json` (feeding `chain` and `rfq`) is
    NOT reproducible from this script, which contradicts web/README.md's claim that
    everything here rebuilds from _data/build/.

    Repair needs both paths repointed at this repo before the CBP fix below can be
    exercised. Left as-is rather than half-repaired, because guessing at the intended
    layout is how the wrong thing gets rebuilt confidently.
"""
import json, re, os, collections, urllib.request, urllib.parse, sys

DATA = r"C:\Users\JohnSwanson\Desktop\PIC Visualization Prototypes\studio\src\data"
OUT = r"C:\Users\JOHNSW~1\AppData\Local\Temp\claude\C--Users-JohnSwanson\4c63a6c4-70a2-47df-93a9-36ab016c1b60\scratchpad"

recs = json.load(open(os.path.join(DATA, "companies.json"), encoding="utf-8"))
geo = json.load(open(os.path.join(DATA, "neo14.geojson"), encoding="utf-8"))

# ---------------------------------------------------------------- chain spine
TIERS = [
    ("monomer",   "Monomer",              ["Monomers"]),
    ("polymer",   "Polymer producer",     ["Polymer Producer"]),
    ("compound",  "Additives & compounding", ["Additives", "Formulator/Compounder"]),
    ("fabricate", "Fabrication",          ["Fabricator - Injection/Compression Molding",
                                           "Fabricator - Extrusion",
                                           "Fabricator - Film/Sheet",
                                           "Fabricator - Foam",
                                           "Fabricator - Thermoforming",
                                           "Fabricator - Blow Molding",
                                           "Fabricator - Rotary Molding"]),
    ("oem",       "Finished product OEM", ["Finished Product OEM"]),
    ("recycle",   "Recycling & recovery", ["Recycler - Mechanical", "Recycler - Chemical"]),
]
ENABLERS = [
    ("machinery", "Machinery & equipment",  ["Machinery/Equipment Mfg"]),
    ("lab",       "R&D, testing & labs",    ["R&D/Testing/Lab Services"]),
    ("distrib",   "Distribution & logistics", ["Distributor", "Logistics Provider"]),
    ("eng",       "Engineering & energy",   ["Construction/Engineering Services", "Energy Provider"]),
]
ROLE_TO_TIER = {}
for key, label, roles in TIERS + ENABLERS:
    for r in roles:
        ROLE_TO_TIER[r] = key

# ------------------------------------------------------- vocabulary normalizer
# Collapse the long tail of free-text capability strings into canonical tokens.
# The raw string is always preserved on the record as evidence.
STOP = {"and", "or", "of", "for", "the", "with", "custom", "precision", "various",
        "other", "general", "misc", "miscellaneous", "services", "service"}
ALIAS = {
    "plastics": "plastic", "resins": "resin", "polymers": "polymer",
    "thermoplastics": "thermoplastic", "elastomers": "elastomer",
    "rubbers": "rubber", "composites": "composite", "adhesives": "adhesive",
    "coatings": "coating", "sealants": "sealant", "additives": "additive",
    "moldings": "molding", "moulding": "molding", "moulded": "molded",
    "molded": "molding", "extruded": "extrusion", "extruding": "extrusion",
    "compounded": "compounding", "compounds": "compound",
    "machining": "machining", "machined": "machining",
    "3-d": "3d", "three-dimensional": "3d",
    "additive manufacturing": "3d printing",
    "large format additive manufacturing (lfam)": "large format additive manufacturing",
    "lfam": "large format additive manufacturing",
    "pp": "polypropylene", "pe": "polyethylene", "hdpe": "polyethylene",
    "ldpe": "polyethylene", "ldpe/hdpe": "polyethylene",
    "pvc": "pvc", "abs": "abs", "pc": "polycarbonate", "pu": "polyurethane",
    "tpe": "thermoplastic elastomer", "tpu": "thermoplastic polyurethane",
    "tpv": "thermoplastic vulcanizate",
    "epdm": "epdm rubber", "nbr": "nitrile rubber", "sbr": "styrene butadiene rubber",
    "peek": "peek", "ptfe": "ptfe", "pet": "pet", "pom": "acetal",
}
PHRASE_ALIAS = {
    "plastic injection molding": "injection molding",
    "custom injection molding": "injection molding",
    "injection moulding": "injection molding",
    "thermoplastic injection molding": "injection molding",
    "rubber compression molding": "compression molding",
    "plastics extrusion": "extrusion",
    "plastic extrusion": "extrusion",
    "profile extrusion": "extrusion",
    "sheet extrusion": "extrusion",
    "rapid prototyping": "prototyping",
    "additive manufacturing": "3d printing",
    "cnc machining": "machining",
    "precision machining": "machining",
    "contract manufacturing": "contract manufacturing",
    "chemical recycling": "chemical recycling",
    "mechanical recycling": "mechanical recycling",
}


def norm(s):
    s = (s or "").lower().strip()
    s = re.sub(r"\([^)]*\)", " ", s)          # strip parentheticals
    s = re.sub(r"[^a-z0-9\-/ ]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    if s in PHRASE_ALIAS:
        s = PHRASE_ALIAS[s]
    if s in ALIAS:
        s = ALIAS[s]
    return s


def tokens(s):
    out = []
    for w in norm(s).replace("/", " ").split():
        w = ALIAS.get(w, w)
        if w and w not in STOP and len(w) > 1:
            out.append(w)
    return out


# --------------------------------------------------------------- CBP benchmark
NEO_FIPS = {"153": "Summit", "035": "Cuyahoga", "133": "Portage", "151": "Stark",
            "055": "Geauga", "085": "Lake", "093": "Lorain", "103": "Medina",
            "077": "Huron", "099": "Mahoning", "169": "Wayne", "157": "Tuscarawas",
            "139": "Richland", "033": "Crawford"}
KEY = ""
for line in open(r"C:\Users\JohnSwanson\.env", encoding="utf-8", errors="ignore"):
    if line.startswith("CENSUS_API_KEY="):
        KEY = line.split("=", 1)[1].strip().strip('"').strip("'")

cbp = collections.defaultdict(lambda: {"estab": 0, "emp": 0})
for naics in ("325", "326"):
    url = ("https://api.census.gov/data/2023/cbp?get=NAME,ESTAB,EMP"
           f"&for=county:*&in=state:39&NAICS2017={naics}&key={KEY}")
    rows = json.loads(urllib.request.urlopen(url, timeout=60).read().decode())
    head = rows[0]
    for r in rows[1:]:
        d = dict(zip(head, r))
        if d["county"] in NEO_FIPS:
            c = NEO_FIPS[d["county"]]
            cbp[c]["estab"] += int(d["ESTAB"])
            cbp[c]["emp"] += int(d["EMP"] or 0)
print("CBP counties:", len(cbp), "estab:", sum(v["estab"] for v in cbp.values()))

# ----------------------------------------------------------------- company set
NEO_COUNTIES = set(NEO_FIPS.values())
companies, outside_counts = [], collections.Counter()
proc_freq, mat_freq = collections.Counter(), collections.Counter()

for r in recs:
    roles = r.get("polymer_value_chain") or []
    tiers = sorted({ROLE_TO_TIER[x] for x in roles if x in ROLE_TO_TIER})
    if not r.get("in_neo14"):
        for t in tiers:
            outside_counts[t] += 1
        continue
    procs = [norm(p) for p in (r.get("processes") or [])]
    mats = [norm(m) for m in (r.get("materials") or [])]
    procs = [p for p in dict.fromkeys(procs) if p]
    mats = [m for m in dict.fromkeys(mats) if m]
    for p in procs:
        proc_freq[p] += 1
    for m in mats:
        mat_freq[m] += 1
    summary = (r.get("products_summary") or "").strip()
    blob = " ".join(tokens(" ".join(
        [r["name"]] + procs + mats + roles
        + (r.get("polymer_industry_segment") or [])
        + (r.get("sector_focus") or []) + [summary[:400]])))
    companies.append({
        "n": r["name"],
        "c": r.get("county") or "",
        "y": r.get("city") or "",
        "t": tiers,
        "r": roles,
        "p": procs[:14],
        "m": mats[:12],
        "s": summary[:220],
        "w": r.get("website") or "",
        # Pipeline states never leave the vault (chain_detag.py, 2026-08-31): the shipped
        # field is a binary member highlight, so a rebuild cannot resurrect the CRM tags.
        **({"member": True} if (r.get("membership_status") == "current") else {}),
        "rel": r.get("polymer_ecosystem_relevance") or "",
        "b": blob,
    })

# ------------------------------------------------------------------ tier rollup
tier_rows = []
for key, label, roles in TIERS:
    neo = sum(1 for c in companies if key in c["t"])
    tier_rows.append({"key": key, "label": label, "roles": roles,
                      "neo": neo, "outside": outside_counts[key]})
enabler_rows = []
for key, label, roles in ENABLERS:
    neo = sum(1 for c in companies if key in c["t"])
    enabler_rows.append({"key": key, "label": label, "roles": roles,
                         "neo": neo, "outside": outside_counts[key]})

unclassified = sum(1 for c in companies if not c["t"])

county_rows = []
for name in sorted(NEO_COUNTIES):
    known = sum(1 for c in companies if c["c"] == name)
    classified = sum(1 for c in companies if c["c"] == name and c["t"])
    county_rows.append({"county": name, "known": known, "classified": classified,
                        "cbp_estab": cbp[name]["estab"], "cbp_emp": cbp[name]["emp"]})

out = {
    "meta": {
        "neo_total": len(companies),
        "unclassified": unclassified,
        "outside_total": len(recs) - len(companies),
        "cbp_estab": sum(v["estab"] for v in cbp.values()),
        "cbp_emp": sum(v["emp"] for v in cbp.values()),
        "as_of": "14 August 2026",
        "raw_processes": len({p for r in recs for p in (r.get("processes") or [])}),
        "norm_processes": len(proc_freq),
        "raw_materials": len({m for r in recs for m in (r.get("materials") or [])}),
        "norm_materials": len(mat_freq),
    },
    "tiers": tier_rows,
    "enablers": enabler_rows,
    "counties": county_rows,
    "companies": companies,
    "top_processes": [p for p, _ in proc_freq.most_common(60)],
    "top_materials": [m for m, _ in mat_freq.most_common(60)],
    "geo": geo,
}
p = os.path.join(OUT, "chain-data.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
print("wrote", p, round(os.path.getsize(p) / 1024), "KB")
print("NEO", len(companies), "unclassified", unclassified)
print("raw proc", out["meta"]["raw_processes"], "-> norm", out["meta"]["norm_processes"])
print("raw mat ", out["meta"]["raw_materials"], "-> norm", out["meta"]["norm_materials"])
for t in tier_rows:
    print(f'  {t["label"]:26s} NEO {t["neo"]:4d}  outside {t["outside"]:4d}')
