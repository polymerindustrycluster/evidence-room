"""Polymer patent applications with a Northeast Ohio inventor, by filing year.

THE INNOVATION GAP THIS FILLS. This site publishes a cluster's employment, wages,
commuting, degrees, prices and federal money, and until now published nothing at all about
whether it INVENTS anything. For a page series about an innovation cluster that is a
strange hole, and it was found by asking what a reader would want that we had not looked
for.

SOURCE. USPTO Open Data Portal, api.uspto.gov, patent APPLICATIONS search. Requires a free
USPTO_API_KEY. Two other routes were tried first and are dead or down:
  - PatentsView (search.patentsview.org) was SHUT DOWN on 2026-03-20. Its disambiguated
    data now ships as bulk files on the Open Data Portal.
  - Patent Public Search (ppubs) answered every query, including the simplest, with a 500.
A register entry naming either would have been an endpoint nobody can call.

FOUR THINGS THIS CANNOT TELL YOU, all of which change the number:

1. APPLICATIONS ARE NOT GRANTS. Every count here is something somebody filed. Filing is a
   decision to try; a grant is an outcome. They move together and are not the same series.

2. AN ADDRESS IS NOT A LABORATORY. The geography is the correspondence address on the
   filing. The first record this script ever returned was assigned to Goodyear in Akron
   with the inventor resident in Luxembourg. Counting by INVENTOR address gives 282,544
   Ohio applications; counting by APPLICANT address gives 117,452. Those answer different
   questions and neither is wrong. This file counts INVENTORS, because the question is
   whether invention happens here rather than who owns it.

3. RECENT YEARS ARE INCOMPLETE BY CONSTRUCTION. An application publishes about eighteen
   months after it is filed, so the newest filing years are always undercounted and always
   look like a collapse. Read on 2026-08-30 the counts run 2023:342, 2024:325, 2025:266,
   2026:20 — and that 20 is not a finding about Ohio, it is the lag. LAST_COMPLETE below
   is the last year this script will treat as trustworthy, and everything after it is
   fetched and flagged rather than dropped, so a reader can see the shape of the lag
   instead of taking our word for where it starts.

4. C08 IS ONE DEFINITION OF POLYMER. Cooperative Patent Classification C08 is organic
   macromolecular compounds. It is the closest single class to this cluster's subject and
   it is a choice, like every code choice on this site.
"""
import json
import os
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
from contact import UA  # noqa: E402

ENDPOINT = "https://api.uspto.gov/api/v1/patent/applications/search"
CPC = "C08*"
FIRST_YEAR, LAST_YEAR = 2015, 2026
LAST_COMPLETE = 2023          # see note 3; raise it only when the lag has caught up
GEO = "applicationMetaData.inventorBag.correspondenceAddressBag"

# The four metro anchors. Cities rather than counties because the filing carries a city and
# no FIPS, which is itself a limit worth printing: this is NOT the PIC-12 footprint and
# must never be presented as if it were.
CITIES = ["Akron", "Cleveland", "Canton", "Youngstown"]


def key():
    for p in (os.path.expanduser("~/.env"), os.path.join(WEB, "..", ".env")):
        if not os.path.exists(p):
            continue
        for line in open(p, encoding="utf-8", errors="ignore"):
            if line.strip().startswith("USPTO_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


K = key()
if not K:
    raise SystemExit("no USPTO_API_KEY in the environment. Free at account.uspto.gov; the "
                     "patent counts cannot be fetched without it.")


def count(q):
    """One count. Retries, then FAILS rather than returning a zero that reads as a finding."""
    body = json.dumps({"q": q, "pagination": {"offset": 0, "limit": 1}}).encode()
    # contact.UA is a HEADER DICT, not a string; spread it rather than assigning it to
    # User-Agent, which is what the first version of this did and what broke it.
    req = urllib.request.Request(ENDPOINT, data=body, method="POST", headers={
        "X-API-KEY": K, "Content-Type": "application/json",
        "Accept": "application/json", **UA})
    last = None
    for _ in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)["count"]
        except urllib.error.HTTPError as e:
            # A GENUINE ZERO ARRIVES AS 404 HERE. This endpoint answers "nothing matched"
            # with a 404 whose body says so, which is not the same as a 404 from a wrong
            # path, and the difference matters more on this site than most: a missing
            # count silently becoming 0 is the exact defect the suppression section exists
            # to warn about. So the BODY has to say it, or this fails loudly.
            body = ""
            try:
                body = e.read().decode("utf-8", "replace")
            except Exception:                                    # noqa: BLE001
                pass
            if e.code == 404 and "No matching records" in body:
                return 0
            last = f"HTTP {e.code}: {body[:160] or e.reason}"
            time.sleep(3)
        except Exception as e:                                   # noqa: BLE001
            last = e
            time.sleep(3)
    raise SystemExit(f"USPTO count failed after four tries: {last}\n  query: {q}")


def year_range(y):
    return f"applicationMetaData.filingDate:[{y}-01-01 TO {y}-12-31]"


