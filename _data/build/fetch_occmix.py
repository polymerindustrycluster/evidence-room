"""The occupation mix inside polymer manufacturing — the bridge over QWI's blind spot.

WHAT IT CLOSES. The `talent` page carries a measured finding that undercuts the shortage
case: the polymer wage premium fell from 1.141 in 2012 to 1.058 in 2025. Its own stated limit
is that **QWI carries no occupation dimension**, so a genuine shortage in one engineering
occupation would be invisible inside an industry-wide average. Nothing wired can see inside
NAICS 326. This can.

BLS's National Employment Matrix gives, for an industry, every occupation employed in it, that
occupation's share of the industry, and the industry's share of that occupation. Multiplying
those staffing shares by the wired QCEW county employment for NAICS 326 yields a **synthetic**
regional occupation mix.

THE WORD SYNTHETIC IS LOAD-BEARING. The staffing pattern is NATIONAL. Applying it to PIC-12
assumes this region's plants have the same occupational structure as the national industry,
which is exactly what a region with unusual R&D intensity might not. **A number produced this
way is an estimate under a stated assumption, never a measurement**, and any page using it
must say so in the sentence, not the footnote.

A CORRECTION TO AN EARLIER READ, RECORDED SO IT IS NOT REPEATED. This page was first assessed
as "JS-rendered into a single <tr>, needs extraction not a data fetch." That was wrong: the
table is plain HTML, and the tags are UPPERCASE (`<TR>`, `<TD>`). A case-sensitive lowercase
regex found one row and produced a confident wrong conclusion about the source's difficulty.

INDUSTRY CODES. 326000 = plastics and rubber products manufacturing. 325200 = resin, synthetic
rubber and artificial fibres, which is where compounding sits and is a different industry from
the converters.
"""
import html
import json
import os
import re
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "occmix.json")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"}
BASE = "https://data.bls.gov/projections/nationalMatrix?queryParams={code}&ioType=i"
# Valid National Employment Matrix industry codes, verified by probe 2026-08-17. Not every
# NAICS code is one: 325200 (resins/synthetic rubber), 3252A1 and 325A00 all return a page
# with zero occupations and an empty title suffix rather than an error.
INDUSTRIES = {"326000": "Plastics and rubber products manufacturing",
              "326100": "Plastics product manufacturing",
              "326200": "Rubber product manufacturing",
              "325000": "Chemical manufacturing"}


def strip_tags(s):
    return html.unescape(re.sub(r"<[^>]+>", " ", s)).replace("\xa0", " ").strip()


def num(s):
    s = (s or "").replace(",", "").replace("%", "").strip()
    if not s or s in ("-", "--", "N/A"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def fetch(code):
    url = BASE.format(code=code)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                        timeout=120) as r:
                body = r.read()
            # The host gzips intermittently and urllib does not decompress.
            if body[:2] == b"\x1f\x8b":
                import gzip
                body = gzip.decompress(body)
            return body.decode("utf-8", "replace")
        except Exception as e:
            if attempt == 2:
                raise SystemExit(f"FATAL: {code}: {e}")
            time.sleep(3 * (attempt + 1))


out_rows, meta_cols = [], {}
for code, label in INDUSTRIES.items():
    page = fetch(code)
    # Tags are UPPERCASE here — matching must be case-insensitive or the table reads as one row.
    trs = re.findall(r"<TR[^>]*>(.*?)</TR>", page, re.S | re.I)
    header = None
    got = 0
    for tr in trs:
        cells = [strip_tags(c) for c in re.findall(r"<T[DH][^>]*>(.*?)</T[DH]>", tr, re.S | re.I)]
        cells = [c for c in cells if c != ""]
        if not cells:
            continue
        if header is None and not re.search(r"\d{2}-\d{4}", " ".join(cells)):
            header = cells
            continue
        m = re.search(r"\b(\d{2}-\d{4})\b", " ".join(cells))
        if not m:
            continue
        soc = m.group(1)
        vals = [num(c) for c in cells]
        nums = [v for v in vals if v is not None]
        out_rows.append({
            "industry": code, "industry_label": label,
            "soc": soc, "occupation": cells[0],
            "occupation_type": cells[2] if len(cells) > 2 else None,
            "raw": cells,
            "employment_2024": nums[0] if len(nums) > 1 else None,
            "pct_of_industry": nums[1] if len(nums) > 2 else None,
        })
        got += 1
    meta_cols[code] = header
    print(f"  {code} {label[:40]:<42}{got:>4} occupations", flush=True)
    if got < 20:
        raise SystemExit(f"FATAL: only {got} occupations for {code}. The table markup is "
                         f"UPPERCASE <TR>/<TD>; a case-sensitive lowercase match returns 1 row "
                         f"and looks like a JS-rendered page. Header seen: {header}")

# Guard: the mix must be dominated by production occupations, not management. If the column
# order shifts, shares land on the wrong occupation and nothing errors.
p326 = [r for r in out_rows if r["industry"] == "326000" and r["soc"] != "00-0000"]
top = sorted((r for r in p326 if r["pct_of_industry"]),
             key=lambda r: -r["pct_of_industry"])[:5]
if not any(r["soc"].startswith("51-") for r in top):
    raise SystemExit("FATAL: no 51-xxxx production occupation in the top five of NAICS 326 "
                     f"by share. Column order has shifted. Top: {[(r['soc'], r['occupation'][:28]) for r in top]}")

out = {"meta": {
    "source": "BLS Employment Projections, National Employment Matrix, industry->occupation",
    "row": "one occupation employed in one industry, NATIONALLY",
    "geography": "NATIONAL ONLY. There is no state or metro cut of this matrix.",
    "synthetic_is_load_bearing":
        "Multiplying these national staffing shares by wired QCEW county employment for "
        "NAICS 326 yields an ESTIMATE under the assumption that PIC-12 plants have the "
        "national occupational structure — which a region with unusual R&D intensity may "
        "not. Say 'estimated' in the sentence, not the footnote.",
    "why_it_exists": "the `talent` page's polymer wage premium fell 1.141->1.058 and its "
                     "stated limit is that QWI has no occupation dimension; a narrow "
                     "engineering shortage would be invisible in an industry average",
    "markup_trap": "the table uses UPPERCASE <TR>/<TD>. A case-sensitive lowercase regex "
                   "returns one row and invites the wrong conclusion that the page is "
                   "JS-rendered. It is not.",
    "industries": INDUSTRIES,
    "columns_seen": meta_cols,
    "fetched": time.strftime("%Y-%m-%d")},
    "rows": out_rows}
json.dump(out, open(OUT, "w", encoding="utf-8"), indent=1)
print(f"\ntop occupations in NAICS 326 nationally:")
for r in top:
    print(f"   {r['pct_of_industry']:>5.1f}%  {r['soc']}  {r['occupation'][:44]}")
print(f"wrote {OUT} — {len(out_rows)} rows")
