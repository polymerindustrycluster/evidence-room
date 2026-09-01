"""O*NET — what each occupation is, its Job Zone, and the education its workers report.

WHY IT PAIRS WITH oews.json. The wage files say what a molding-machine setter is PAID in a
metro. They do not say what one does, how much preparation the work usually takes, or what
schooling the people doing it actually have. O*NET does, for the same SOC codes.

WHAT ONE ROW IS
  One SOC occupation with: the O*NET title and one-paragraph description; its JOB ZONE
  (O*NET's scale of overall preparation, from "little or no preparation" to "extensive";
  release 30.x reports the two lowest steps as one band, "Job Zone 1-2"); and the distribution of REQUIRED LEVEL OF EDUCATION as reported by the
  workers and occupational experts O*NET surveyed — the share reporting each of twelve
  levels, from less than high school to post-doctoral training. Here the twelve are binned
  to four: high school or less / some college or an associate degree / bachelor's degree /
  graduate degree.

THREE THINGS THIS IS NOT.
  - Not a REQUIREMENT. The education distribution is what incumbents REPORT having, and the
    Job Zone is a national typical-entry rating. Neither is what a given employer asks for.
  - Not regional. O*NET is a national database; there is no Ohio cut.
  - Not the SOC. O*NET-SOC codes carry an eight-digit extension (51-4072.00) on the six-digit
    BLS SOC, and one SOC can hold several O*NET variants (17-2112.00 Industrial Engineers,
    17-2112.03 Manufacturing Engineers). Joined here by preferring the `.00` variant and,
    where none exists, averaging the variants with equal weight and SAYING SO in the row.
    The 2018 SOC broad code 51-2090 has no `.00` variant at all: it is the equal-weight mean
    of the O*NET occupations that share its five-character stem.

THE OCCUPATION SET IS READ FROM oews.json so the three files can never disagree.

LICENSE. O*NET is published by the U.S. Department of Labor / Employment and Training
Administration under CC BY 4.0. Attribution is required on anything derived from it, and
this file's meta carries the line the page must print.

Source: the O*NET database text distribution, five tab-separated files (Occupation Data,
Job Zones, Job Zone Reference, Education, Education Categories).
"""
import csv, io, json, os, re, time, urllib.error, urllib.request
from contact import UA

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "onet_education.json")
VER = "db_30_3_text"          # the same release fetch_onet.py reads
BASE = f"https://www.onetcenter.org/dl_files/database/{VER}/"
FILES = {
    "occ": "Occupation%20Data.txt",
    "zones": "Job%20Zones.txt",
    "zoneref": "Job%20Zone%20Reference.txt",
    # 30.x split the old "Education, Training, and Experience" file in two; this page needs
    # only the education half (element 2.D.1) and its category labels.
    "ete": "Education.txt",
    "etecat": "Education%20Categories.txt",
}
BROWSER = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                         "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"}

metro_path = os.path.join(HERE, "oews.json")
if not os.path.exists(metro_path):
    raise SystemExit("FATAL: oews.json is missing — run fetch_oews.py first.")
SOC = json.load(open(metro_path, encoding="utf-8"))["meta"]["occupations"]


def get(name):
    url = BASE + name
    for hdrs, tag in ((UA, "contact UA"), (BROWSER, "browser UA")):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=hdrs),
                                        timeout=300) as r:
                raw = r.read().decode("utf-8", "replace")
            print(f"  {name[:40]:<42} {len(raw)//1024:>6} KB  ({tag})", flush=True)
            return raw
        except urllib.error.HTTPError as e:
            print(f"  {name[:40]:<42} HTTP {e.code} with {tag}", flush=True)
            if e.code not in (403, 406):
                raise
    raise SystemExit(f"FATAL: {url} refused both header sets.")


def tsv(raw):
    return list(csv.DictReader(io.StringIO(raw), delimiter="\t"))


T = {k: tsv(get(v)) for k, v in FILES.items()}
for k, rows in T.items():
    if len(rows) < 4:
        raise SystemExit(f"FATAL: {k} parsed to {len(rows)} rows — file layout changed?")


def col(rows, pat):
    for c in rows[0].keys():
        if re.search(pat, c, re.I):
            return c
    raise SystemExit(f"FATAL: no column matching {pat!r} in {list(rows[0].keys())}")


def soc6(code):
    return (code or "").split(".")[0]


