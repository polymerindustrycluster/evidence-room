"""Provenance of "72,000 employees in 996 companies" — the two federal pulls that settle it.

WHAT IT ADDS. Every other fetcher here measures the cluster. This one measures a SENTENCE.
The Greater Akron Chamber's 2022 Polymer Industry Cluster reports state that Ohio's polymer
industry has "more than 72,000 employees in 996 companies contributing $40+ billion to the
Ohio GDP", footnoted to an Ohio Development Services Agency report of June 2019. That ODSA
report was recovered on 2026-08-18 (`Documents/ohio-econdev-corpus/02_odsa-polymer-industry-
reports/ODSA_B403_Ohio-Polymers-Industry_2019-06.pdf`) and it states its own method verbatim:
"Ohio's polymers industry (32521, 325991 and 326 combined) according to the latest County
Business Patterns data", data year 2016. This file re-runs exactly that pull, plus the BEA
value-added series the same report cites for its dollar figure, so the page `web/provenance/`
can assert every number in the sentence against the bytes rather than against a PDF.

WHAT ONE ROW IS. Census County Business Patterns 2016 (NAICS 2012 basis): one (geography,
NAICS) cell of ESTAB and EMP, for Ohio and every Ohio county, at 326, 32521, 325991. BEA
SAGDP2: one (year, industry line) cell of current-dollar GDP for Ohio. Both are the
published values, untouched — no imputation, no suppression adjustment.

THE SCOPE HERE IS ODSA'S, NOT PIC'S. `PIPELINES.md` section 6 governs this repo's
measurement register: 3252 + 3255 + 326. ODSA's polymer register is 32521 + 325991 + 326.
They differ (ODSA takes only resin/synthetic-rubber inside 3252 and adds custom compounding;
PIC takes all of 3252 and adds paints/coatings/adhesives). This file deliberately runs the
ODSA scope, because the question is "does the sentence reproduce from its own source", not
"what is the cluster". A page that quotes these figures must say so.

TRAPS.
  - CBP county cells carry an EMP of 0 with a noise flag where employment is withheld;
    summing county EMP therefore UNDERCOUNTS the state EMP (63,757 vs 72,581 here). Use
    the state row for state totals; use county rows only for establishment counts and for
    the "counties with at least one establishment" figure, which survives suppression.
  - CBP 2016 is on the NAICS 2012 basis (`NAICS2012=`); 2017 onward uses `NAICS2017=`.
    Requesting the wrong vintage parameter returns nothing, not an error.
  - The Census API now REQUIRES a key (`CENSUS_API_KEY`); keyless calls 302 to a
    missing_key page. BEA needs `BEA_API_KEY`. Both are in the master `.env`.
  - BEA's state GDP-by-industry table is `SAGDP2`. `SAGDP2N` — which an earlier session
    guessed — is rejected with "Invalid Value for Parameter TableName". Line 33 = plastics
    and rubber products (326); 32 = chemicals (325); 12 = manufacturing; 1 = all industry.
  - CBP 2017 at the same scope gives 1,006 establishments at the STATE row (874+100+32),
    not 996. The data year is 2016 and the ODSA report says so ("fell 17.1 percent from 1,201
    in 2006 to 996 in 2016"). **A first draft of this docstring said "2017 gives 922" — that
    was the sum of 2017 COUNTY cells, which no longer reconcile to the state row because
    Census stopped publishing cells with fewer than three establishments from 2017.** The
    council (Codex, 2026-08-18) caught it. Lesson: a mismatch on re-run can be an aggregation
    error, a disclosure-rule change, or a vintage change; do not assume which.
  - CBP county EMP is published as 0 under two DIFFERENT mechanisms: noise infusion (a flag in
    EMP_N, which this file does not fetch) and disclosure suppression (a letter flag giving an
    employment RANGE). The Greater Akron gap of 46 employees vs the report is CONSISTENT with
    two suppressed 325991 cells (Medina flag B = 20-99, Portage flag A = 0-19; combined range
    20-118 contains 46) but is not proven by it. Say "consistent with", never "because".
  - QCEW is the other instrument. 2016 annual-average PRIVATE employment at the same three
    codes is 61,950 across 982 establishments — 14.6% below CBP's 72,581. CBP counts paid
    employees in the pay period including March 12 at all ownerships from the Business Register;
    QCEW counts UI-covered jobs averaged over the year. "More than 72,000" survives ONLY under
    CBP's definition. The page must say which instrument it means.
"""
import json
import os
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "provenance.json")
CBP = "https://api.census.gov/data/2016/cbp"
BEA = "https://apps.bea.gov/api/data/"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"}
ENV = os.path.join(os.path.expanduser("~"), ".env")

