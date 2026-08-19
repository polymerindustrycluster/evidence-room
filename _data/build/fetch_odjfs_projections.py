"""Ohio LMI long-term employment projections, 2022-2032 — the only forward-looking series here.

WHAT IT ADDS. Everything else in this stack is a rear-view mirror: QCEW, BDS, QWI, WARN,
patents all describe what already happened. This is the one free official series that
says what the state EXPECTS — ODJFS Bureau of Labor Market Information's 10-year industry
and occupation projections, statewide and at two sub-state grains that cover the PIC-12:
the JobsOhio Northeast region (Team NEO, 18 counties, a superset of PIC-12) and the four
MSAs whose counties are PIC-12 counties (Akron, Cleveland, Canton, Youngstown; Ashtabula
and Wayne are outside every MSA and appear only in the region and state figures).

WHAT ONE ROW IS. One INDUSTRY (NAICS 3- or 4-digit, or a sector title with no code) or
one OCCUPATION (SOC), for one GEOGRAPHY: 2022 base employment, 2032 projected, change,
percent, and for occupations the annual openings split (growth / exits / transfers) and
a median wage. These are PROJECTIONS — a modelled path, not a forecast with a confidence
band, and BLS-style projections have historically under-called both booms and busts.

THE MEASUREMENT REGISTER CANNOT BE REBUILT FROM THIS SERIES, and this file says so rather
than approximating. PIPELINES.md section 6 defines the register as 3252 + 3255 + 326.
The state publishes chemicals only in two custom bundles: `3250A1` = "3251, 3252, 3253 and
3259 only" and `3250A2` = "3255 and 3256 only". So 3252 (resin and synthetic rubber) is
NEVER visible on its own — it is mixed with basic chemicals, agchem and other chemicals —
and 3255 (paint and adhesives) is mixed with 3256 (soap and cleaning). Only 326 (with 3261
plastics and 3262 rubber) is clean. `register_view` in meta carries exactly what IS
reportable and names what is not.

TRAPS.
  - **Publication thresholds differ by geography.** The statewide file footnotes
    "Industries with 5,000 or more workers"; the regional files use their own cut and drop
    more rows. Youngstown has no 325 row at all; Canton has 325 and 326 but no 4-digit
    detail; Northeast has 3250A2 but not 3250A1. A missing row is SUPPRESSED, not zero.
  - The XLSX header is three or four stacked rows; the real data starts at the row whose
    column A is "Code" (or, statewide, whose column A begins "Total All"). Located by
    content, never by line number.
  - Numbers arrive as float strings from the XML (`'-2.8900000000000002E-2'` for -2.89%);
    percent-change is a FRACTION, not a percent.
  - Occupation median wage is HOURLY for most rows and ANNUAL for a few (teachers,
    flagged `††` or `**` in the source's column L). Carried with a `wage_is_annual` flag.
  - Files are re-issued in place: the state file was dated February 2025 and the regional
    files June 2025 on 2026-08-18, both under names ending `32`. The next vintage will be
    `...34.xlsx` / `...2034.xlsx`; these URLs are pinned to the 2022-2032 round.
  - Stdlib only: XLSX is a ZIP of XML and is parsed with `zipfile` + `ElementTree`; shared
    strings and inline strings are both handled, formulas are not (there are none).
"""
import json
import os
import re
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
import io

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "odjfs_projections.json")
BASE = "https://ohiolmi.com/_docs/PROJ/"
from contact import UA  # noqa: E402  (one address, see contact.py)