# --- occupation data ---------------------------------------------------------------
occ = T["occ"]
c_code, c_title, c_desc = col(occ, r"^o\*net-soc code$"), col(occ, r"^title$"), col(occ, r"^description$")
onet = {}   # onet code -> {title, description}
for r in occ:
    onet[r[c_code].strip()] = {"title": r[c_title].strip(), "description": r[c_desc].strip()}
if len(onet) < 800:
    raise SystemExit(f"FATAL: {len(onet)} O*NET occupations, expected ~1,000.")

# --- job zones ---------------------------------------------------------------------
zr = T["zoneref"]
zc = {c: col(zr, p) for c, p in (("zone", r"^job zone$"), ("name", r"^name$"),
                                  ("exp", r"^experience$"), ("edu", r"^education$"),
                                  ("train", r"^job training$"), ("ex", r"^examples$"),
                                  ("svp", r"^svp range$"))}
ZONE_REF = {int(r[zc["zone"]]): {"name": r[zc["name"]].strip(), "experience": r[zc["exp"]].strip(),
                                 "education": r[zc["edu"]].strip(), "training": r[zc["train"]].strip(),
                                 "examples": r[zc["ex"]].strip(), "svp_range": r[zc["svp"]].strip()}
            for r in zr}
# O*NET 30.x merged the two lowest zones: the reference file carries ONE row for "Job Zone
# 1-2" keyed 2, then 3, 4, 5. A Job Zones.txt row still coded 1 reads that merged row.
if not {2, 3, 4, 5} <= set(ZONE_REF):
    raise SystemExit(f"FATAL: Job Zone Reference has zones {sorted(ZONE_REF)}, expected 2-5 "
                     f"(1-2 merged) — layout changed.")
ZONE_REF.setdefault(1, ZONE_REF[2])
zj = T["zones"]
zjc, zjz = col(zj, r"^o\*net-soc code$"), col(zj, r"^job zone$")
ZONE = {r[zjc].strip(): int(r[zjz]) for r in zj}

# --- education distribution ---------------------------------------------------------
cat = T["etecat"]
cc = {c: col(cat, p) for c, p in (("el", r"^element id$"), ("scale", r"^scale id$"),
                                   ("cat", r"^category$"), ("desc", r"^category description$"))}
RL_CATS = {int(r[cc["cat"]]): r[cc["desc"]].strip() for r in cat
           if r[cc["el"]].strip() == "2.D.1" and r[cc["scale"]].strip() == "RL"}
if len(RL_CATS) != 12:
    raise SystemExit(f"FATAL: expected 12 Required-Level-of-Education categories, got {RL_CATS}")
# Twelve O*NET levels -> four bins a reader can hold. Category numbers are O*NET's, and the
# bin edges are printed in meta so a reader can disagree with them.
BIN = {1: "hs_or_less", 2: "hs_or_less",                        # < HS, HS diploma/GED
       3: "some_college", 4: "some_college", 5: "some_college",   # post-sec cert, some college, associate
       6: "bachelors", 7: "bachelors",                            # bachelor's, post-bacc cert
       8: "graduate", 9: "graduate", 10: "graduate", 11: "graduate", 12: "graduate"}
ete = T["ete"]
ec = {c: col(ete, p) for c, p in (("code", r"^o\*net-soc code$"), ("el", r"^element id$"),
                                   ("scale", r"^scale id$"), ("cat", r"^category$"),
                                   ("val", r"^data value$"), ("n", r"^n$"))}
dist = {}   # onet code -> {cat: pct}
nresp = {}
for r in ete:
    if r[ec["el"]].strip() != "2.D.1" or r[ec["scale"]].strip() != "RL":
        continue
    code = r[ec["code"]].strip()
    try:
        c, v = int(r[ec["cat"]]), float(r[ec["val"]])
    except (TypeError, ValueError):
        continue
    dist.setdefault(code, {})[c] = v
    if (r.get(ec["n"]) or "").strip():
        try:
            nresp[code] = int(float(r[ec["n"]]))
        except ValueError:
            pass


def variants(soc):
    """O*NET codes for a BLS SOC: exact stem first; a broad 2018 code by five-char stem."""
    ex = sorted(c for c in onet if soc6(c) == soc)
    if ex:
        return ex, "exact"
    if soc.endswith("0"):
        stem = soc[:-1]
        return sorted(c for c in onet if soc6(c).startswith(stem)), "broad-stem"
    return [], "none"


