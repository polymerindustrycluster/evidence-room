"""Recompute the chain page's geography from explicit, offline inputs.

The company filter and Census context use the fourteen counties in the held
extract's CODEBOOK (2026-08-14). A company record qualifies when its county is
in that set and its state is Ohio, OH or blank. Records that fail this rule
remain disclosed by name and reason; their absence does not establish that
regional operations are absent.

This is a scoped repair of previously published rows, not a complete catalogue
builder. Retained public fields are preserved. Identity, classification and
normalized process/material fields are checked against the held SQLite extract;
company descriptions remain unaudited. Newly qualifying records require a full
source reconciliation rather than invented public fields.

Census CBP counts establishments in chemicals and plastics-and-rubber products.
The register counts company records across a broader set of roles. Their
quotient cannot measure coverage, even with a common county boundary.

Inputs are a read-only SQLite extract and cached CBP 2023 responses for Ohio,
NAICS 325 and 326, with cbp-receipts.json recording filenames, bytes and SHA256.
No network access or credentials are used. Legacy build_chain.py/build_viz.py
are not imported because they execute source loading at import time.

Usage:
  python _data/build/repair_chain.py --source <pic.sqlite> --cbp-dir <dir> --dry-run
  python _data/build/repair_chain.py --source <pic.sqlite> --cbp-dir <dir> \
      --chain <chain-data.json> --viz <viz-data.json>
"""
import argparse
import collections
import hashlib
import json
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CHAIN = os.path.join(ROOT, "chain", "data", "chain-data.json")
VIZ = os.path.join(ROOT, "chain", "data", "viz-data.json")

# ---------------------------------------------------------------- geography
# ONE definition, from CODEBOOK.md 2026-08-14, "NEO-14 counties". Ohio FIPS 39xxx.
# The company filter, Census context, county table and map use the same set.
NEO14 = {
    "007": "Ashtabula",  "029": "Columbiana", "035": "Cuyahoga",  "055": "Geauga",
    "085": "Lake",       "093": "Lorain",     "099": "Mahoning",  "103": "Medina",
    "133": "Portage",    "151": "Stark",      "153": "Summit",    "155": "Trumbull",
    "157": "Tuscarawas", "169": "Wayne",
}
OHIO_STATES = {"ohio", "oh", ""}

# ------------------------------------------------------------- role mapping
# Identical to build_chain.py's TIERS/ENABLERS and build_viz.py's SPINE. Copied
# rather than imported: both producers run network and .env code at import time.
TIERS = [
    ("monomer",   "Monomer",                 ["Monomers"]),
    ("polymer",   "Polymer producer",        ["Polymer Producer"]),
    ("compound",  "Additives & compounding", ["Additives", "Formulator/Compounder"]),
    ("fabricate", "Fabrication",             ["Fabricator - Injection/Compression Molding",
                                              "Fabricator - Extrusion",
                                              "Fabricator - Film/Sheet",
                                              "Fabricator - Foam",
                                              "Fabricator - Thermoforming",
                                              "Fabricator - Blow Molding",
                                              "Fabricator - Rotary Molding"]),
    ("oem",       "Finished product OEM",    ["Finished Product OEM"]),
    ("recycle",   "Recycling & recovery",    ["Recycler - Mechanical", "Recycler - Chemical"]),
]
ENABLERS = [
    ("machinery", "Machinery & equipment",     ["Machinery/Equipment Mfg"]),
    ("lab",       "R&D, testing & labs",       ["R&D/Testing/Lab Services"]),
    ("distrib",   "Distribution & logistics",  ["Distributor", "Logistics Provider"]),
    ("eng",       "Engineering & energy",      ["Construction/Engineering Services",
                                                "Energy Provider"]),
]
ROLE_TO_TIER = {r: k for k, _, roles in TIERS + ENABLERS for r in roles}
SPINE = [
    ("feedstock",  "Raw materials & feedstock", ["Monomers"]),
    ("producers",  "Producers & compounders",   ["Polymer Producer", "Additives",
                                                 "Formulator/Compounder"]),
    ("converters", "Converters & fabricators",  ["Fabricator - Injection/Compression Molding",
                                                 "Fabricator - Extrusion",
                                                 "Fabricator - Film/Sheet",
                                                 "Fabricator - Foam",
                                                 "Fabricator - Thermoforming",
                                                 "Fabricator - Blow Molding",
                                                 "Fabricator - Rotary Molding"]),
    ("oems",       "OEMs & end-use brands",     ["Finished Product OEM"]),
    ("recyclers",  "Recyclers & reclaimers",    ["Recycler - Mechanical", "Recycler - Chemical"]),
    ("equipment",  "Equipment & technology",    ["Machinery/Equipment Mfg",
                                                 "R&D/Testing/Lab Services"]),
]
ROLE_TO_STAGE = {r: k for k, _, roles in SPINE for r in roles}