# PINNED to the 2022-2032 vintage. See docstring for what the next round will be called.
GEOS = {
    "ohio":       {"label": "Ohio (statewide)", "grain": "state",
                   "ind": "Ohio/IndOH32.xlsx", "occ": "Ohio/OccOH32.xlsx"},
    "jo_northeast": {"label": "JobsOhio Northeast region (Team NEO, 18 counties)",
                     "grain": "jobsohio_region", "superset_of": "pic12",
                     "ind": "JobsOhio/LTIP_Northeast2032.xlsx",
                     "occ": "JobsOhio/LTOP_Northeast2032.xlsx"},
    "msa_akron":      {"label": "Akron MSA (Summit, Portage)", "grain": "msa",
                       "ind": "MSA/LTIP_Akron2032.xlsx", "occ": "MSA/LTOP_Akron2032.xlsx"},
    "msa_cleveland":  {"label": "Cleveland MSA (Cuyahoga, Geauga, Lake, Lorain, Medina)",
                       "grain": "msa", "ind": "MSA/LTIP_Cleveland2032.xlsx",
                       "occ": "MSA/LTOP_Cleveland2032.xlsx"},
    "msa_canton":     {"label": "Canton MSA (Stark, Carroll)", "grain": "msa",
                       "ind": "MSA/LTIP_Canton2032.xlsx", "occ": "MSA/LTOP_Canton2032.xlsx"},
    "msa_youngstown": {"label": "Youngstown MSA (Mahoning, Trumbull; Mercer PA)",
                       "grain": "msa", "ind": "MSA/LTIP_Youngstown2032.xlsx",
                       "occ": "MSA/LTOP_Youngstown2032.xlsx"},
}
# The register and its nearest reportable proxies. 3252 has no proxy at all.
REGISTER_CODES = ["325", "3250A1", "3250A2", "3254", "326", "3261", "3262"]
# Occupations kept beyond totals and major groups: the polymer plant's own job titles.
SOC_KEEP = {
    "17-2041": "Chemical Engineers", "17-2131": "Materials Engineers",
    "17-2112": "Industrial Engineers", "19-2031": "Chemists",
    "19-2032": "Materials Scientists", "19-4031": "Chemical Technicians",
    "51-1011": "First-Line Supervisors of Production and Operating Workers",
    "51-4021": "Extruding and Drawing Machine Setters, Metal and Plastic",
    "51-4072": "Molding, Coremaking, and Casting Machine Setters, Metal and Plastic",
    "51-8091": "Chemical Plant and System Operators",
    "51-9011": "Chemical Equipment Operators and Tenders",
    "51-9023": "Mixing and Blending Machine Setters, Operators, and Tenders",
    "51-9041": "Extruding, Forming, Pressing, and Compacting Machine Setters",
    "51-9124": "Coating, Painting, and Spraying Machine Setters",
    "51-9197": "Tire Builders", "51-9061": "Inspectors, Testers, Sorters, Samplers",
    "51-4041": "Machinists", "51-9111": "Packaging and Filling Machine Operators",
    "51-9199": "Production Workers, All Other",
}
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
RID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def fetch(path):
    url = BASE + path
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise SystemExit(f"FATAL: HTTP {e.code} for {url}. Files are re-issued under a new "
                         f"vintage suffix (...32 -> ...34); re-read the links on "
                         f"https://ohiolmi.com/Home/Projections/ProjectionsHome and re-pin.")


