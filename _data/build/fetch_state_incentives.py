"""Ohio state tax-credit awards, parsed from Tax Credit Authority meeting minutes.

THE GAP: this site covers federal money thoroughly and carries no state money at all. Ohio
awards job-creation tax credits through the Tax Credit Authority, which meets roughly
monthly and publishes minutes naming, for every award, the company, the city and COUNTY,
the credit rate and term, the full-time jobs committed and the new annual payroll.

WHY A PDF PARSER AND NOT AN API. There is no API. Every endpoint probed on 2026-08-30
returned 404: development.ohio.gov itself, data.ohio.gov, and the CKAN and Socrata paths
those portals usually expose. The minutes are PDFs on Ohio's asset host and they are the
data. That is not a workaround; for this programme it is the primary source.

THREE LIMITS, and the second one is the dangerous one:

1. URL DISCOVERY IS MANUAL. The index page at development.ohio.gov returns 404 to any
   scripted request, and the filenames are inconsistent: some carry a Cloudinary hash
   (Meeting_Minutes_TCA_3.2.2026_pn7x3l.pdf), some do not, and they sit under two
   different directories. Guessed dates 404. The list below was assembled by search and
   has to be extended by hand. This file is therefore a SAMPLE, never a census, and any
   figure derived from it must say so.

2. OLD MINUTES ARE SCANS, AND A SCAN PARSES TO ZERO AWARDS. The 2021 minutes carry no text
   layer at all: six images per page and not one character. A parser that simply counted
   what it found would report that month as having approved nothing, which is a finding
   about Ohio rather than about the file. Any PDF with no text is reported as UNREADABLE
   and never as empty. OCR would fix it; OCRmyPDF is the tool, and it is not run here.

3. AN AWARD IS A COMMITMENT. The jobs and payroll are what a company promised in exchange
   for the credit, not what it delivered. Ohio's own Auditor found that of 55 companies
   receiving these credits in one recent year, 36 had not met their commitments. Printing
   these as jobs created would be wrong in the same way that printing a federal obligation
   as money spent is wrong.
"""
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
from footprints import PIC12  # noqa: E402

try:
    import fitz
except ImportError:
    raise SystemExit("PyMuPDF is required: pip install pymupdf (pypdf does not read these)")

BASE = "https://dam.assets.ohio.gov/image/upload/development.ohio.gov"
MINUTES = [
    "business/stateincentives/Meeting_Minutes_TCA_3.2.2026_pn7x3l.pdf",
    "about/taxcreditminutes/Meeting_Minutes_TCA_3.30.2026.pdf",
    "about/taxcreditminutes/Meeting_Minutes_TCA_4.27.2026.pdf",
    "business/stateincentives/TCA_Meeting_Minutes_6.1.2026.pdf",
    "about/taxcreditminutes/Meeting_Minutes_6.2.2025.pdf",
    "about/taxcreditminutes/taxcreditminutes-10252021.pdf",   # a scan; kept as the fixture
]
COUNTIES = set(PIC12.values())
OPENER = "appeared before the Tax Credit Authority"