# ----------------------------------------------------- vocabulary normalizer
# Normalize the held list values before comparing them with published row fields.
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
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"[^a-z0-9\-/ ]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    if s in PHRASE_ALIAS:
        s = PHRASE_ALIAS[s]
    if s in ALIAS:
        s = ALIAS[s]
    return s


# --------------------------------------------------------------- held-out prose
# Each held-out record remains visible by name and reason.
HOLDOUT_NOTES = {
    "homonym_county_join":
        "Wayne County, Michigan records previously joined to Wayne County, Ohio by "
        "county name. Their recorded addresses fail the Ohio state rule; they are "
        "included in the register's comparison set outside the regional filter.",
    "regional_site_nonregional_company":
        "The recorded company address is outside the region. This company-level "
        "address filter cannot establish whether a company has regional plants. "
        "The record remains named for a separate review of site-level evidence.",
    "address_missing":
        "No city, county or state is recorded. Regional membership is unresolved; "
        "these names remain disclosed and excluded from county totals until the "
        "source records receive supported addresses.",
}


def lst(v):
    """Split semicolon-separated values and strip atom whitespace."""
    return [x.strip() for x in (v or "").split(";") if x.strip()]


def name_key(s):
    return (s or "").replace("’", "'")


def load_cbp(cbp_dir):
    """Validate source bytes and require one complete cell per county and industry."""
    with open(os.path.join(cbp_dir, "cbp-receipts.json"), encoding="utf-8") as fh:
        receipts = json.load(fh)
    cbp = {name: {"estab": 0, "emp": 0} for name in NEO14.values()}
    for naics in ("325", "326"):
        filename = "cbp2023-naics%s-state39.json" % naics
        matches = [r for r in receipts if r["file"] == filename and r["naics"] == naics]
        if len(matches) != 1:
            raise SystemExit("%s: expected one acquisition receipt" % filename)
        receipt = matches[0]
        path = os.path.join(cbp_dir, filename)
        with open(path, "rb") as fh:
            raw = fh.read()
        if len(raw) != receipt["bytes"] or hashlib.sha256(raw).hexdigest() != receipt["sha256"]:
            raise SystemExit("%s: cached bytes do not match the acquisition receipt" % filename)
        rows = json.loads(raw)
        head = rows[0]
        required = {"state", "county", "NAICS2017", "ESTAB", "EMP"}
        if len(head) != len(set(head)) or not required.issubset(head):
            raise SystemExit("%s: missing or duplicate columns" % filename)
        seen = set()
        for row in rows[1:]:
            if len(row) != len(head):
                raise SystemExit("%s: row width does not match header" % filename)
            d = dict(zip(head, row))
            if d["state"] != "39" or d["NAICS2017"] != naics:
                raise SystemExit("%s: wrong state or industry" % filename)
            if d["county"] in seen:
                raise SystemExit("%s: duplicate county %s" % (filename, d["county"]))
            seen.add(d["county"])
            if d["county"] in NEO14:
                if any(not str(d[k]).isdigit() for k in ("ESTAB", "EMP")):
                    raise SystemExit("%s: missing or invalid selected employment/establishments" % filename)
                c = cbp[NEO14[d["county"]]]
                c["estab"] += int(d["ESTAB"])
                c["emp"] += int(d["EMP"])
        missing = set(NEO14) - seen
        if missing:
            raise SystemExit("%s: missing selected counties %s" % (filename, sorted(missing)))
    return cbp


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", required=True, help="held extract pic.sqlite, read-only")
    ap.add_argument("--cbp-dir", required=True, help="directory of cached raw CBP 2023 responses")
    ap.add_argument("--chain", default=CHAIN)
    ap.add_argument("--viz", default=VIZ)
    ap.add_argument("--dry-run", action="store_true", help="report, write nothing")
    a = ap.parse_args()

    uri = "file:" + os.path.abspath(a.source).replace("\\", "/").lstrip("/")
    con = sqlite3.connect(uri + "?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    recs = [dict(r) for r in con.execute("SELECT * FROM companies")]
    con.close()

    # 1. The held flag must equal the published rule, or the rule is not what ships.
    def by_rule(r):
        return ((r["county"] or "").strip() in set(NEO14.values())
                and (r["state"] or "").strip().lower() in OHIO_STATES)

    disagree = [r["name"] for r in recs if bool(r["in_neo14"]) != by_rule(r)]
    if disagree:
        raise SystemExit("in_neo14 disagrees with the CODEBOOK rule on %d rows: %s"
                         % (len(disagree), disagree[:5]))

    held = {}
    for r in recs:
        k = name_key(r["name"])
        if k in held:
            raise SystemExit("punctuation normalization made a name ambiguous: %s" % r["name"])
        held[k] = r

    with open(a.chain, encoding="utf-8") as fh:
        chain = json.load(fh)
    with open(a.viz, encoding="utf-8") as fh:
        viz = json.load(fh)

    # 2. Check identity and the source fields used in the recomputed rollups.
    shipped = chain["companies"]
    missing = [c["n"] for c in shipped if name_key(c["n"]) not in held]
    if missing:
        raise SystemExit("%d shipped rows are not in the held extract: %s"
                         % (len(missing), missing[:5]))
    drift = [(c["n"], pub) for c in shipped for src, pub in (("city", "y"), ("county", "c"),
                                                             ("website", "w"))
             if (held[name_key(c["n"])][src] or "") != (c[pub] or "")]
    for c in shipped:
        r = held[name_key(c["n"])]
        # Public cards retain at most 14 processes and 12 materials, in source order.
        expected = {
            "t": {ROLE_TO_TIER[x] for x in lst(r["value_chain"]) if x in ROLE_TO_TIER},
            "p": set(list(dict.fromkeys(norm(x) for x in lst(r["processes"]) if norm(x)))[:14]),
            "m": set(list(dict.fromkeys(norm(x) for x in lst(r["materials"]) if norm(x)))[:12]),
        }
        drift.extend((c["n"], key) for key, values in expected.items() if set(c[key]) != values)
    if drift:
        raise SystemExit("%d published identity/classification fields drifted from the extract: %s"
                         % (len(drift), drift[:5]))

    # 3. Partition. Nothing leaves without a bucket and a name.
    #
    #    IDEMPOTENCE, and why it is a correctness property rather than a convenience.
    #    Run once, `companies` holds only qualifying rows, so a second run that looked
    #    at `companies` alone would find nothing to hold out and would quietly rewrite
    #    the disclosure to 0 / 0 / 0 -- the held-out rows would vanish on the rerun that
    #    was supposed to prove the repair reproduces. So the population partitioned here
    #    is the shipped rows PLUS every name the file already discloses as held out.
    prior = (chain.get("meta") or {}).get("holdout") or {}
    prior_names = sorted({n for bucket in prior.values() for n in (bucket.get("names") or [])})
    unknown = [n for n in prior_names if name_key(n) not in held]
    if unknown:
        raise SystemExit("held-out names are not in the extract: %s" % unknown[:5])
    readmitted = [n for n in prior_names if held[name_key(n)]["in_neo14"]]
    if readmitted:
        raise SystemExit(
            "%d previously held-out rows now qualify (%s). The register has changed and "
            "this subtractive repair cannot invent their public fields: rebuild the page "
            "from the extract instead." % (len(readmitted), readmitted[:5]))

    keep, holdout = [], collections.defaultdict(list)
    for name, row in ([(c["n"], c) for c in shipped] + [(n, None) for n in prior_names]):
        r = held[name_key(name)]
        if r["in_neo14"]:
            keep.append(row)                    # public fields retained verbatim
            continue
        state = (r["state"] or "").strip()
        county = (r["county"] or "").strip()
        city = (r["city"] or "").strip()
        if state == "MI" and county == "Wayne":
            holdout["homonym_county_join"].append(name)
        elif not state and not county and not city:
            holdout["address_missing"].append(name)
        elif county in NEO14.values():
            holdout["regional_site_nonregional_company"].append(name)
        else:
            raise SystemExit("row %r fits no held-out bucket "
                             "(city=%r state=%r county=%r)" % (name, city, state, county))
    kept_names = {name_key(c["n"]) for c in shipped} | {name_key(n) for n in prior_names}
    never_shipped = [r["name"] for r in recs
                     if r["in_neo14"] and name_key(r["name"]) not in kept_names]
    if never_shipped:
        raise SystemExit("%d qualifying rows were never shipped: %s"
                         % (len(never_shipped), never_shipped[:5]))

    outside = [r for r in recs if not r["in_neo14"]]

    # 4. Rollups.
    cbp = load_cbp(a.cbp_dir)
    outside_tier = collections.Counter()
    for r in outside:
        for t in {ROLE_TO_TIER[x] for x in lst(r["value_chain"]) if x in ROLE_TO_TIER}:
            outside_tier[t] += 1
    tier_rows = [{"key": k, "label": l, "roles": roles,
                  "neo": sum(1 for c in keep if k in c["t"]), "outside": outside_tier[k]}
                 for k, l, roles in TIERS]
    enabler_rows = [{"key": k, "label": l, "roles": roles,
                     "neo": sum(1 for c in keep if k in c["t"]), "outside": outside_tier[k]}
                    for k, l, roles in ENABLERS]

    county_rows = [{"county": name, "fips": "39" + f,
                    "known": sum(1 for c in keep if c["c"] == name),
                    "classified": sum(1 for c in keep if c["c"] == name and c["t"]),
                    "cbp_estab": cbp[name]["estab"], "cbp_emp": cbp[name]["emp"]}
                   for f, name in sorted(NEO14.items(), key=lambda kv: kv[1])]

    # Vocabulary, recomputed over the retained rows only. The shipped card compared a
    # raw count taken over all 1,834 register rows with a normalized count taken over
    # the 785 the page shipped -- two populations, one arrow. Both sides are the 710 now.
    region = [held[name_key(c["n"])] for c in keep]
    raw_p = {p for r in region for p in lst(r["processes"])}
    raw_m = {m for r in region for m in lst(r["materials"])}
    proc_freq, mat_freq = collections.Counter(), collections.Counter()
    for r in region:
        for p in dict.fromkeys(norm(x) for x in lst(r["processes"])):
            if p:
                proc_freq[p] += 1
        for m in dict.fromkeys(norm(x) for x in lst(r["materials"])):
            if m:
                mat_freq[m] += 1

    meta = dict(chain["meta"])
    meta.update({
        "neo_total": len(keep),
        "unclassified": sum(1 for c in keep if not c["t"]),
        "outside_total": len(outside),
        "cbp_estab": sum(v["estab"] for v in cbp.values()),
        "cbp_emp": sum(v["emp"] for v in cbp.values()),
        "raw_processes": len(raw_p), "norm_processes": len(proc_freq),
        "raw_materials": len(raw_m), "norm_materials": len(mat_freq),
        # Structured source limitations accompany the counts.
        "region": {
            "rule": "county in NEO14 AND state in {Ohio, OH, blank} (CODEBOOK.md 2026-08-14)",
            "is": "register records carrying a qualifying Northeast Ohio address",
            "is_not": "a census of the region's polymer companies, or a count of plants",
        },
        "holdout": {k: {"n": len(holdout[k]), "names": sorted(holdout[k]),
                        "note": HOLDOUT_NOTES[k]}
                    for k in ("homonym_county_join",
                              "regional_site_nonregional_company",
                              "address_missing")},
        "holdout_total": sum(len(v) for v in holdout.values()),
        "register_total": len(recs),
    })
    chain_out = dict(chain)
    chain_out.update({"meta": meta, "tiers": tier_rows, "enablers": enabler_rows,
                      "counties": county_rows, "companies": keep,
                      "top_processes": [p for p, _ in proc_freq.most_common(60)],
                      "top_materials": [m for m, _ in mat_freq.most_common(60)]})

    supply = collections.Counter()
    for r in region:
        for s in {ROLE_TO_STAGE[x] for x in lst(r["value_chain"]) if x in ROLE_TO_STAGE}:
            supply[s] += 1
    spine_classified = sum(1 for r in region
                           if any(x in ROLE_TO_STAGE for x in lst(r["value_chain"])))
    viz_out = dict(viz)
    viz_out["spine"] = [dict(row, supply=supply[row["key"]]) for row in viz["spine"]]
    viz_out["supply_meta"] = {"neo_total": len(keep), "unclassified": meta["unclassified"],
                              "cbp_estab": meta["cbp_estab"], "cbp_emp": meta["cbp_emp"],
                              "spine_classified": spine_classified}
    # The demand side never had a geographic filter. Say so in the data, so no page
    # string can claim PIC-12 again without contradicting the file it reads.
    viz_out["demand_footprint"] = {"n": viz["intake"]["n"], "ohio": viz["intake"]["ohio"],
                                   "filtered": False}
    viz_out["counties"] = county_rows

    print("region %d  unclassified %d  outside %d  held out %d  register %d"
          % (len(keep), meta["unclassified"], len(outside), meta["holdout_total"], len(recs)))
    print("CBP %d establishments  %s employees" % (meta["cbp_estab"], format(meta["cbp_emp"], ",")))
    for k in sorted(holdout):
        print("  holdout %-36s %d" % (k, len(holdout[k])))
    for t in tier_rows + enabler_rows:
        print("  %-26s NEO %4d  outside %4d" % (t["label"], t["neo"], t["outside"]))
    print("  spine %s  (%d rows carry a spine role)" % (dict(supply), spine_classified))
    print("  vocabulary raw %d/%d -> norm %d/%d"
          % (len(raw_p), len(raw_m), len(proc_freq), len(mat_freq)))
    for c in county_rows:
        print("  %-11s known %3d  classified %3d  estab %3d  emp %6d"
              % (c["county"], c["known"], c["classified"], c["cbp_estab"], c["cbp_emp"]))

    if a.dry_run:
        print("dry run: nothing written")
        return 0
    # Each file keeps the shape it already ships in: chain-data.json is minified with no
    # trailing newline, viz-data.json is indent=1 with one (chain_detag.py's save()).
    # Reformatting either would bury a 75-row correction in a whole-file diff.
    for path, payload, text in (
            (a.chain, chain_out, json.dumps(chain_out, separators=(",", ":"), ensure_ascii=False)),
            (a.viz, viz_out, json.dumps(viz_out, indent=1, ensure_ascii=False) + "\n")):
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
        print("wrote", os.path.relpath(path, ROOT), round(os.path.getsize(path) / 1024), "KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