def sheets_of(blob):
    """{sheet name: [ {col letter: cell text} ]} — stdlib XLSX reader, values only."""
    z = zipfile.ZipFile(io.BytesIO(blob))
    ss = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            ss.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = {r.get("Id"): r.get("Target")
            for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    out = {}
    for s in wb.find("m:sheets", NS):
        tgt = rels[s.get(RID)]
        tgt = tgt if tgt.startswith("xl/") else "xl/" + tgt.lstrip("/")
        rows = []
        for row in ET.fromstring(z.read(tgt)).iter("{%s}row" % NS["m"]):
            cells = {}
            for c in row.findall("m:c", NS):
                col = re.match(r"[A-Z]+", c.get("r")).group(0)
                t, v = c.get("t"), c.find("m:v", NS)
                if t == "s" and v is not None:
                    val = ss[int(v.text)]
                elif t == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
                else:
                    val = v.text if v is not None else None
                cells[col] = val
            rows.append(cells)
        out[s.get("name")] = rows
    return out


def num(v, cast=float):
    try:
        return cast(float(v))
    except (TypeError, ValueError):
        return None


def clean(v):
    return re.sub(r"\s+", " ", v).strip() if isinstance(v, str) else None


def industry_rows(rows, geo):
    start = next((i for i, r in enumerate(rows)
                  if (clean(r.get("A")) == "Code") or
                     (clean(r.get("A")) or "").startswith("Total All")), None)
    if start is None:
        raise SystemExit(f"FATAL: {geo} industry sheet — no 'Code' header row and no "
                         f"'Total All' row in {len(rows)} rows. Layout changed.")
    if clean(rows[start].get("A")) == "Code":
        start += 1
    out = []
    for r in rows[start:]:
        a, b = clean(r.get("A")), clean(r.get("B"))
        if a and (a.startswith("Source") or a.startswith("*")):
            break
        if b is None and a and a.startswith("Total All"):
            a, b = None, a  # statewide file puts the total's title in column A
        if not b:
            continue
        code = a if a and re.match(r"^\d{3,4}(A\d)?$", a) else None
        out.append({"geo": geo, "naics": code, "title": b,
                    "is_sector": code is None,
                    "emp_2022": num(r.get("C"), int), "emp_2032": num(r.get("D"), int),
                    "change": num(r.get("E"), int), "pct_change": num(r.get("F"))})
    return out


def occupation_rows(rows, geo):
    start = next((i for i, r in enumerate(rows) if clean(r.get("A")) == "Code"), None)
    if start is None:
        raise SystemExit(f"FATAL: {geo} occupation sheet — no 'Code' header row.")
    out = []
    for r in rows[start + 1:]:
        a, b = clean(r.get("A")), clean(r.get("B"))
        if a and (a.startswith("Source") or a.startswith("*") or a.startswith("†")):
            break
        if not a or not re.match(r"^\d{2}-\d{4}$", a):
            continue
        major = a.endswith("-0000")
        if not (major or a in SOC_KEEP):
            continue
        flag = clean(r.get("L")) or ""
        out.append({"geo": geo, "soc": a, "title": b, "is_major_group": major,
                    "emp_2022": num(r.get("C"), int), "emp_2032": num(r.get("D"), int),
                    "change": num(r.get("E"), int), "pct_change": num(r.get("F")),
                    "openings_growth": num(r.get("G"), int),
                    "openings_exits": num(r.get("H"), int),
                    "openings_transfers": num(r.get("I"), int),
                    "openings_total": num(r.get("J"), int),
                    "median_wage": num(r.get("K")),
                    "wage_is_annual": bool(flag) or ((num(r.get("K")) or 0) > 500)})
    return out


industries, occupations, sources = [], [], {}
for geo, g in GEOS.items():
    ind = sheets_of(fetch(g["ind"]))
    sheet = ind.get("Industry Detail") or ind[list(ind)[-1]]
    rows_i = industry_rows(sheet, geo)
    occ = sheets_of(fetch(g["occ"]))
    sheet_o = occ.get("Occupational Detail")
    if sheet_o is None:
        raise SystemExit(f"FATAL: {geo} — no 'Occupational Detail' sheet; got {list(occ)}")
    rows_o = occupation_rows(sheet_o, geo)
    src = next((clean(r.get("A")) for r in sheet if (clean(r.get("A")) or "").startswith("Source")), None)
    sources[geo] = {"industry_file": BASE + g["ind"], "occupation_file": BASE + g["occ"],
                    "industry_rows": len(rows_i), "occupation_rows_kept": len(rows_o),
                    "source_line": src}
    industries += rows_i
    occupations += rows_o
    print(f"{geo:15s} industries {len(rows_i):4d}   occupations kept {len(rows_o):3d}")

if not industries or not occupations:
    raise SystemExit("FATAL: zero rows parsed.")
for geo in GEOS:
    tot = [r for r in industries if r["geo"] == geo and r["title"].startswith("Total All")]
    if not tot:
        raise SystemExit(f"FATAL: {geo} has no 'Total All Industries' row — header detection "
                         f"slipped and every row may be mis-attributed.")

# The register view: what this series CAN say about 3252/3255/326, per geography.
register_view = {}
for geo in GEOS:
    by = {r["naics"]: r for r in industries if r["geo"] == geo and r["naics"]}
    mfg = next((r for r in industries if r["geo"] == geo and r["title"] == "Manufacturing"), None)
    tot = next((r for r in industries if r["geo"] == geo and r["title"].startswith("Total All")), None)
    view = {"total": tot and {"emp_2022": tot["emp_2022"], "emp_2032": tot["emp_2032"],
                              "pct_change": tot["pct_change"]},
            "manufacturing": mfg and {"emp_2022": mfg["emp_2022"], "emp_2032": mfg["emp_2032"],
                                      "pct_change": mfg["pct_change"]}}
    for code in REGISTER_CODES:
        r = by.get(code)
        view[code] = ({"title": r["title"], "emp_2022": r["emp_2022"], "emp_2032": r["emp_2032"],
                       "change": r["change"], "pct_change": r["pct_change"]}
                      if r else "suppressed at this grain")
    register_view[geo] = view

out = {"meta": {
    "source": "Ohio Dept of Job and Family Services, Bureau of Labor Market Information — "
              "Long-Term Employment Projections 2022-2032 (ohiolmi.com/_docs/PROJ/)",
    "row": "one industry (NAICS or sector title) or one occupation (SOC) x geography; "
           "2022 base, 2032 projected, change, percent (a FRACTION), openings, wage",
    "projection_not_forecast": "a modelled path with no confidence band; historically "
                               "under-calls turning points in both directions",
    "register_cannot_be_rebuilt": "3252 is published only inside bundle 3250A1 (3251+3252+"
                                  "3253+3259) and 3255 only inside 3250A2 (3255+3256); "
                                  "326/3261/3262 are clean. See register_view.",
    "suppression": "statewide shows industries with 5,000+ workers; regional files drop "
                   "more (Youngstown has no 325 at all). Missing = suppressed, not zero.",
    "wage": "median_wage is hourly unless wage_is_annual (source flags †† / ** on a few "
            "occupations); May 2023 OEWS basis",
    "geographies": {k: {kk: vv for kk, vv in v.items() if kk not in ("ind", "occ")}
                    for k, v in GEOS.items()},
    "pic12_coverage": "Ashtabula and Wayne are in no MSA; jo_northeast (18 counties) is the "
                      "smallest grain that contains all of PIC-12 and is a superset of it",
    "soc_kept": SOC_KEEP,
    "register_view": register_view,
    "counts": {"industry_rows": len(industries), "occupation_rows": len(occupations)},
    "sources": sources,
    "fetched": time.strftime("%Y-%m-%d")},
    "industries": industries, "occupations": occupations}
json.dump(out, open(OUT, "w", encoding="utf-8"), indent=1)
rv = register_view["ohio"]
print(f"\nOhio 2022->2032: total {rv['total']['emp_2022']:,}->{rv['total']['emp_2032']:,}; "
      f"manufacturing {rv['manufacturing']['emp_2022']:,}->{rv['manufacturing']['emp_2032']:,}; "
      f"326 {rv['326']['emp_2022']:,}->{rv['326']['emp_2032']:,} ({rv['326']['pct_change']*100:+.1f}%)")
ne = register_view["jo_northeast"]
print(f"JobsOhio NE: 326 {ne['326']['emp_2022']:,}->{ne['326']['emp_2032']:,} "
      f"({ne['326']['pct_change']*100:+.1f}%); 3250A1 = {ne['3250A1']}")
print(f"wrote {OUT}")