rows, notes = [], []
for soc, label in SOC.items():
    vs, how = variants(soc)
    if not vs:
        notes.append(f"{soc} {label}: no O*NET occupation")
        continue
    prim = next((c for c in vs if c.endswith(".00")), vs[0])
    with_dist = [c for c in vs if c in dist]
    if how == "exact" and prim in dist:
        use = [prim]
        join = f"O*NET {prim}"
    elif with_dist:
        use = with_dist
        join = ("equal-weight mean of " + ", ".join(use)) if len(use) > 1 else f"O*NET {use[0]}"
    else:
        use = []
        join = f"O*NET {prim} (no education distribution)"
    bins = {"hs_or_less": 0.0, "some_college": 0.0, "bachelors": 0.0, "graduate": 0.0}
    modal = None
    if use:
        agg = {}
        for c in use:
            for k, v in dist[c].items():
                agg[k] = agg.get(k, 0.0) + v / len(use)
        for k, v in agg.items():
            bins[BIN[k]] += v
        modal_k = max(agg, key=agg.get)
        modal = {"category": modal_k, "label": RL_CATS[modal_k], "pct": round(agg[modal_k], 1)}
        bins = {k: round(v, 1) for k, v in bins.items()}
    zone = ZONE.get(prim) or next((ZONE[c] for c in vs if c in ZONE), None)
    rows.append({"soc": soc, "occupation": label, "onet_code": prim, "onet_title": onet[prim]["title"],
                 "description": onet[prim]["description"], "variants": vs, "join": join,
                 "job_zone": zone, "job_zone_name": ZONE_REF[zone]["name"] if zone else None,
                 "job_zone_education": ZONE_REF[zone]["education"] if zone else None,
                 "education_bins": bins if use else None, "modal_education": modal,
                 "n_respondents": (nresp.get(use[0]) if len(use) == 1 else None)})
if len(rows) < len(SOC) - 1:
    raise SystemExit(f"FATAL: only {len(rows)} of {len(SOC)} occupations matched O*NET. {notes}")

out = {"meta": {
    "source": "O*NET 30.3 database — Occupation Data, Job Zones, Job Zone Reference, "
              "Education (element 2.D.1 Required Level of Education, scale RL) and "
              "Education Categories",
    "url": BASE, "docs": "https://www.onetcenter.org/database.html",
    "row": "one SOC occupation: O*NET title and description, Job Zone (1-5), and the share of "
           "surveyed workers and experts reporting each required level of education, binned "
           "to four levels",
    "not_a_requirement": "The education distribution is what O*NET's respondents REPORT having; "
                         "the Job Zone is a national typical-entry rating. Neither is what a given "
                         "employer asks for, and neither is regional — O*NET has no Ohio cut.",
    "onet_soc_is_not_soc": "O*NET-SOC carries an eight-digit extension on the six-digit SOC and one "
                           "SOC can hold several variants; joined by preferring the .00 variant, else "
                           "an equal-weight mean of the variants, stated per row in `join`. The 2018 "
                           "SOC broad code 51-2090 has no .00 variant and is the mean of the O*NET "
                           "occupations sharing its five-character stem.",
    "bins": {"hs_or_less": "categories 1-2: less than high school; high school diploma or GED",
             "some_college": "categories 3-5: post-secondary certificate; some college; associate degree",
             "bachelors": "categories 6-7: bachelor's degree; post-baccalaureate certificate",
             "graduate": "categories 8-12: master's through post-doctoral training"},
    "rl_categories": RL_CATS, "job_zone_reference": ZONE_REF,
    "attribution": "This page includes information from the O*NET 30.3 Database by the U.S. "
                   "Department of Labor, Employment and Training Administration (USDOL/ETA), used "
                   "under the CC BY 4.0 license. O*NET is a trademark of USDOL/ETA. PIC has "
                   "modified some of this information; USDOL/ETA has not approved, endorsed, or "
                   "tested these modifications.",
    "license": "CC BY 4.0", "unmatched": notes,
    "counts": {"occupations": len(rows),
               "with_distribution": sum(1 for r in rows if r["education_bins"])},
    "fetched": time.strftime("%Y-%m-%d")}, "rows": rows}
json.dump(out, open(OUT, "w", encoding="utf-8"), indent=1)
print(f"\nwrote {OUT}: {len(rows)} occupations, "
      f"{out['meta']['counts']['with_distribution']} with an education distribution"
      + (f"; unmatched: {notes}" if notes else ""))
for r in rows[:8]:
    b = r["education_bins"] or {}
    print(f"   {r['soc']} zone {r['job_zone']}  {r['occupation'][:34]:<36} "
          f"HS- {b.get('hs_or_less')}  some {b.get('some_college')}  BA {b.get('bachelors')}  "
          f"grad {b.get('graduate')}  [{r['join'][:44]}]")