rows = []
for y in range(FIRST_YEAR, LAST_YEAR + 1):
    row = {"year": y, "complete": y <= LAST_COMPLETE}
    row["ohio"] = count(f"{GEO}.geographicRegionCode:OH AND "
                        f"applicationMetaData.cpcClassificationBag:{CPC} AND {year_range(y)}")
    # THE TWO BASELINES WITHOUT WHICH THE OHIO SERIES CANNOT BE READ. The national C08
    # series separates the region from the field: if polymer patenting fell everywhere,
    # an Ohio fall is the tide. And Ohio's ALL-CLASS series separates polymer from the
    # state: Ohio's overall patenting is itself declining, so the polymer-specific story
    # is only the part that falls FASTER than that. Run without the second baseline, this
    # page would have overstated its own finding by a factor of two, which was caught at
    # the stress-test stage rather than after publication.
    # THE NATIONAL BASIS MUST MATCH THE OHIO BASIS. The first shipped version compared
    # Ohio's inventor-address series to an UNFILTERED national count, which is worldwide
    # filings at the USPTO: flat at 99 only because foreign-origin filings filled the
    # hole American ones left. A replication reviewer reproduced 99.0 and then could not
    # reproduce the LABEL, which is how this was caught the day the page shipped. The
    # matched national series is countryCode:US on the same inventor bag, and it tells a
    # different story: American polymer filings fell by a fifth. The worldwide count is
    # kept, as the trap it is.
    row["us_inv"] = count(f"{GEO}.countryCode:US AND "
                          f"applicationMetaData.cpcClassificationBag:{CPC} AND {year_range(y)}")
    row["us_inv_all"] = count(f"{GEO}.countryCode:US AND {year_range(y)}")
    row["world"] = count(f"applicationMetaData.cpcClassificationBag:{CPC} AND {year_range(y)}")
    row["ohio_all"] = count(f"{GEO}.geographicRegionCode:OH AND {year_range(y)}")
    for c in CITIES:
        row[c.lower()] = count(f"{GEO}.cityName:{c} AND "
                               f"applicationMetaData.cpcClassificationBag:{CPC} AND "
                               f"{year_range(y)}")
    rows.append(row)
    print(f"  {y}  ohio {row['ohio']:>5}  " +
          "  ".join(f"{c.lower()} {row[c.lower()]:>4}" for c in CITIES) +
          ("" if row["complete"] else "   (incomplete: publication lag)"))

# The two bases, so the page can print the gap rather than pick a side.
both = {
    "by_inventor": count(f"{GEO}.geographicRegionCode:OH AND "
                         f"applicationMetaData.cpcClassificationBag:{CPC}"),
    "by_applicant": count("applicationMetaData.applicantBag.correspondenceAddressBag."
                          f"geographicRegionCode:OH AND "
                          f"applicationMetaData.cpcClassificationBag:{CPC}"),
}

complete = [r for r in rows if r["complete"]]
out = {
    "meta": {
        "source": "USPTO Open Data Portal, patent applications search, api.uspto.gov",
        "row": "one filing year: how many patent applications in CPC C08 carry an inventor "
               "correspondence address in Ohio, and in each of the four metro anchor cities.",
        "unit": "APPLICATIONS filed, not patents granted.",
        "geography": "inventor correspondence address, by state code and by city name. This "
                     "is NOT the PIC-12 county footprint: the filing carries a city and no "
                     "county, so the four cities are anchors and never a regional total.",
        "cpc": "C08, organic macromolecular compounds. One defensible definition of polymer "
               "and a choice, like every code choice on this site.",
        "lag": f"An application publishes about eighteen months after filing, so filing "
               f"years after {LAST_COMPLETE} are undercounted by construction. They are "
               f"fetched and flagged rather than dropped so the shape of the lag is visible.",
        "address_is_not_a_lab": "The first record this script returned was assigned to an "
                                "Akron company with the inventor resident in Luxembourg.",
        "fetched": time.strftime("%Y-%m-%d"),
        "last_complete_year": LAST_COMPLETE,
    },
    "rows": rows,
    "bases": both,
    "trend_complete_years": {
        "first": complete[0]["year"], "last": complete[-1]["year"],
        "first_value": complete[0]["ohio"], "last_value": complete[-1]["ohio"],
        "pct_change": round((complete[-1]["ohio"] / complete[0]["ohio"] - 1) * 100, 1),
    },
}
p = os.path.join(WEB, "_data", "patents.json")
json.dump(out, open(p, "w", encoding="utf-8"), indent=1)
# The page reads its own copy, per house convention: every page renders from its own
# data/ directory so a page and its claims always see the same file.
pd = os.path.join(WEB, "patents", "data")
os.makedirs(pd, exist_ok=True)
json.dump(out, open(os.path.join(pd, "patents.json"), "w", encoding="utf-8"), indent=1)
print(f"\nwrote {p}")
t = out["trend_complete_years"]
print(f"  Ohio polymer filings {t['first']}-{t['last']}: {t['first_value']} to "
      f"{t['last_value']}, {t['pct_change']}%")
print(f"  by inventor address {both['by_inventor']:,} against by applicant "
      f"{both['by_applicant']:,}: the same question asked two ways")
