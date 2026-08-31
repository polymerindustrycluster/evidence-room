"""NSF and NIH research awards — the federal money `federal-money` cannot see.

federal-money's NAICS view filters to 325*/326* manufacturing codes. A university files
under 61xxxx or 5417xx, so university research funding is INVISIBLE to it by construction.
The NSF NEO-SMART Engine ($14,999,983) and TARDISS appear nowhere in it. This script is
the other half.

WHAT A ROW IS
  One AWARD, with its obligated or funded amount, awardee institution, and year. Not an
  outlay and not a payment schedule: a ten-year Engine award appears once at its full
  obligated value, not spread across ten rows.

TWO AGENCIES, TWO DIFFERENT THINGS
  NSF  awardeeStateCode=OH + keyword     -> engineering, materials, physical sciences
  NIH  org_states=[OH] + title search    -> biomedical polymers, drug delivery, devices
  The NIH slice is the one PIC's own framing tends to miss entirely.

NOT A FOOTPRINT MEASURE. Awards are keyed to an INSTITUTION, and an institution's address
is not where the research happens — the same attribution problem as USPTO assignees and
USAspending place-of-performance. Ohio-wide is fetched; a PIC-12 subset is a judgment
call about which institutions count, not a filter this script can make honestly.
"""
import json, os, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
KEYWORDS = ["polymer", "elastomer", "rubber", "composite"]
rows = []


def get(url, data=None, ctype=None, tries=3):
    h = dict(UA)
    if ctype:
        h["Content-Type"] = ctype
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=h)
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read())
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


# ------------------------------------------------------------------------ NSF
FIELDS = "id,title,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,date,piFirstName,piLastName"
for kw in KEYWORDS:
    offset, got = 1, 0
    while True:
        u = (f"https://api.nsf.gov/services/v1/awards.json?awardeeStateCode=OH"
             f"&keyword={urllib.parse.quote(kw)}&printFields={FIELDS}"
             f"&offset={offset}&rpp=25")
        aw = get(u).get("response", {}).get("award", [])
        for a in aw:
            amt = a.get("fundsObligatedAmt")
            rows.append({
                "agency": "NSF", "keyword": kw, "award_id": a.get("id"),
                "title": (a.get("title") or "")[:220],
                "institution": a.get("awardeeName"), "city": a.get("awardeeCity"),
                "state": a.get("awardeeStateCode"),
                "pi": " ".join(x for x in (a.get("piFirstName"), a.get("piLastName")) if x),
                "amount": float(amt) if amt not in (None, "", "0") else None,
                "date": a.get("date")})
        got += len(aw)
        if len(aw) < 25 or offset > 200:
            break
        offset += 25
        time.sleep(0.5)
    print(f"  NSF '{kw}': {got} Ohio awards", flush=True)
    time.sleep(0.5)

# ------------------------------------------------------------------------ NIH
for kw in KEYWORDS:
    body = json.dumps({
        "criteria": {"org_states": ["OH"],
                     "advanced_text_search": {"operator": "and", "search_field": "projecttitle",
                                              "search_text": kw}},
        "include_fields": ["ProjectNum", "ProjectTitle", "Organization", "AwardAmount",
                           "FiscalYear", "PrincipalInvestigators"],
        "limit": 100}).encode()
    d = get("https://api.reporter.nih.gov/v2/projects/search", data=body,
            ctype="application/json")
    for a in d.get("results", []):
        org = a.get("organization") or {}
        pis = a.get("principal_investigators") or []
        rows.append({
            "agency": "NIH", "keyword": kw, "award_id": a.get("project_num"),
            "title": (a.get("project_title") or "")[:220],
            "institution": org.get("org_name"), "city": org.get("org_city"),
            "state": org.get("org_state"),
            "pi": pis[0].get("full_name") if pis else None,
            "amount": a.get("award_amount"),
            "date": str(a.get("fiscal_year") or "")})
    print(f"  NIH '{kw}': {d.get('meta',{}).get('total','?')} Ohio projects "
          f"({len(d.get('results',[]))} fetched)", flush=True)
    time.sleep(0.6)

if not rows:
    raise SystemExit("FATAL: no awards from either agency. Both APIs answered when probed "
                     "2026-08-15; a zero result is a query bug, not an Ohio with no "
                     "polymer research.")

# Dedupe: an award matching two keywords is ONE award, not two.
seen, dedup = set(), []
for r in rows:
    k = (r["agency"], r["award_id"])
    if k in seen:
        continue
    seen.add(k)
    dedup.append(r)

by_agency = {a: sum(1 for r in dedup if r["agency"] == a) for a in ("NSF", "NIH")}
funded = [r for r in dedup if r["amount"]]

out = {"meta": {
    "source": "NSF Award Search API and NIH RePORTER v2, Ohio awardees, keyword-matched",
    "row": "one AWARD with its obligated/awarded amount, institution and year. Not an "
           "outlay: a ten-year award appears once at full value, not spread across years.",
    "not_a_footprint": "Awards are keyed to an INSTITUTION, and an institution's address is "
                       "not where the research happens — the same attribution problem as "
                       "USPTO assignees and USAspending place of performance. Ohio-wide is "
                       "fetched; narrowing to PIC-12 is a judgment about which institutions "
                       "count, not a filter this script makes.",
    "why_this_exists": "federal-money's NAICS view filters to 325*/326* manufacturing, so "
                       "university research funding is invisible to it by construction. This "
                       "is the other half, and the two must never be summed — an award to a "
                       "university and an obligation to a manufacturer are different objects.",
    "keywords": KEYWORDS,
    "keyword_caveat": "Keyword match on title, not a field classification. Over-captures "
                      "passing mentions, under-captures other vocabulary. An award matching "
                      "two keywords is deduplicated to one row.",
    "agencies": by_agency,
    "fetched": time.strftime("%Y-%m-%d")}, "rows": dedup}

p = os.path.join(HERE, "research_awards.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
tot = sum(r["amount"] for r in funded)
print(f"wrote {p} {round(os.path.getsize(p)/1024)} KB, {len(dedup)} awards "
      f"(NSF {by_agency['NSF']}, NIH {by_agency['NIH']}), "
      f"{len(funded)} with amounts totalling ${tot:,.0f}")
