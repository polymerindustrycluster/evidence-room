"""JobsOhio executed grants and loans, parsed from the monthly PDF reports.

THE RICHEST OF THE DOCUMENT SOURCES. JobsOhio publishes, monthly, every project with a
fully executed grant or loan agreement, as a table carrying: company, COUNTY, region,
industry, jobs created, the payroll behind those jobs, jobs retained, fixed asset
investment, programme type and programme value. County means it joins straight to the
footprint this site is built on.

IT IS NOT THE SAME MONEY AS THE TAX CREDITS. The reports say so themselves: they exclude
public funds and incentives awarded to the same projects. JobsOhio grants and Ohio Tax
Credit Authority credits are two different instruments to the same companies, and adding
them would double count. `fetch_state_incentives.py` reads the credits; this reads the
grants; a page using both has to say which it means.

PARSING. The tables have no borders, so PyMuPDF's table finder returns nothing. Words are
extracted with coordinates and bucketed into rows by vertical midpoint and columns by x
position, which is the technique that survives a layout with no rules drawn on it.

WHAT IT STILL CANNOT TELL YOU, in the site's own idiom:
  - Jobs created is a COMMITMENT in an executed agreement, not a headcount observed later.
  - Programme value is what JobsOhio committed, not what has been disbursed.
  - A project spanning two counties is reported on both ("Franklin & Pickaway"), so county
    sums are not a partition and must never be totalled as if they were.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
from footprints import PIC12  # noqa: E402

try:
    import fitz
except ImportError:
    raise SystemExit("PyMuPDF required: pip install pymupdf")

RAW = os.path.join(WEB, "_data", "raw", "jobsohio")
COUNTIES = set(PIC12.values())

# COLUMN BOUNDARIES ARE MEASURED PER PAGE, NOT TYPED. The first version hardcoded the
# x-positions read off one monthly report, and the annual compilations use a different
# layout: counties came out as "Tuscarawas a" and "Cuyahoga Sou" because the county column
# was bleeding into the region column. Misaligned columns are worse than no data, because
# every field still looks like a plausible value. The header row is found on each page and
# the boundaries derived from where its labels actually sit.
# TEN COLUMNS, NOT EIGHT, AND THE HEADER SPANS THREE LINES. "Jobs Created" and "Fixed
# Asset" sit on the line above the main header; "Payroll" and "Investment" on the line
# below. Treating it as eight columns folded payroll into jobs-created and investment into
# jobs-retained, and the fixed-asset total came out as $9,532 across 121 projects, which is
# absurd on its face and is the only reason it was caught. Anchors are matched by label
# anywhere in the header block.
ANCHORS = [("company", "Company"), ("county", "County"), ("region", "Region"),
           ("industry", "Industry"), ("jobs_created", "Created"),
           ("jobs_created_payroll", "Payroll"), ("jobs_retained", "Retained"),
           ("fixed_asset_investment", "Investment"), ("program_type", "Type"),
           ("program_value", "Value")]
MONEY = re.compile(r"\$?([\d,]+(?:\.\d+)?)")


def cell(words, lo, hi):
    return " ".join(t[1] for t in words if lo <= t[0] < hi).strip()


def num(s):
    m = MONEY.search(s or "")
    return int(float(m.group(1).replace(",", ""))) if m else None


def columns(rows):
    """Derive column boundaries from the header BLOCK, which spans three lines."""
    keys = sorted(rows)
    main = next((i for i, k in enumerate(keys)
                 if any(t[1] == "Company" for t in rows[k])), None)
    if main is None:
        return None
    block = []
    for k in keys[max(0, main - 2): main + 3]:
        block += rows[k]
    xs = {}
    for field, label in ANCHORS:
        for _, w, x in sorted(block, key=lambda t: t[2]):
            if w == label:
                xs[field] = x
                break
    if len(xs) != len(ANCHORS):
        return None
    ordered = sorted(xs.items(), key=lambda kv: kv[1])
    bounds = []
    for i, (f, x) in enumerate(ordered):
        lo = 0 if i == 0 else (x + ordered[i - 1][1]) / 2
        hi = 9999 if i == len(ordered) - 1 else (x + ordered[i + 1][1]) / 2
        bounds.append((f, lo, hi))
    return bounds


def parse(path):
    out = []
    for page in fitz.open(path):
        rows = {}
        # NUMERIC COLUMNS ARE RIGHT-ALIGNED WHILE THEIR HEADERS ARE LEFT-ALIGNED, so a
        # value sits to the RIGHT of the label naming it and bucketing on the left edge
        # pushed every jobs figure into the payroll column. Words are bucketed on their
        # CENTRE, which lands both alignments in the right column.
        for x0, y0, x1, y1, w, *_ in page.get_text("words"):
            rows.setdefault(round((y0 + y1) / 2 / 4), []).append(((x0 + x1) / 2, w, x0))
        cols = columns(rows)
        if cols is None:
            print(f"    (no header row found on a page of {os.path.basename(path)}; "
                  "skipped rather than parsed against guessed columns)")
            continue
        for _, ws in sorted(rows.items()):
            ws.sort()
            rec = {name: cell(ws, lo, hi) for name, lo, hi in cols}
            # A data row has a company in the left column and a county in the second.
            if not rec["company"] or not rec["county"]:
                continue
            if rec["county"].lower() in ("county", "") or "Report" in rec["company"]:
                continue
            if not re.match(r"^[A-Z]", rec["company"]):
                continue
            out.append({
                "company": rec["company"],
                "county": rec["county"],
                "region": rec["region"],
                "industry": rec["industry"],
                "jobs_created": num(rec["jobs_created"]),
                "jobs_created_payroll": num(rec["jobs_created_payroll"]),
                "jobs_retained": num(rec["jobs_retained"]),
                "fixed_asset_investment": num(rec["fixed_asset_investment"]),
                "program_type": rec["program_type"],
                "program_value": num(rec["program_value"]),
                "in_footprint": any(c in rec["county"] for c in COUNTIES),
                "file": os.path.basename(path),
            })
    return out


rows = []
for f in sorted(os.listdir(RAW)):
    if not f.endswith(".pdf"):
        continue
    got = parse(os.path.join(RAW, f))
    rows += got
    print(f"  {f:38} {len(got):>4} projects")

hits = [r for r in rows if r["in_footprint"]]
out = {
    "meta": {
        "source": "JobsOhio Monthly Executed Grants and Loans Reports (PDF), jobsohio.com",
        "row": "one project with a fully executed JobsOhio grant or loan agreement: "
               "company, county, region, industry, jobs and payroll committed, jobs "
               "retained, fixed asset investment, programme type and programme value.",
        "not_the_tax_credits": "These reports EXCLUDE public funds and incentives awarded "
                               "to the same projects. JobsOhio grants and Ohio Tax Credit "
                               "Authority credits are different instruments to the same "
                               "companies; summing them double counts.",
        "commitment_not_delivery": "Jobs created is a commitment in an executed agreement. "
                                   "Programme value is committed, not disbursed.",
        "multi_county": "A project spanning counties is reported on both, so county figures "
                        "are not a partition and do not total.",
        "sample_not_census": "The months here are the ones whose URLs could be found. This "
                             "is a sample of months, never a programme total.",
        "NUMERIC FIELDS ARE UNVERIFIED": "The TEXT fields — company, county, region, "
            "industry, programme type — are read correctly and can be relied on. The "
            "NUMERIC fields cannot, yet. This table is borderless, its ten columns span a "
            "three-line header, and the numbers are right-aligned under left-aligned "
            "labels, so column assignment shifts between the monthly and annual layouts. "
            "Three successive attempts to fix it produced three different PIC-12 totals "
            "($47.0M, $51.3M and $63.6M of programme value; $9.5K, $1.59B and $1.36B of "
            "fixed assets) with no independent check to say which was right. Tuning until "
            "a number looks plausible is how a wrong number gets published, so they are "
            "flagged rather than shipped. To close this: take one report, key three rows "
            "by hand, and make the parser reproduce them before any figure here is used.",
        "text_fields_reliable": ["company", "county", "region", "industry", "program_type"],
        "numeric_fields_unverified": ["jobs_created", "jobs_created_payroll",
                                      "jobs_retained", "fixed_asset_investment",
                                      "program_value"],
        "n_files": len({r["file"] for r in rows}),
    },
    "projects": rows,
}
json.dump(out, open(os.path.join(WEB, "_data", "jobsohio.json"), "w", encoding="utf-8"),
          indent=1)
print(f"\n  {len(rows)} projects over {out['meta']['n_files']} reports, "
      f"{len(hits)} in PIC-12 counties:")
for r in sorted(hits, key=lambda r: -(r["program_value"] or 0))[:12]:
    print(f"    {r['company'][:34]:36} {r['county'][:12]:14} "
          f"{str(r['jobs_created'] or '?'):>5} jobs  "
          f"${(r['program_value'] or 0):>10,}  {r['industry'][:26]}")