ODSA_SCOPE = ("326", "32521", "325991")           # ODSA's register, verbatim from the report
BEA_LINES = {"1": "all_industry", "12": "manufacturing", "32": "chemicals_325", "33": "plastics_rubber_326"}
# every detailed manufacturing line in SAGDP2, so any "rank" the page prints is computed, not asserted
BEA_MFG_LINES = {"14": "wood_321", "15": "nonmetallic_327", "16": "primary_metal_331", "17": "fabricated_metal_332",
                 "18": "machinery_333", "19": "computer_electronic_334", "20": "electrical_335",
                 "21": "motor_vehicles_3361_63", "22": "other_transport_3364_69", "23": "furniture_337",
                 "24": "misc_mfg_339", "26": "food_bev_tobacco_311_12", "27": "textile_313_14",
                 "28": "apparel_leather_315_16", "29": "paper_322", "30": "printing_323",
                 "31": "petroleum_coal_324", "32": "chemicals_325", "33": "plastics_rubber_326"}
GAR = {"153": "Summit", "103": "Medina", "133": "Portage"}   # Greater Akron Region, per the 2022 report


def key(name):
    v = os.environ.get(name)
    if v:
        return v.strip()
    for line in open(ENV, encoding="utf-8", errors="replace"):
        if line.startswith(name + "="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit(f"{name} not in environment or ~/.env")


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


ck, bk = key("CENSUS_API_KEY"), key("BEA_API_KEY")

# --- CBP 2016, Ohio state row, per NAICS -------------------------------------------------
state = {}
for n in ODSA_SCOPE:
    d = get(f"{CBP}?get=ESTAB,EMP&for=state:39&NAICS2012={n}&key={ck}")
    hdr, row = d[0], d[1]
    state[n] = {"estab": int(row[hdr.index("ESTAB")]), "emp": int(row[hdr.index("EMP")])}
    time.sleep(0.5)
state_total = {"estab": sum(v["estab"] for v in state.values()),
               "emp": sum(v["emp"] for v in state.values())}
print(f"CBP 2016 Ohio {'+'.join(ODSA_SCOPE)}: {state_total['estab']} estab, {state_total['emp']:,} emp")

# --- CBP 2016, county rows -----------------------------------------------------------------
counties = {}
for n in ODSA_SCOPE:
    d = get(f"{CBP}?get=ESTAB,EMP,NAME&for=county:*&in=state:39&NAICS2012={n}&key={ck}")
    hdr = d[0]
    for row in d[1:]:
        r = dict(zip(hdr, row))
        c = counties.setdefault(r["county"], {"name": r["NAME"].split(" County")[0], "estab": 0, "emp": 0})
        c["estab"] += int(r["ESTAB"])
        c["emp"] += int(r["EMP"])
    time.sleep(0.5)
n_counties = len(counties)
county_estab_sum = sum(c["estab"] for c in counties.values())
gar = {"estab": sum(counties[f]["estab"] for f in GAR if f in counties),
       "emp": sum(counties[f]["emp"] for f in GAR if f in counties),
       "counties": {GAR[f]: counties[f] for f in GAR if f in counties}}
print(f"  counties with >=1 establishment: {n_counties} of 88; county estab sum {county_estab_sum}")
print(f"  Greater Akron (Summit+Medina+Portage): {gar['estab']} estab, {gar['emp']:,} emp")

# --- CBP 2017 state row (the trap the council caught) ------------------------------------
cbp2017 = {}
for n in ODSA_SCOPE:
    d = get(f"https://api.census.gov/data/2017/cbp?get=ESTAB,EMP&for=state:39&NAICS2017={n}&key={ck}")
    hdr, row = d[0], d[1]
    cbp2017[n] = {"estab": int(row[hdr.index("ESTAB")]), "emp": int(row[hdr.index("EMP")])}
    time.sleep(0.5)
cbp2017_total = {"estab": sum(v["estab"] for v in cbp2017.values()), "emp": sum(v["emp"] for v in cbp2017.values())}
print(f"CBP 2017 Ohio state row, same scope: {cbp2017_total['estab']} estab (NOT the county sum of 922)")

# --- CBP 2016 all states, for Ohio's rank and share at the ODSA scope --------------------
us_by_state = {}
for n in ODSA_SCOPE:
    d = get(f"{CBP}?get=ESTAB,EMP,NAME&for=state:*&NAICS2012={n}&key={ck}")
    hdr = d[0]
    for row in d[1:]:
        r = dict(zip(hdr, row))
        st = us_by_state.setdefault(r["state"], {"name": r["NAME"], "estab": 0, "emp": 0})
        st["estab"] += int(r["ESTAB"]); st["emp"] += int(r["EMP"])
    time.sleep(0.5)
# rank among the 50 states only; DC and territories are kept in the US total but not the ranking
NON_STATES = {"District of Columbia", "Puerto Rico", "Guam", "U.S. Virgin Islands", "American Samoa",
              "Commonwealth of the Northern Mariana Islands"}
us_tot_estab = sum(v["estab"] for v in us_by_state.values()); us_tot_emp = sum(v["emp"] for v in us_by_state.values())
us_by_state = {k: v for k, v in us_by_state.items() if v["name"] not in NON_STATES}
rank_emp = sorted(us_by_state.values(), key=lambda v: -v["emp"])
rank_est = sorted(us_by_state.values(), key=lambda v: -v["estab"])
oh_rank_emp = next(i for i, v in enumerate(rank_emp, 1) if v["name"] == "Ohio")
oh_rank_est = next(i for i, v in enumerate(rank_est, 1) if v["name"] == "Ohio")
share = {"emp_pct": round(100 * state_total["emp"] / us_tot_emp, 2),
         "estab_pct": round(100 * state_total["estab"] / us_tot_estab, 2),
         "rank_emp": oh_rank_emp, "rank_estab": oh_rank_est, "n_states": len(us_by_state),
         "us_emp": us_tot_emp, "us_estab": us_tot_estab,
         "top5_emp": [(v["name"], v["emp"]) for v in rank_emp[:5]]}
print(f"Ohio share of US at ODSA scope: {share['emp_pct']}% of employment (rank #{oh_rank_emp}), "
      f"{share['estab_pct']}% of establishments (rank #{oh_rank_est})")

# --- QCEW 2016 annual, Ohio, private, same three codes ------------------------------------
import csv, io as _io
qcew = {"emp": None, "estabs": None, "by_code": {}, "note": "annual-average PRIVATE (own_code 5) UI-covered employment"}
try:
    with urllib.request.urlopen(urllib.request.Request("https://data.bls.gov/cew/data/api/2016/a/area/39000.csv",
                                                       headers=UA), timeout=120) as r:
        rows = list(csv.DictReader(_io.TextIOWrapper(r, encoding="utf-8", errors="replace")))
    for row in rows:
        if row["own_code"] == "5" and row["industry_code"] in ODSA_SCOPE and row["agglvl_code"] in ("55", "57", "58"):
            qcew["by_code"][row["industry_code"]] = {"emp": int(row["annual_avg_emplvl"]),
                                                     "estabs": int(row["annual_avg_estabs"]),
                                                     "disclosure": row.get("disclosure_code", "")}
    qcew["emp"] = sum(v["emp"] for v in qcew["by_code"].values())
    qcew["estabs"] = sum(v["estabs"] for v in qcew["by_code"].values())
    qcew["vs_cbp_pct"] = round(100 * (qcew["emp"] - state_total["emp"]) / state_total["emp"], 1)
    print(f"QCEW 2016 Ohio private, same scope: {qcew['emp']:,} jobs / {qcew['estabs']:,} estabs "
          f"({qcew['vs_cbp_pct']:+.1f}% vs CBP)")
except Exception as e:
    print(f"  QCEW pull failed: {e}")

# --- BEA SAGDP2, Ohio, 2016 and 2019 -----------------------------------------------------
bea = {}
for lc, label in BEA_LINES.items():
    d = get(f"{BEA}?UserID={bk}&method=GetData&datasetname=Regional&TableName=SAGDP2"
            f"&LineCode={lc}&GeoFIPS=39000&Year=2016,2019&ResultFormat=json")
    R = d["BEAAPI"]["Results"]
    R = R[0] if isinstance(R, list) else R
    for r in R["Data"]:
        bea.setdefault(r["TimePeriod"], {})[label] = float(r["DataValue"].replace(",", ""))
    time.sleep(0.5)
for y in sorted(bea):
    b = bea[y]
    print(f"BEA {y} Ohio ($M): 326={b['plastics_rubber_326']:,.0f}  325={b['chemicals_325']:,.0f}  "
          f"all={b['all_industry']:,.0f}")
# rank of 326 among ALL detailed manufacturing lines, Ohio 2016 — computed, so the page can say it
mfg2016 = {}
for lc, label in BEA_MFG_LINES.items():
    if label in ("chemicals_325", "plastics_rubber_326"):
        mfg2016[label] = bea["2016"][label]; continue
    d = get(f"{BEA}?UserID={bk}&method=GetData&datasetname=Regional&TableName=SAGDP2"
            f"&LineCode={lc}&GeoFIPS=39000&Year=2016&ResultFormat=json")
    R = d["BEAAPI"]["Results"]; R = R[0] if isinstance(R, list) else R
    for r in R["Data"]:
        try: mfg2016[label] = float(r["DataValue"].replace(",", ""))
        except ValueError: mfg2016[label] = None   # (D) suppressed
    time.sleep(0.4)
ranked = sorted([(k, v) for k, v in mfg2016.items() if v is not None], key=lambda kv: -kv[1])
bea_rank = {"lines_published": len(ranked), "lines_total": len(BEA_MFG_LINES),
            "rank_326": next(i for i, (k, _) in enumerate(ranked, 1) if k == "plastics_rubber_326"),
            "rank_325": next(i for i, (k, _) in enumerate(ranked, 1) if k == "chemicals_325"),
            "top3": ranked[:3], "all": ranked}
print(f"BEA 2016 Ohio mfg lines: 326 ranks #{bea_rank['rank_326']} of {bea_rank['lines_published']} published; "
      f"top3 = {[(k, round(v)) for k, v in ranked[:3]]}")
# Ohio's rank among STATES for 326 value added, 2016 — the claim ODSA actually made
d = get(f"{BEA}?UserID={bk}&method=GetData&datasetname=Regional&TableName=SAGDP2&LineCode=33&GeoFIPS=STATE&Year=2016&ResultFormat=json")
R = d["BEAAPI"]["Results"]; R = R[0] if isinstance(R, list) else R
REGIONS = {"United States", "New England", "Mideast", "Great Lakes", "Plains", "Southeast", "Southwest", "Rocky Mountain", "Far West"}
st326 = []
for r in R["Data"]:
    try: st326.append((r["GeoName"], float(r["DataValue"].replace(",", ""))))
    except ValueError: pass
st326 = [x for x in st326 if x[0] not in REGIONS and not x[0].startswith("United States") and x[0] != "District of Columbia"]  # 50 states; BEA appends " *" to the US row
st326.sort(key=lambda x: -x[1])
oh_us_rank_326 = next(i for i, (n, _) in enumerate(st326, 1) if n == "Ohio")
print(f"BEA 2016: Ohio ranks #{oh_us_rank_326} of {len(st326)} states in 326 value added (top3 {[(n, round(v)) for n, v in st326[:3]]})")

# --- the sentence under test, and what the cited PDF actually says ----------------------
claim = {"employees_text": "more than 72,000", "companies_text": "996",
         "gdp_text": "$40+ billion", "cluster_text": "Ohio's largest industry cluster"}

# READ from the recovered PDF, not typed. The council attack on the first draft was exact:
# a harness asserting `gdp_326_busd == 6.03` against a value the fetcher typed in is a
# tautology — it checks that we typed what we typed. So the four load-bearing ODSA facts are
# extracted from the PDF text with pdftotext here, and the harness asserts against THAT. If
# the PDF is swapped, corrupted, or misread, the numbers below come out None and the claims
# fail loudly. The regexes are the exact sentences, not fuzzy matches.
import re
import subprocess
PDF = os.path.join(os.path.dirname(os.path.dirname(HERE)), "provenance", "data", "primary-sources",
                   "ODSA_B403_Ohio-Polymers-Industry_2019-06.pdf")
odsa_text = ""
if os.path.exists(PDF):
    try:
        odsa_text = subprocess.run(["pdftotext", "-layout", PDF, "-"], capture_output=True,
                                   text=True, encoding="utf-8", errors="replace", timeout=120).stdout
    except Exception as e:
        print(f"  pdftotext failed on the ODSA PDF: {e}")
else:
    print(f"  ODSA PDF not found at {PDF} — odsa_2019_states will be null and the harness will fail")

def grab(pattern, cast=str, flags=re.S):
    """Extract group 1. Commas are stripped ONLY for numeric casts — the harness caught this
    helper eating the comma out of the scope string '32521, 325991 and 326 combined'."""
    m = re.search(pattern, odsa_text, flags)
    if not m:
        return None
    v = m.group(1)
    return cast(v.replace(",", "")) if cast in (int, float) else v

odsa_2019 = {
    "source_pdf": os.path.relpath(PDF, os.path.dirname(os.path.dirname(HERE))).replace("\\", "/") if odsa_text else None,
    "pdf_chars": len(odsa_text),
    # "$6.03 billion worth of plastic and rubber products (NAICS code 326) were made in Ohio ... as judged by
    #  Gross Domestic Product data from the U.S. Bureau of Economic Analysis (2019)."
    "gdp_326_busd": grab(r"\$(\d+\.\d+) billion worth of plastic and rubber products \(NAICS code 326\)", float),
    "gdp_label": ("Gross Domestic Product (BEA)" if re.search(
        r"6\.03 billion worth of plastic and rubber products.{0,300}?Gross Domestic Product", odsa_text, re.S) else None),
    # "77 counties have at least one of Ohio's 996 polymers industry establishments"
    "counties": grab(r"(\d+) counties have at least one of Ohio's \d+ polymers industry establishments", int),
    "establishments": grab(r"\d+ counties have at least one of Ohio's (\d+) polymers industry establishments", int),
    # "72,581 people were employed at 996 establishments" / table total
    "employees": grab(r"(72,\d{3}) people were employed at", int) or grab(r"Total:\s+(72,\d{3})", int),
    # "Ohio's polymers industry (32521, 325991 and 326 combined)"
    "scope": grab(r"polymers industry \((32521, 325991 and 326 combined)\)"),
    # "fell 17.1 percent from 1,201 in 2006 to 996 in 2016"
    # the sentence wraps across a line in the layout text — allow whitespace incl. newline
    "data_year_stated": grab(r"1,201\s+in\s+2006\s+to\s+996\s+in\s+(20\d\d)", int),
    "establishments_2006": grab(r"from\s+(1,\d{3})\s+in\s+2006\s+to\s+996", int),
}
print(f"ODSA 2019 PDF read: gdp={odsa_2019['gdp_326_busd']} label={'GDP' if odsa_2019['gdp_label'] else None} "
      f"estab={odsa_2019['establishments']} emp={odsa_2019['employees']} counties={odsa_2019['counties']} "
      f"scope={'ok' if odsa_2019['scope'] else None} year={odsa_2019['data_year_stated']}")
ibis_arith = {"us_market_325_326_2020_busd": 678.0, "assumed_ohio_share": 0.0625,
              "derived_ohio_revenue_busd": round(678.0 * 0.0625, 2)}

out = {"meta": {
    "footprint": {"label": "Ohio", "note": "statewide; Greater Akron = Summit+Medina+Portage per the 2022 report"},
    "sources": ["cbp2016_odsa_scope", "bea_sagdp2", "qcew", "cbp2017_state_row", "odsa_b403_pdf"],
    "scope": ("This page uses ODSA's polymer register, 32521 + 325991 + 326, because the question is whether the "
              "sentence reproduces from its own cited source. That is NOT PIC's measurement register "
              "(3252 + 3255 + 326, PIPELINES.md section 6); figures here must not be set beside PIC-register "
              "pages without saying the registers differ."),
    "scope_detail": {"used_here": "ODSA register 32521 + 325991 + 326",
                     "pic_register": "3252 + 3255 + 326 (PIPELINES.md section 6)",
                     "not_comparable": True},
    "question": ("Does the sentence 'The polymer industry is Ohio's largest industry cluster and manufacturing hub with "
                 "more than 72,000 employees in 996 companies contributing $40+ billion to the Ohio GDP' reproduce from "
                 "the source it cites?"),
    "source": ("The sentence: Greater Akron Chamber, Polymer Industry Cluster Strategic Framework (2022) section 3.1, "
               "footnote 23. The footnote resolves to: ODSA Office of Research, Ohio's Polymers Industry: Plastic Resins, "
               "Synthetic Rubber and Related Products, June 2019 (B403, Larrick), recovered from the Internet Archive and "
               "held in data/primary-sources/."),
    "suppression": ("County employment is published as 0 where Census withholds a small cell, so summed county EMP "
                    "(63,757) undercounts the state row (72,581); the state row is authoritative for employment. "
                    "Establishment counts survive suppression, which is why the county figures reconcile exactly."),
    "fetched": time.strftime("%Y-%m-%d")},
    "claim_text": claim,
    "odsa_2019_states": odsa_2019,
    "ibisworld_arithmetic_in_2022_report": ibis_arith,
    "cbp2017_state_row": {"by_naics": cbp2017, "state_total": cbp2017_total,
                          "note": "a first-draft claim that 2017 = 922 was the county sum after the 2017 disclosure change; the state row is authoritative"},
    "ohio_vs_us_2016": share,
    "qcew2016_private": qcew,
    "bea_mfg_rank_2016": bea_rank,
    "bea_326_state_rank_2016": {"ohio_rank": oh_us_rank_326, "n_states": len(st326), "top5": st326[:5]},
    "cbp2016": {"by_naics": state, "state_total": state_total,
                "counties_with_establishments": n_counties, "county_estab_sum": county_estab_sum,
                "greater_akron": gar,
                "counties": counties},
    "bea_sagdp2_ohio_musd": bea}
json.dump(out, open(OUT, "w", encoding="utf-8"), indent=1)

b16 = bea["2016"]
print(f"\nSENTENCE vs SOURCE:")
print(f"  '996 companies'        -> CBP 2016 establishments {state_total['estab']}   {'MATCH' if state_total['estab']==996 else 'NO'}")
print(f"  'more than 72,000'     -> CBP 2016 employees {state_total['emp']:,}   {'MATCH' if state_total['emp']>72000 else 'NO'}")
print(f"  '77 counties' (exec summary) -> {n_counties}   {'MATCH' if n_counties==77 else 'NO'}")
print(f"  '$40+ billion GDP'     -> BEA 2016 Ohio 326 value added ${b16['plastics_rubber_326']/1000:.1f}B; "
      f"325+326 ${(b16['plastics_rubber_326']+b16['chemicals_325'])/1000:.1f}B; ODSA's own text $6.03B  -> overstated ~{40/6.03:.1f}x")
print(f"wrote {OUT}")