def parse(path):
    doc = fitz.open(path)
    text = "\n".join(p.get_text() for p in doc)
    if len(text.strip()) < 200:
        # See note 2. A scan is not an empty meeting. OCR it if the tool is here, and if
        # it is not, report UNREADABLE rather than returning a zero that reads as a finding.
        ocr = path.replace(".pdf", ".ocr.pdf")
        if not os.path.exists(ocr) and shutil.which("ocrmypdf"):
            subprocess.run(["ocrmypdf", "--force-ocr", "--quiet", path, ocr],
                           check=False, capture_output=True)
        if os.path.exists(ocr):
            doc = fitz.open(ocr)
            text = "\n".join(p.get_text() for p in doc)
        if len(text.strip()) < 200:
            return None, {"pages": doc.page_count,
                          "images": sum(len(p.get_images()) for p in doc),
                          "ocr_attempted": bool(shutil.which("ocrmypdf"))}
    t = re.sub(r"\s*\n\s*", " ", text)
    t = re.sub(r"Page \d+( of \d+)?", " ", t)
    out = []
    # ANCHOR ON THE OPENER, THEN WALK BACK. The first version captured the company with
    # [^.]{2,90} before the opener, which excludes full stops, so every "Inc." and "Co."
    # broke the match. Measured against a raw count of the opener phrase it was dropping
    # 17 of 39 awards, 44 percent, silently. An undercount that large presented as data
    # would have been worse than publishing nothing, and nothing in the output looked
    # wrong: it simply returned fewer awards.
    starts = [m.start() for m in re.finditer(re.escape(OPENER), t)]
    for i, at in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else min(len(t), at + 1800)
        blk = t[at:end]
        # The company is the tail of whatever precedes the opener, bounded by the previous
        # award's block so a long minute cannot bleed one name into the next.
        prev = starts[i - 1] if i else max(0, at - 400)
        lead = t[prev:at].strip()
        # Cut at the last sentence end that is followed by a capital, which is where the
        # previous paragraph stopped. Abbreviations like "Inc." survive because the cut
        # requires a capital AND a preceding lowercase or digit.
        cut = list(re.finditer(r"(?<=[a-z0-9])\.\s+(?=[A-Z])", lead))
        co = lead[cut[-1].end():] if cut else lead
        co = co.strip()
        # A section heading runs straight into the first company of that section, so the
        # first match reads "JOB CREATION TAX CREDIT - NEW PROJECTS ark data centers".
        # Keyed on the SHAPE of a heading rather than a list of its words, because the list
        # was wrong on its first outing: headings are runs of all-caps words and dashes, and
        # a company name is not. Cut through the last such run.
        # THREE OR MORE consecutive all-caps words, because "AAA Cooper Transportation"
        # begins with one and the first version of this rule ate it. A heading is a long
        # caps run; a company initialism is a short one.
        # Sections open "IV. JOB CREATION TAX CREDIT - NEW PROJECTS" and run straight into
        # the first company. The roman numeral has to be part of the run or the whole strip
        # fails on exactly the awards that open a section; the earlier version did.
        # Verified to strip that heading while leaving "AAA Cooper Transportation",
        # "Hikma Pharmaceuticals USA Inc." and "The Technology House, LTD." intact.
        co = re.sub(r"^(?:(?:[IVX]+\.|[-\u2013\u2014]|\b[A-Z][A-Z&.]*\b)[\s\u2013-]+){3,}",
                    "", co).strip()
        cty = re.search(r"([A-Za-z/ ]+?)\s+Count(?:y|ies)", blk)
        fte = re.search(r"create\s+([\d,]+)\s+full-?\s*time", blk)
        pay = re.search(r"generating\s+\$([\d,]+)\s+in new annual payroll", blk)
        # "50 percent" in 2026 minutes, "2.102%" in 2021 minutes. The word-only version of
        # this matched nothing in the older files and would have silently reported every
        # pre-2022 award as having no credit rate.
        pct = re.search(r"tax (?:exemption|credit) of ([\d.]+)\s*(?:percent|%) for (\d+) year", blk)
        counties = cty.group(1).strip() if cty else None
        out.append({
            "company": co[:80],
            "counties": counties,
            "in_footprint": bool(counties and any(c in counties for c in COUNTIES)),
            "fte_committed": int(fte.group(1).replace(",", "")) if fte else None,
            "new_annual_payroll_committed": int(pay.group(1).replace(",", "")) if pay else None,
            "credit_pct": float(pct.group(1)) if pct else None,
            "credit_years": int(pct.group(2)) if pct else None,
        })
    return out, None


rows, unreadable = [], []
for rel in MINUTES:
    p = os.path.join(WEB, "_data", "raw", "tca", os.path.basename(rel))
    if not os.path.exists(p):
        print(f"  MISSING {os.path.basename(rel)} — fetch it from {BASE}/{rel}")
        continue
    got, scan = parse(p)
    if got is None:
        unreadable.append({"file": os.path.basename(rel), **scan})
        print(f"  UNREADABLE {os.path.basename(rel)}: no text layer, "
              f"{scan['images']} images over {scan['pages']} pages. NOT zero awards.")
        continue
    for r in got:
        r["file"] = os.path.basename(rel)
    rows += got
    print(f"  {os.path.basename(rel):44} {len(got):>3} awards")

hits = [r for r in rows if r["in_footprint"]]
out = {
    "meta": {
        "source": "Ohio Tax Credit Authority meeting minutes (PDF), Ohio Department of "
                  "Development, served from dam.assets.ohio.gov",
        "row": "one tax-credit award as recorded in the minutes: company, counties, credit "
               "rate and term, full-time jobs COMMITTED and new annual payroll COMMITTED.",
        "commitment_not_delivery": "These are promises made in exchange for a credit, not "
                                   "jobs created. Ohio's Auditor found 36 of 55 companies "
                                   "in one recent year had not met their commitments.",
        "sample_not_census": "There is no API and no machine-readable index. The minutes "
                             "list is assembled by hand and is a SAMPLE of meetings, so no "
                             "total here is a state total or a period total.",
        "ocr": "Scanned minutes are OCRd with ocrmypdf when it is on PATH. The 2021 file has no text layer at all and yields five awards after OCR, so the readable range is a function of tooling rather than of what Ohio published.",
        "unreadable": unreadable,
        "n_meetings_parsed": len({r["file"] for r in rows}),
        "n_meetings_unreadable": len(unreadable),
    },
    "awards": rows,
}
os.makedirs(os.path.join(WEB, "_data"), exist_ok=True)
dest = os.path.join(WEB, "_data", "state_incentives.json")
json.dump(out, open(dest, "w", encoding="utf-8"), indent=1)
print(f"\nwrote {dest}")
print(f"  {len(rows)} awards over {out['meta']['n_meetings_parsed']} readable meetings, "
      f"{len(unreadable)} unreadable")
print(f"  {len(hits)} touch a PIC-12 county:")
for r in hits:
    print(f"    {r['company'][:42]:44} {(r['counties'] or '')[:24]:26} "
          f"{str(r['fte_committed'] or '?'):>5} FTE committed")
