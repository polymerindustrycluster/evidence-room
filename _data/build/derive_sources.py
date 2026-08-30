"""Build sources/data/registry.json — the public replication guide’s own dataset.

WHAT IT ADDS
  A page-shaped rendering of _data/SOURCES.json and _data/catalog.json, plus the worked
  numbers the guide teaches from: the concentration recipe’s own reading, the three
  classifications this site has to choose a subject inside (industry, occupation,
  education) and what moving the education boundary costs, the industry-code hierarchy
  and what adding a family to its own children costs, the disclosure rates behind the
  suppression lesson, how far these series revise after they are published, and the
  dependency structure of which source feeds which page.

  IT IS GENERATED BECAUSE A TYPED COPY DRIFTS. Fourteen sources, sixty filter lines and
  sixteen pages of dependency are exactly the kind of table a person retypes once and
  never updates; every hand-typed inventory on this site has gone stale inside a week,
  which is why derive_index.py exists at all. The registry is already maintained by
  verify_consistency.py, so a page generated from it stays true by construction.

WHAT ONE ROW IS
  One row of `sources` is one dataset in the registry: its endpoint, the exact filter
  values applied to it, whether it needs a key, how you actually get it, its licence,
  and every page here that rests on it. One row of `pages` is one artifact and the
  sources it rests on, which is the same relation read the other way.

  `codes` is one NAICS code as this site uses it, with its parent, its plain-English
  name, and the 2025 employment the wages page publishes for it across the twelve
  counties. `doublecount` is the arithmetic of adding a family to its own parts.

TRAPS
  - THE ROUTE IS DERIVED, NOT DECLARED. SOURCES.json has no "how do I get this" field,
    so `route` is classified from the URL shape. The rule is published on the page and
    stated in meta.definition, because a derived label that reads as a fact is the
    defect this whole site is about. Order matters: a null URL is checked first, then a
    file extension or directory path, then an /api/ segment. BLS QCEW’s endpoint
    contains BOTH "/api/" and ".csv" and it is a bulk CSV slice, so extension wins.
  - THE PLAIN-LANGUAGE LINES ARE EDITORIAL AND HAND-AUTHORED, harvested from the glosses
    the pages already carry. They are checked for completeness at build time and the
    build fails if a source is missing one, because a registry that silently drops the
    "what it cannot tell you" line drops the most useful line on the page.
  - THE DOUBLE-COUNT FIGURES COME FROM wages/data/wages.json, not from this file. If
    that page’s data is refetched, these move, and the claims on sources/ are meant to
    fail rather than quietly disagree with the page they were learned from.
  - 326 IS NOT ALWAYS 3261 + 3262 ACROSS COUNTIES. Within a county where all three are
    published it is, to rounding; across the footprint the parts are disclosed in fewer
    counties than the family, so the part rows sum to less. That is disclosure, not
    arithmetic, and the page says so.
"""
import json
import os
import re

from footprints import PIC12, NEO14

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))

FETCHED = "2026-08-29"


def median(values):
    """The statistic this page's second recipe is about, so it is defined once here."""
    v = sorted(values)
    n = len(v)
    if not n:
        raise SystemExit("derive_sources: median of an empty set")
    return v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2


def weighted_median(pairs):
    """Median of a population, each row carrying a weight. The row where the running
    weight first reaches half the total, which is a DIFFERENT row from the middle of the
    list whenever the heavy rows sit to one side. That difference is the lesson."""
    v = sorted(pairs, key=lambda t: t[0])
    half = sum(w for _, w in v) / 2
    run = 0.0
    for value, w in v:
        run += w
        if run >= half:
            return value
    raise SystemExit("derive_sources: weighted median fell off the end")


def load(*parts):
    with open(os.path.join(*parts), encoding="utf-8") as fh:
        return json.load(fh)


# ------------------------------------------------------------------ how you get it
ROUTES = {
    "internal": "internal record, no endpoint",
    "bulk": "bulk file download",
    "api": "API request",
    "portal": "web portal query",
}


def route_of(src):
    """Classify the access route from the endpoint’s shape. See TRAPS."""
    url = src.get("url")
    if not url:
        return "internal"
    path = url.split("?")[0]
    if re.search(r"\.(csv|gz|zip|txt|xlsx?)$", path, re.I):
        return "bulk"
    if "/api/" in path or re.match(r"https?://api\.", path, re.I):
        return "api"
    if path.endswith("/"):
        return "bulk"
    return "portal"


def licence_of(src):
    """The only licence this registry records is the one the SOURCE states. Nothing is
    inferred, and nothing is guessed from the agency.

    TWO SOURCES STATE ONE, and the second was missed for a fortnight because this
    function only knew how to see a Creative Commons string. O*NET is CC BY 4.0 and says
    so in prose inside its own filters. IPEDS reaches this site through the Urban
    Institute's Education Data Portal, and everything served through that portal is
    licensed to the user under ODC-By 1.0, which also requires attribution — a licence
    that does not contain the letters "CC BY" and so was invisible to the old regex while
    the page went on printing "exactly one states a licence". An explicit `licence` field
    is now read first, precisely so a licence that does not look like the one we expected
    cannot go unrecorded again.

    The federal statistical series state TERMS rather than a licence (public domain,
    citation requested), which is a different thing and is carried in `terms`. Recording
    them as licences would be this file asserting law rather than reading the register.
    """
    stated = src.get("licence")
    if stated:
        return stated
    m = re.search(r"CC BY[- ]([\d.]+)", json.dumps(src), re.I)
    return f"CC BY {m.group(1)}" if m else None


# --------------------------------------------------- what it is, in plain language
# Harvested from the glosses the pages already carry, so the site says one thing.
# Every source needs all three; the build fails below if one is missing.
PLAIN = {
 "qcew": {
  "is": "A census, not a survey. It counts every job covered by unemployment insurance, "
        "from returns employers already have to file, so it carries no sampling error and "
        "no margin of error to report.",
  "good": "Jobs, establishment counts and average weekly wages, by county and by industry "
          "code, quarterly and as annual averages, back to 1990.",
  "cannot": "It cannot see the self-employed, most farm labour, or anyone outside the "
            "insurance system, and it withholds any cell where too few employers would be "
            "identifiable. Its wage is an average per covered job: not a salary, not per "
            "person, and it moves with hours and occupational mix as well as with pay."},
 "qwi": {
  "is": "A quarterly panel built from the same state employment records, following jobs "
        "rather than counting them once: hires, separations and the earnings of jobs that "
        "persist from one quarter to the next.",
  "good": "How much hiring and separating sits behind a flat job count, and what a stable "
          "job pays.",
  "cannot": "It restates its own history when the programme re-benchmarks, so a figure "
            "pulled today is not necessarily the figure published last year, and no "
            "archive of past vintages is fetched anywhere in this build. EarnBeg counts "
            "only workers who were already at the same employer the quarter before."},
 "lodes": {
  "is": "A count of JOBS, each one linking the census block where the job is to the block "
        "where its holder’s address is on file. LODES8 is the current vintage and JT00 is "
        "the segment meaning all jobs in all sectors.",
  "good": "Where the people who work in a place live, and the reciprocal: where the people "
          "who live in a place work.",
  "cannot": "It is not a commute. Nothing in it counts a trip, and the home end is a "
            "residence on file rather than evidence that anyone travelled. It carries no "
            "industry dimension at all, so a polymer-only version of a labour shed cannot "
            "be built from it."},
 "ipeds": {
  "is": "The federal record of every degree and certificate conferred by every institution "
        "that takes federal student aid, filed by six-digit programme code.",
  "good": "Counting the graduates of named programmes at named institutions, year by year, "
          "against the same programmes nationally.",
  "cannot": "It counts people finishing a programme, never people hired and never people "
            "who stayed in the region. A programme code returning zero at every "
            "institution in every year is far more likely to be a bad code than a real "
            "absence of graduates."},
 "bea_rpp": {
  "is": "A price level rather than a price: an index with the national average set to 100, "
        "saying what a fixed basket costs in one metropolitan area against another.",
  "good": "Turning a nominal wage into what it actually buys where it is earned.",
  "cannot": "It is published for metropolitan areas, which neither nest inside nor tile a "
            "county footprint. Three metros that overlap a twelve-county region cannot be "
            "added into a figure for that region."},
 "fred": {
  "is": "The St Louis Fed’s distribution of federal price series: producer price indexes "
        "and commodity spot prices, served from one API under one key.",
  "good": "Following what a feedstock, a resin or a finished good costs over time, on a "
          "common base you choose.",
  "cannot": "Index levels are not dollars, and producer prices are not consumer prices. "
            "Nothing arrives deflated, so a rise you have not divided by a price index is "
            "a cash figure and needs saying so."},
 "oews": {
  "is": "A survey of employers about which occupations they employ and what they pay, "
        "published as one snapshot a year for metropolitan areas.",
  "good": "What a named occupation pays where the work is, against the same occupation "
          "nationally.",
  "cannot": "One vintage is a level and never a trend: methods and area definitions change "
            "between years. Its top code is a ceiling rather than a value, and a starred "
            "or hashed cell is unknown, never zero."},
 "oews_national": {
  "is": "The same survey’s national file, the benchmark half of the metro comparison.",
  "good": "Giving a local wage something to be measured against that was collected the "
          "same way.",
  "cannot": "It is all industries at once, so a national occupational wage is not the wage "
            "that occupation gets inside one industry. Some occupations appear as both a "
            "broad and a detailed row with identical values; keep one."},
 "usaspending": {
  "is": "The Treasury’s public record of federal awards: contracts, grants and other "
        "obligations, filed by the agency that made them.",
  "good": "How much federal money is obligated to work performed in a place, cut by "
          "industry code and fiscal year.",
  # THE NSF LESSON BELONGS ON THIS LINE and was missing from it. This site printed
  # $160M for one NSF Engine award on one page and $14,999,983 for the same award on
  # another, an order of magnitude apart, because a programme ceiling and an initial
  # obligation are different quantities and an announcement quotes whichever is larger.
  # A guide that teaches this source has to teach that before a replicator repeats it.
  "cannot": "An obligation is money legally committed, not cash spent, and place of "
            "performance is a field the award reports rather than an observation of where "
            "the work happened. An industry-code filter cannot see a university or a "
            "research institute, which file under entirely different codes. It also "
            "cannot tell you a programme ceiling: an award record carries what is "
            "obligated, a press release usually quotes a multi-year maximum, and this "
            "site once printed the two for the same award on two pages, $160M against "
            "$14,999,983, before a reader found them side by side."},
 "public_record": {
  "is": "A hand-compiled register of dated public milestones, merged from operational "
        "reports, funding files and primary press, with a source for every date.",
  "good": "Placing a designation, an award or an opening on a timeline that someone else "
          "can check event by event.",
  "cannot": "There is no endpoint and no script: it can be re-read but not re-fetched. "
            "Only events recorded as public appear, so the record of which dates slipped "
            "is deliberately absent from it."},
 "heritage_register": {
  "is": "An internal register of what the region invented and what changed its capacity, "
        "of which only the rows its own index marks PROVEN are published.",
  "good": "Naming a first, or a capability, with a public source attached to it.",
  "cannot": "The register is internal and its builder cannot be run from a public clone, "
            "so the shipped file is the artifact rather than a reproducible output. Every "
            "published row carries its own public sources instead."},
 "onet_education": {
  "is": "The Labor Department’s occupational database, which describes what a job requires "
        "instead of counting how many of them there are. It is licensed CC BY 4.0 and the "
        "licence requires attribution wherever it is used.",
  "good": "The level of education people in an occupation report, and the job zone the "
          "database assigns it.",
  "cannot": "It is national and has no state or metro cut. It describes an occupation "
            "everywhere, not that occupation here, and a merged reference row can hide a "
            "distinction the raw scale makes."},
 "nem": {
  "is": "The projection of which occupations an industry is made of, published as an "
        "industry-by-occupation matrix with a base year and a projected year.",
  "good": "Saying what mix of jobs an industry runs on, and how that mix is expected to "
          "change over ten years.",
  "cannot": "It is national only. No state or metro cut exists, so any regional headcount "
            "built from it is a synthetic estimate resting on an assumption that has to be "
            "stated in the same sentence as the number."},
 "odjfs": {
  "is": "Ohio’s own long-term employment projections, published as spreadsheets by region "
        "and by occupation rather than through any API.",
  "good": "A state agency’s view of where an industry and its occupations are headed "
          "inside Ohio, at a geography federal files do not offer.",
  "cannot": "A projection is a modelled path with no confidence band, and it historically "
            "under-calls turning points. Two of this site’s three register codes are "
            "published only inside wider bundles, so the register cannot be rebuilt from "
            "it."},
}

# A short name for the dependency chart. EDITORIAL STRINGS, hand-authored, because the
# alternative is truncating a name in drawing code and shipping "O*NET 30.3 database:
# Occupation Data, Job Zones, Job Zone Refe...". Every registry key needs one; the build
# fails below if a source is added without it.
SHORT = {
    "qcew": "QCEW employment and wages",
    "usaspending": "USAspending awards",
    "ipeds": "IPEDS degree completions",
    "fred": "FRED price series",
    "odjfs": "Ohio LMI projections",
    "public_record": "PIC public record",
    "bea_rpp": "BEA regional price parities",
    "heritage_register": "NEO Polymer Wins register",
    "lodes": "LEHD LODES8 origin-destination",
    "nem": "BLS National Employment Matrix",
    "oews": "OEWS metro wages",
    "oews_national": "OEWS national wages",
    "onet_education": "O*NET education levels",
    "qwi": "Census QWI workforce indicators",
}

# The plain-English name and the parent of every code this site uses. The employment
# beside each one is read from the wages page’s own shipped file, never typed here.
# The third element is the SHORT name a chart callout uses, because the full one runs a
# reading off a 390px screen and truncating it in drawing code is the house code smell.
CODE_NAMES = {
    "325": ("Chemical manufacturing", None, "chemicals"),
    "3252": ("Resins, synthetic rubber and fibres", "325", "resins"),
    "3255": ("Paints, coatings and adhesives", "325", "paints and coatings"),
    "326": ("Plastics and rubber products", None, "plastics and rubber"),
    "3261": ("Plastics products", "326", "plastics products"),
    "3262": ("Rubber products", "326", "rubber products"),
}
# The measurement register: what PIC counts as its own cluster. A judgement, not a fact.
REGISTER = ("3252", "3255", "326")


def build():
    reg = load(WEB, "_data", "SOURCES.json")
    cat = load(WEB, "_data", "catalog.json")
    by_art = reg["by_artifact"]
    raw = reg["sources"]

    missing = [k for k in raw if k not in PLAIN or k not in SHORT or
               not all(PLAIN.get(k, {}).get(f) for f in ("is", "good", "cannot"))]
    if missing:
        raise SystemExit(
            "derive_sources: no plain-language gloss or short name for " +
            ", ".join(missing) +
            ". Every source needs what it is, what it is good for, and what it cannot "
            "tell you; the third is the most useful line on the page and the build "
            "refuses to publish a registry that has silently dropped one.")

    sources = []
    for key, s in raw.items():
        pages = sorted(a for a, keys in by_art.items() if key in keys)
        route = route_of(s)
        sources.append({
            "key": key,
            "name": s["name"],
            "short": SHORT[key],
            "agency": s["agency"],
            "url": s.get("url"),
            "docs": s.get("docs"),
            "script": s.get("script"),
            "key_required": bool(s.get("key_required")),
            "route": route,
            "route_label": ROUTES[route],
            "licence": licence_of(s),
            "licence_url": s.get("licence_url"),
            "attribution": s.get("attribution"),
            "terms": s.get("terms"),
            "is": PLAIN[key]["is"],
            "good": PLAIN[key]["good"],
            "cannot": PLAIN[key]["cannot"],
            "filters": [[k, v] for k, v in (s.get("filters") or {}).items()],
            "pages": pages,
            "n_pages": len(pages),
        })
    sources.sort(key=lambda r: (-r["n_pages"], r["key"]))

    pages = sorted(({"slug": a, "sources": sorted(ks), "n_sources": len(ks)}
                    for a, ks in by_art.items()),
                   key=lambda r: (-r["n_sources"], r["slug"]))

    routes = {}
    for r in sources:
        routes[r["route"]] = routes.get(r["route"], 0) + 1

    totals = {
        "n_sources": len(sources),
        "n_pages": len(pages),
        "n_key_required": sum(1 for r in sources if r["key_required"]),
        "key_sources": sorted(r["key"] for r in sources if r["key_required"]),
        "n_no_endpoint": sum(1 for r in sources if r["route"] == "internal"),
        "no_endpoint_sources": sorted(r["key"] for r in sources if r["route"] == "internal"),
        "n_filter_lines": sum(len(r["filters"]) for r in sources),
        "routes": routes,
        "n_licensed": sum(1 for r in sources if r["licence"]),
        "licensed_sources": sorted(r["key"] for r in sources if r["licence"]),
        "n_terms": sum(1 for r in sources if r["terms"]),
        "n_public": sum(1 for r in sources if r["route"] != "internal"),
        "most_used": sources[0]["key"],
        "most_used_pages": sources[0]["n_pages"],
        "n_single_source_pages": sum(1 for p in pages if p["n_sources"] == 1),
        "single_source_pages": sorted(p["slug"] for p in pages if p["n_sources"] == 1),
        "n_build_scripts": len(cat.get("scripts", [])),
        "catalog_generated": cat.get("meta", {}).get("generated"),
    }

    # ------------------------------------------------- the industry-code decision
    W = load(WEB, "wages", "data", "wages.json")
    rows = [r for r in W["latest_rows"] if r.get("vs_local_all")]
    emp = {}
    npairs = {}
    for r in rows:
        emp[r["naics"]] = emp.get(r["naics"], 0) + r["emp"]
        npairs[r["naics"]] = npairs.get(r["naics"], 0) + 1
    families = [c for c, v in CODE_NAMES.items() if v[1] is None]
    parts = [c for c, v in CODE_NAMES.items() if v[1] is not None]

    codes = []
    for c, (label, parent, short) in CODE_NAMES.items():
        codes.append({"code": c, "name": label, "short": short, "parent": parent,
                      "level": "family" if parent is None else "part",
                      "in_register": c in REGISTER,
                      "emp": round(emp.get(c, 0)),
                      "pairings": npairs.get(c, 0)})
    codes.sort(key=lambda r: (r["parent"] or r["code"], r["code"]))

    column_sum = round(sum(emp.values()))
    once = round(sum(emp[c] for c in families))
    doubled = round(sum(emp[c] for c in parts))
    register_sum = round(sum(emp[c] for c in REGISTER))
    doublecount = {
        "rows": len(rows),
        "family_rows": sum(npairs[c] for c in families),
        "column_sum": column_sum,
        "once_counted": once,
        "doubled": doubled,
        "factor": round(column_sum / once, 2),
        "register_sum": register_sum,
        "unsplit_chemistry": round(emp["325"] - emp["3252"] - emp["3255"]),
        "year": W["meta"]["latest"],
    }

    # -------------------------------------------------- the concentration recipe
    # The worked reading the recipe lands on, and the fragile one beside it. Both are
    # rows of the wages page’s own shipped file, so a reader who re-pulls QCEW for that
    # county and that code should land on the same figure.
    lq_rows = [r for r in rows if r.get("lq")]
    worked = max((r for r in lq_rows if r["naics"] == "326"), key=lambda r: r["emp"])
    fragile = max(lq_rows, key=lambda r: r["lq"])
    lq = {
        "worked": {"county": worked["name"], "area": worked["area"],
                   "naics": worked["naics"],
                   "label": worked["label"], "short": CODE_NAMES[worked["naics"]][2],
                   "lq": worked["lq"],
                   "emp": round(worked["emp"]), "year": W["meta"]["latest"]},
        "fragile": {"county": fragile["name"], "naics": fragile["naics"],
                    "label": fragile["label"], "short": CODE_NAMES[fragile["naics"]][2],
                    "lq": fragile["lq"],
                    "emp": round(fragile["emp"])},
        "n_readings": len(lq_rows),
        "n_above_one": sum(1 for r in lq_rows if r["lq"] > 1),
    }

    # ------------------------------------------- what basis that reading is actually on
    # THE PAGE FAILED ITS OWN ACCEPTANCE TEST HERE. It told a reader to hold ownership
    # constant across all four numbers, which is the intuitive rule and is not the rule
    # BLS uses. A reviewer with no repo access followed it exactly and landed on 3.123
    # against the 3.27 published above. Both are arithmetically correct; they are
    # different measures, and only one of them is a location quotient as the bureau
    # defines it. So the page now prints BOTH, derived here rather than argued in prose.
    #
    # The recomputation is also the guard. `worked_example` is six numbers read off two
    # BLS files by hand, which is exactly the kind of typed block that rots, so it is
    # never trusted: BLS's basis is recomputed from those six and checked against the
    # location quotient the pay page ships for the same cell. Disagree by more than
    # half of the last digit the bureau prints and the build stops here.
    we = reg["worked_example"]
    li, lt0, lt5 = (we["local_industry_private"],
                    we["local_all_industry_all_ownerships"],
                    we["local_all_industry_private"])
    ni, nt0, nt5 = (we["national_industry_private"],
                    we["national_all_industry_all_ownerships"],
                    we["national_all_industry_private"])
    bls_basis = (li / lt0) / (ni / nt0)
    same_basis = (li / lt5) / (ni / nt5)
    cell = next((r for r in lq_rows if r["area"] == we["area_fips"]
                 and r["naics"] == we["naics"]), None)
    if cell is None:
        raise SystemExit(
            f"derive_sources: worked_example names {we['area_name']} {we['naics']} in "
            f"{we['year']} and the pay page publishes no such cell. The recipe is walking "
            "a reader to a row this site no longer prints.")
    if abs(bls_basis - cell["lq"]) > 0.005:
        raise SystemExit(
            f"derive_sources: the six components in SOURCES.json worked_example give "
            f"{bls_basis:.4f} on BLS's own basis, and the pay page publishes "
            f"{cell['lq']} for the same cell. The recipe would teach arithmetic that "
            "does not land on the number beside it. Re-read the two area files.")
    lq["basis"] = {
        "year": we["year"], "area": we["area_fips"], "county": we["area_name"],
        "naics": we["naics"], "read_on": we["read_on"], "rows": we["rows"],
        "local_industry_private": li,
        "local_all_industry_all_ownerships": lt0,
        "local_all_industry_private": lt5,
        "national_industry_private": ni,
        "national_all_industry_all_ownerships": nt0,
        "national_all_industry_private": nt5,
        "bls_basis": round(bls_basis, 4),
        "bls_basis_2dp": round(bls_basis, 2),
        "bls_published": we["bls_published_lq"],
        "same_basis": round(same_basis, 4),
        "same_basis_2dp": round(same_basis, 2),
        "gap_pct": round((same_basis - bls_basis) / bls_basis * 100, 1),
        "self_check": we["ownership_self_check"],
    }

    # WHICH OF THE TWO FIGURES DO WE ACTUALLY PRINT — decided by test, not by memory.
    # The concentration page ships both: `lq`, which it computes from components, and
    # `lq_published`, which is BLS's lq_annual_avg_emplvl column carried through so the
    # computed one can be checked. The pay page ships one number, and this page prints
    # the pay page's. They agree almost everywhere, which is the whole point of keeping
    # both, and 'almost' is what makes the question answerable: on a handful of cells the
    # two round apart, and the printed figure follows exactly one of them.
    LQP = load(WEB, "location-quotient", "data", "lq.json")
    ours = {(c["year"], c["area"], c["naics"]): c for c in LQP["cells"]}
    n_cmp = agree_pub = agree_own = 0
    for r in W["trend"]:
        c = ours.get((r["year"], r["area"], r["naics"]))
        if not c or r.get("lq") is None or c.get("lq") is None:
            continue
        n_cmp += 1
        agree_pub += abs(c["lq_published"] - r["lq"]) < 1e-9
        agree_own += abs(round(c["lq"], 2) - r["lq"]) < 1e-9
    if agree_pub != n_cmp:
        raise SystemExit(
            "derive_sources: the figure this page prints no longer matches BLS's own "
            f"column on {n_cmp - agree_pub} of {n_cmp} cells. The provenance sentence "
            "below it would be false. Re-derive before publishing.")
    lq["provenance"] = {
        "cells_compared": n_cmp,
        "match_bls_column": agree_pub,
        "match_our_recomputation": agree_own,
        "separating_cells": n_cmp - agree_own,
        "published_is": "bls_column",
        "our_value": round(cell["lq"], 4) if isinstance(cell.get("lq"), float) else cell["lq"],
        "our_value_full": ours[(we["year"], we["area_fips"], we["naics"])]["lq"],
        "residual": ours[(we["year"], we["area_fips"], we["naics"])]["residual"],
        "verification": LQP["meta"]["verification"],
    }
    # Every published reading, so the cold-open strip draws the distribution rather than
    # two called-out cases floating on an empty scale.
    readings = sorted(({"lq": r["lq"], "county": r["name"], "naics": r["naics"],
                        "emp": round(r["emp"])} for r in lq_rows),
                      key=lambda r: r["lq"])

    # ------------------------------------------------- three classifications, one job
    def cips(text):
        return [{"code": c, "name": n} for c, n in re.findall(r"(\d{6})\s*\(([^)]+)\)", text)]

    ip = raw["ipeds"]["filters"]
    core = cips(ip["CIP-6 core"])
    adjacent = cips(ip["CIP-6 adjacent"])
    O = load(WEB, "occupations", "data", "viz-data.json")
    deg = {}
    progs = {}
    for r in O["programs"]:
        g = "core" if r["group"] == "polymer" else "adjacent"
        deg[g] = deg.get(g, 0) + sum(r["by_year"].values())
        progs[g] = progs.get(g, 0) + 1
    years = sorted({y for r in O["programs"] for y in r["by_year"]})

    classification = {
        "naics": {"what": "industry", "n_codes": len(CODE_NAMES),
                  "n_register": len(REGISTER), "sources": sorted(
                      r["key"] for r in sources
                      if any("NAICS" in k or "industry" in k.lower()
                             for k, _ in r["filters"]))},
        "soc": {"what": "occupation", "n_codes": len(O["pay"]),
                "sources": ["oews", "oews_national", "onet_education", "nem"]},
        "cip": {"what": "education", "n_core": len(core), "n_adjacent": len(adjacent),
                "core": core, "adjacent": adjacent, "sources": ["ipeds"],
                "degrees_core": deg.get("core", 0),
                "degrees_adjacent": deg.get("adjacent", 0),
                "degrees_both": deg.get("core", 0) + deg.get("adjacent", 0),
                "programmes_core": progs.get("core", 0),
                "programmes_adjacent": progs.get("adjacent", 0),
                "lift_pct": round(deg.get("adjacent", 0) / deg.get("core", 1) * 100, 1),
                "first_year": int(years[0]), "last_year": int(years[-1])},
    }

    # -------------------------------------------------------------------- vintage
    # THE MOVE IS RECOMPUTED FROM THE TWO INDEX VALUES, not read off the stored `pct`.
    # That page printed 1.42 for its largest revision until 2026-08-28, because the
    # derived file rounds to three places (-1.415) and rounding that again gives 1.42,
    # while a reader dividing the two values it prints alongside gets 1.41. A guide that
    # tells a replicator to check our arithmetic has to do the division the same way
    # they would.
    RV = load(WEB, "revisions", "data", "revisions.json")
    moves = sorted(abs((p["latest"] - p["first"]) / p["first"] * 100)
                   for p in RV["periods"] if p.get("first"))
    n = len(moves)
    vintage = {
        "n_revised": len(RV["periods"]),
        "n_published": len({(r["series"], r["date"]) for r in RV["all"]}),
        "median_pct": round(moves[n // 2] if n % 2 else (moves[n // 2 - 1] + moves[n // 2]) / 2, 2),
        "max_pct": round(max(moves), 2),
        "n_series": len({r["series"] for r in RV["all"]}),
    }

    # ------------------------------------------------------------ suppression
    P = load(WEB, "peers", "data", "peers.json")
    supp = {}
    for level, v in P["visibility"].items():
        d, s = v["disclosed"], v["suppressed"]
        supp[level] = {"disclosed": d, "suppressed": s, "total": d + s,
                       "share": round(d / (d + s) * 100, 1)}
    # A DISCLOSURE RATE IS A VINTAGE, and the page never said which. A reviewer pulling
    # the newest by-industry file counted 724 of 1,839 counties against the 703 of 1,838
    # printed here and read it as an arithmetic disagreement. It is a year: BLS discloses
    # slightly differently every vintage and had published no metropolitan rows for the
    # newer year at all. Both figures now travel with their year attached.
    bi = reg["worked_example"]["by_industry_vintage"]
    if bi["published_year"] != P["meta"]["cross_year"]:
        raise SystemExit(
            f"derive_sources: the registry dates the disclosure rates to "
            f"{bi['published_year']} and the peers page built them from "
            f"{P['meta']['cross_year']}. The page would stamp the wrong vintage on the "
            "one chart whose whole lesson is that a blank is not a zero.")
    supp_vintage = dict(bi)

    # ----------------------------------- rebuild commands that do not run, by scanning
    # A guide is judged on whether its instructions work, so the one instruction this
    # repository prints most often gets checked rather than trusted: every page README
    # that says "python <something>.py" under a rebuild heading is tested against what
    # _data/build/ actually contains.
    have = {f for f in os.listdir(HERE) if f.endswith(".py")}
    missing_builders = []
    for slug in sorted(by_art):
        rp = os.path.join(WEB, slug, "README.md")
        if not os.path.isfile(rp):
            continue
        with open(rp, encoding="utf-8") as fh:
            named = re.findall(r"python\s+([A-Za-z0-9_]+\.py)", fh.read())
        for script in dict.fromkeys(named):
            if script not in have:
                missing_builders.append((slug, script))

    # ------------------------------------------- the gap we could not close, measured
    L = load(WEB, "laborshed", "data", "laborshed.json")
    top = L["external"]["top"]
    unnamed = [r for r in top if r["name"] == r["fips"]]

    gaps = [
        {"id": "county-names", "page": "laborshed",
         "what": "Twelve origin counties have no place name",
         "n": len(unnamed),
         "jobs": round(sum(r["jobs_2022"] for r in unnamed)),
         "why": "The two local footprints are named and numbered on this page, but these "
                "origins are anywhere in the country and no NATIONAL county "
                "FIPS-to-name crosswalk ships in this repository, so those rows print a "
                "five-digit code a reader cannot use.",
         "close": "Add a national county crosswalk to the build. LEHD publishes a "
                  "per-state geography crosswalk beside the LODES files, and the Census "
                  "gazetteer is the other option; check that whichever is chosen covers "
                  "out-of-state origins before wiring it in."},
        {"id": "award-parties", "page": "federal-money",
         "what": "No recipient names behind the procurement peaks", "n": None, "jobs": None,
         "why": "The USAspending endpoint used here returns categories rather than "
                "parties, so the page cannot say who holds the largest year.",
         "close": "A second pull against spending_by_award, or the bulk award archive, "
                  "keeping recipient_name and awarding_agency."},
        {"id": "qwi-vintages", "page": "revisions",
         "what": "No archive of past QWI releases", "n": None, "jobs": None,
         "why": "The programme restates whole histories when it re-benchmarks, and "
                "nothing in this build fetches an earlier vintage, so how far those "
                "restatements move a published number is unmeasured here.",
         "close": "One stored file per historical release. The live API serves only the "
                  "latest recomputation, so this has to be collected going forward."},
        {"id": "price-derivation", "page": "cost-scissors",
         "what": "One derivation step is missing from the build", "n": None, "jobs": None,
         "why": "The step that turns the fetched price series into that page’s shipped "
                "file is not present in _data/build/, so the page’s data is a frozen "
                "derived artifact rather than a reproducible one.",
         "close": "Restore the derivation script, and have it emit the meta prose the "
                  "page’s methodology box renders."},
        # FOUND BY LOOKING RATHER THAN BY REMEMBERING. Several page READMEs print a
        # "Rebuild the data" command, and a replication guide is exactly the page that
        # has no business printing a command nobody can run. The set is scanned below
        # rather than typed, because a typed list of missing files is the one kind of
        # list that goes stale the moment somebody fixes one.
        {"id": "rebuild-commands", "page": "several", "n": len(missing_builders),
         "jobs": None, "unit": "pages",
         "what": "Some pages name a rebuild script that is not in this repository",
         "why": "The " + ("page README that names " if len(missing_builders) == 1 else
                          "page READMEs that name ") +
                ", ".join(sorted({m[1] for m in missing_builders})) +
                " tell a reader to run a file _data/build/ does not contain, so those "
                "pages ship a derived artifact that cannot be regenerated from this "
                "clone. The fetch scripts behind them are all present; it is the "
                "derivation step that is absent. Named here because a rebuild command "
                "that fails is worse than none: it reads as reproducibility.",
         "close": "Ship the derivation scripts, or change those READMEs to say the "
                  "shipped file is the artifact, the way the two internal registers in "
                  "the register above already do."},
        {"id": "cleveland-trend", "page": "peers",
         "what": "One peer metro has no time series", "n": None, "jobs": None,
         "why": "Cleveland clears the size test and fails the disclosure test: it does "
                "not carry enough disclosed years to draw a line, so it appears as a "
                "single ghosted point with the absence labelled.",
         "close": "Re-fetch that metro’s industry series year by year, recording each "
                  "year’s disclosure code so the number of withheld years can be "
                  "published rather than deduced."},
    ]

    meta = {
        "source": "This page’s own dataset is _data/SOURCES.json (the source registry) and "
                  "_data/catalog.json (the generated inventory of build scripts), joined "
                  "to five shipped page files: wages for the concentration reading and the "
                  "industry-code arithmetic, occupations for the education-boundary "
                  "example, peers for the disclosure rates, revisions for how far these "
                  "series move after publication, and laborshed for the measured gap.",
        "row": "One row of the register is one dataset: its endpoint, the exact filter "
               "values applied to it, whether it needs a key, and every page here that "
               "rests on it.",
        "fetched": FETCHED,
        "definition": "How you get it is DERIVED from the endpoint’s shape, not declared "
                      "in the registry, and the four tests run IN THIS ORDER: no "
                      "endpoint at all is an internal record; then a URL ending in a "
                      "file extension is a bulk download; then a URL with an api path "
                      "segment is an API request; then a URL ending in a directory is a "
                      "bulk download; and anything left is a portal query. The order is "
                      "printed because it decides the answer rather than describing it: "
                      "two of these endpoints end in a directory AND carry an api "
                      "segment, and reading the tests in a different order relabels "
                      "them. The rule is on the page so a reader can disagree with a "
                      "label rather than inherit it.",
        "why": "The register lists only the sources behind the analyses published in this "
               "repository. The internal series has more pages and more sources, and "
               "their absence is stated rather than left to be discovered.",
        "scope": "This page hands over method, not data. It does not republish any source, "
                 "and following it will not give you these numbers: it will give you the "
                 "same numbers for your own region, which is the point.",
        "not": "A licence and a set of terms are different things and the register keeps "
               "them apart. Two sources state a LICENCE that conditions use: O*NET is "
               "CC BY 4.0 and IPEDS reaches this site through the Urban Institute’s "
               "portal under ODC-By 1.0. Both require attribution, and both credits are "
               "printed in this page’s footer with a link to the licence, because "
               "describing a licence is not complying with one. The federal statistical "
               "series state TERMS instead, which is public domain with a citation "
               "request, and "
               "those are quoted on each entry with the agency page they come from, "
               "rather than left as an implication that no term exists.",
        "caution": "Two of the fourteen sources have no endpoint and no script. They are "
                   "internal records, the published file is the artifact, and nothing on "
                   "this site can make them fetchable.",
    }

    # ------------------------------------------------------ the sets, actually listed
    # A REPLICATION GUIDE THAT SAYS "twelve counties" AND "twenty-six occupation codes"
    # WITHOUT LISTING THEM has told a reader the size of a decision, not the decision. A
    # reviewer working from the rendered page alone could enumerate about five of the
    # eleven values they would need to change for their own region; the twelve counties
    # and the twenty-six SOC codes were two of the missing six, and both were one join
    # away from a file this page already reads.
    footprint = dict(W["meta"]["footprint"])
    if len(footprint["counties"]) != footprint["n"]:
        raise SystemExit("derive_sources: the footprint's own count and its own list "
                         "disagree, which is the defect this listing exists to prevent.")
    # A NAME IS NOT A FILTER. A replication reviewer working from the rendered page on
    # 2026-08-30 rebuilt this page's target number from BLS and still had to leave the
    # site, because the twelve counties were NAMED here and the filter line pointed at
    # footprints.py, a file no reader of this page can open. The codes are joined from
    # that same module rather than typed in, so the printed list cannot drift from the
    # one the fetch scripts actually send.
    # Named fips_table, not codes: this module already binds `codes` to the NAICS, SOC
    # and CIP classification list, and the first draft of this block shadowed it and
    # shipped the county table into the page's classification section instead.
    fips_table = {"pic12": PIC12, "neo14": NEO14}.get(footprint["key"])
    if fips_table is None:
        raise SystemExit(f"derive_sources: no code table for footprint "
                         f"{footprint['key']!r}, so the page would name counties it "
                         "cannot number.")
    by_name = {v: k for k, v in fips_table.items()}
    absent = [c for c in footprint["counties"] if c not in by_name]
    if absent:
        raise SystemExit(f"derive_sources: no FIPS code for {absent}. The page would "
                         "print a county the build cannot address.")
    footprint["counties"] = [{"name": c, "fips": by_name[c]}
                             for c in footprint["counties"]]
    socs = sorted(({"soc": r["soc"], "occupation": r["occupation"]} for r in O["pay"]),
                  key=lambda r: r["soc"])
    if len(socs) != classification["soc"]["n_codes"]:
        raise SystemExit(f"derive_sources: {len(socs)} occupation codes listed against "
                         f"{classification['soc']['n_codes']} counted. The page would "
                         "state a number and print a different set under it.")

    # ------------------------------------------------------ attribution, not description
    # TWO LICENCES ON THIS PAGE ARE CONDITIONS OF USE rather than courtesies, and both
    # were failing. O*NET requires the registered-trademark symbol and a LINK to the
    # licence, and the footer was being set with textContent, so there was no link on the
    # page at all. IPEDS reaches this site through the Urban Institute's portal under
    # ODC-By, which requires a citation naming the portal version and the access date,
    # and the page printed nothing and told the reader only one source was licensed.
    #
    # The required elements are ASSERTED here rather than trusted, because an attribution
    # that is nearly right is not compliance and reads exactly like compliance.
    attributions = []
    for s in sources:
        if not s["attribution"]:
            continue
        if not s["licence_url"]:
            raise SystemExit(f"derive_sources: {s['key']} states a licence and an "
                             "attribution but no licence URL to link to, and both "
                             "licences on this page require the link.")
        attributions.append({"key": s["key"], "name": s["name"], "short": s["short"],
                             "licence": s["licence"],
                             "licence_url": s["licence_url"], "text": s["attribution"]})
    licensed = [s["key"] for s in sources if s["licence"]]
    if sorted(a["key"] for a in attributions) != sorted(licensed):
        raise SystemExit(
            "derive_sources: " + ", ".join(sorted(set(licensed) -
                                                  {a['key'] for a in attributions})) +
            " states a licence and carries no attribution. Both licences in this "
            "registry require one, so a described licence with no credit printed is the "
            "one defect on this page that is not merely embarrassing.")
    onet = next((a for a in attributions if a["key"] == "onet_education"), None)
    if onet and ("O*NET®" not in onet["text"] or "USDOL/ETA" not in onet["text"]):
        raise SystemExit("derive_sources: the O*NET credit must display the registered "
                         "trademark symbol on the mark and name USDOL/ETA.")

    # ================================================================ RECIPE 2, THE PAY
    # WHAT THE MEDIAN IS OVER. The pay page said "the typical polymer job pays 1.2 times"
    # when the figure was a median over ROWS, and its heaviest rows sit below it. Both
    # statistics are defensible; only one matches that sentence. A replicator computes the
    # row median first, because it is the easy one, and will write the job sentence over
    # it unless someone says so out loud.
    #
    # Every number below is read from the pay page's own shipped file, so this recipe
    # cannot teach a value that page has stopped publishing.
    WG = load(WEB, "wages", "data", "wages.json")
    pay_rows = [r for r in WG["latest_rows"] if r.get("vs_local_all")]
    pay_naics = sorted({r["naics"] for r in pay_rows})
    pay_counties = sorted({r["name"] for r in pay_rows})

    # The group cover: 325 and 326 taken once per county. The only complete
    # non-overlapping set the published data offer, so it is what a job weighting can run
    # over at all. Coarser than a pairing, and the page says so rather than implying the
    # two units are interchangeable.
    cover = [r for r in pay_rows if r["naics"] in ("325", "326")]
    med_pair = median([r["vs_local_all"] for r in pay_rows])
    med_job = weighted_median([(r["vs_local_all"], r["emp"]) for r in cover])
    if not med_job > med_pair:
        raise SystemExit(
            "derive_sources: the job-weighted median is no longer above the pairing "
            "median. The recipe's whole point is that the easy statistic is the LOWER "
            "one, so publishing the harder one cannot be read as flattering the finding. "
            "That sentence would now be backwards. Re-read before publishing.")

    # The single row that most moves the two apart: the heaviest one sitting below the
    # pairing median. Named on the page, because "the heavy rows are low" is an assertion
    # and this is the evidence for it.
    drag = max((r for r in pay_rows if r["vs_local_all"] < med_pair),
               key=lambda r: r["emp"])

    # Counted once per county at the finest detail published, which is the third unit and
    # the reason the page prints all three rather than picking one.
    def is_family(r):
        return ((r["naics"] == "325" and any(x["name"] == r["name"] and
                                             x["naics"] in ("3252", "3255") for x in pay_rows)) or
                (r["naics"] == "326" and any(x["name"] == r["name"] and
                                             x["naics"] in ("3261", "3262") for x in pay_rows)))
    dedup = [r for r in pay_rows if not is_family(r)]

    # WHAT THE JOB WEIGHTING IS OVER. Codex found, on a review of the shipped page, that
    # the 33,528-job cover is 325 + 326 while this same page declares the measurement
    # register to be 3252 + 3255 + 326 and calls 325 "context, not cluster". Both are
    # true and the coarser set is the only complete non-overlapping one the published
    # data offer, which is why the pay page uses it. But a recipe whose entire lesson is
    # NAME THE UNIT cannot leave its own population unnamed: nearly half those jobs are
    # outside the boundary the reader was given two sections earlier.
    register = ("3252", "3255", "326")
    outside = [r for r in cover if r["naics"] not in register]
    wage = {
        "year": WG["meta"]["latest"],
        "cover_naics": sorted({r["naics"] for r in cover}),
        "cover_outside_register": round(sum(r["emp"] for r in outside)),
        "register_naics": list(register),
        "register_jobs": round(sum(r["emp"] for r in pay_rows
                                   if r["naics"] in register)),
        "n_published": len(pay_rows),
        "n_industries": len(pay_naics),
        "n_counties": len(pay_counties),
        "n_possible": len(pay_naics) * len(pay_counties),
        "median_pairing": round(med_pair, 4),
        "median_job": round(med_job, 4),
        "n_above_local": len([r for r in pay_rows if r["vs_local_all"] > 1]),
        "n_below_us": len([r for r in pay_rows if r.get("vs_us") and r["vs_us"] < 1]),
        "median_vs_us": round(median([r["vs_us"] for r in pay_rows if r.get("vs_us")]), 4),
        "cover_rows": len(cover),
        "cover_jobs": round(sum(r["emp"] for r in cover)),
        "cover_jobs_above": round(sum(r["emp"] for r in cover if r["vs_local_all"] > 1)),
        "dedup_rows": len(dedup),
        "dedup_above": len([r for r in dedup if r["vs_local_all"] > 1]),
        "drag": {"county": drag["name"], "label": drag["label"],
                 "ratio": round(drag["vs_local_all"], 4), "emp": round(drag["emp"])},
        "measures": WG["meta"]["measures"],
        "caution": WG["meta"]["caution"],
    }

    # =============================================== RECIPE 3, THE LABOUR SHED, D2
    # THE SAME PLACE HAS TWO CORRECT TOTALS. This is the best teaching artifact on the
    # site: twelve counties hold 1,735,169 jobs counting a worker resident in any state
    # and 1,702,542 counting Ohio residents only. Both were labelled PIC-12 once. They
    # are not a discrepancy and neither is wrong; they answer different questions, and
    # the identity that joins them is the lesson, because a replicator pulling LODES will
    # produce one of the two without noticing there was a choice.
    LS = load(WEB, "laborshed", "data", "laborshed.json")
    BN = load(WEB, "laborshed", "data", "bench.json")
    T = LS["totals"]
    all_res = T["jobs_worked_in_pic12"]
    in_state = [r for r in BN["regions"] if r["kind"] == "footprint"]
    if len(in_state) != 1:
        raise SystemExit("derive_sources: the labour-shed benchmark no longer carries "
                         "exactly one footprint row, so the two-basis identity has no "
                         "second total to reconcile against.")
    in_state = in_state[0]["jobs_located"]
    inside = T["home_inside_pic12"]
    out_of_state = all_res - in_state

    # The identity, ASSERTED rather than described: the same jobs-held-from-inside figure
    # sits in both totals, and the two differ only by the out-of-state residents one
    # counts and the other does not. If this stops holding, the recipe is teaching a
    # reconciliation that no longer reconciles.
    if inside + (T["home_outside_pic12"] - out_of_state) != in_state:
        raise SystemExit(
            f"derive_sources: the two labour-shed bases no longer reconcile. "
            f"{inside:,} held from inside plus {T['home_outside_pic12'] - out_of_state:,} "
            f"in-state outside does not make {in_state:,}.")
    if inside + T["home_outside_pic12"] != all_res:
        raise SystemExit("derive_sources: the all-residents total is not its own parts.")

    ext = LS["external"][str(LS["meta"]["year"])]
    shed = {
        "year": LS["meta"]["year"],
        "state": "Ohio",
        "segment": "JT00",
        "all_residents": all_res,
        "in_state_only": in_state,
        "gap": out_of_state,
        "inside": inside,
        "outside_any_state": T["home_outside_pic12"],
        "outside_in_state": T["home_outside_pic12"] - out_of_state,
        "share_imported": T["share_imported"],
        # The three buckets partition the CLASSIFIED external jobs, which is 2,552 short
        # of the outside total. Carried as its own number rather than smoothed away: the
        # first draft of this recipe wrote "of the 210,890 ... 57,302 ... 61,708 ...
        # 89,328", implying a partition, and its own claim caught it. A recipe about
        # bases cannot round away a base it does not understand.
        "external_split": {"adjacent": ext["adjacent"], "distant": ext["distant"],
                           "other": ext["other"]},
        "external_classified": ext["adjacent"] + ext["distant"] + ext["other"],
        "external_unclassified": (T["home_outside_pic12"]
                                  - (ext["adjacent"] + ext["distant"] + ext["other"])),
        "no_industry": LS["meta"]["no_industry"],
        "not_a_commute": LS["meta"]["not_a_commute"],
        "row_is": LS["meta"]["row"],
    }

    # ================================================== NOMINAL AGAINST REAL, D4
    # THE BASIS DECISION, which this site shipped a whole page without making. Every
    # series on cost-scissors was nominal and the page never said so, across years in
    # which general prices rose a quarter, so "+40%" and "a record high" both read as
    # real gains. Three of that page's own readings change under deflation and one
    # reverses outright, which is the entire argument for stating a basis, made out of
    # the site's own mistake rather than a hypothetical.
    #
    # Recomputed here from that page's shipped table, with the same clamp it uses: the
    # CPI-U annuals stop at 2025, so a 2026 month is deflated by the 2025 average and
    # every real figure is therefore an upper bound on the price and a lower bound on
    # the adjustment.
    SC = load(WEB, "cost-scissors", "data", "scissors.json")
    DEF = SC["deflator"]
    cpi, base, last = DEF["values"], DEF["base_year"], DEF["latest_year"]

    def factor(year):
        return cpi[min(year, last)] / cpi[base]

    def series(label):
        hit = [x for x in SC["series"] if x["label"] == label]
        if len(hit) != 1:
            raise SystemExit(f"derive_sources: {len(hit)} series match {label!r} on the "
                             "cost page; the deflator recipe names exactly one.")
        return hit[0]

    def deflated(label):
        sx = series(label)
        nominal = sx["now"]["index"]
        real = nominal / factor(sx["now"]["date"][:4] if "date" in sx["now"] else "2026")
        peak = max((p["index"] / factor(p["date"][:4]), p["date"])
                   for p in sx["points"] if p["date"] >= base + "-01-01")
        cash_peak = max((p["index"], p["date"]) for p in sx["points"]
                        if p["date"] >= base + "-01-01")
        return {"label": label, "nominal": round(nominal, 1), "real": round(real, 1),
                "real_peak": peak[1], "cash_peak": cash_peak[1],
                "unit": sx.get("unit"), "stage": sx.get("stage")}

    product = deflated("PPI: plastics and rubber products manufacturing")
    resin = deflated("PPI: plastics material and resin manufacturing")
    if not (product["real"] < product["nominal"] and resin["real"] < resin["nominal"]):
        raise SystemExit("derive_sources: deflation is not reducing these indices, which "
                         "means the base year or the clamp has moved. The recipe teaches "
                         "that real is below cash over this window.")
    if product["real_peak"] == product["cash_peak"]:
        raise SystemExit(
            "derive_sources: the finished-product series now peaks in the same month on "
            "both bases. The recipe's worked example is that the peak MOVES, and it "
            "would be teaching a difference that no longer exists.")

    deflator = {
        "index": DEF["index"], "base_year": base, "latest_year": last,
        "source": DEF["source"], "caution": DEF["caution"],
        "cpi_base": cpi[base], "cpi_latest": cpi[last],
        "inflation_pct": round((cpi[last] / cpi[base] - 1) * 100, 1),
        "product": product, "resin": resin,
        "years": [{"year": y, "cpi": v, "factor": round(v / cpi[base], 4)}
                  for y, v in sorted(cpi.items())],
    }

    # ========================================== RECIPE 4, FEDERAL CONTRACTING, D5
    # WHAT A CODE FILTER CANNOT SEE. This recipe exists for one lesson the other three
    # cannot teach: an industry-coded view of federal money is blind to whole classes of
    # award BY CONSTRUCTION, and the blindness is invisible in the output. The worked
    # case is on this site: the $15M NSF Engine award to a university appears nowhere in
    # these NAICS rows, because a university files under 61xxxx and a research institute
    # under 5417xx. A replicator who filters by industry and reports a total has reported
    # a total of the awards their filter could see.
    #
    # Sequenced after D4 deliberately: this is the first recipe whose output is dollars
    # across years, so the basis decision has to exist before it.
    FM = load(WEB, "federal-money", "data", "federal.json")
    fm_rows = FM["naics"]
    fys = sorted({r["fy"] for r in fm_rows})
    by_fy = {}
    for r in fm_rows:
        by_fy[r["fy"]] = by_fy.get(r["fy"], 0) + r["amount"]
    partial = max(fys)
    closed = [y for y in fys if y != partial]
    by_code = {}
    for r in fm_rows:
        by_code[r["name"]] = by_code.get(r["name"], 0) + r["amount"]
    ranked = sorted(by_code.items(), key=lambda kv: -kv[1])

    if not all(("real" in r and "amount" in r) for r in fm_rows):
        raise SystemExit("derive_sources: the federal rows no longer carry both a nominal "
                         "and a real figure, and the recipe teaches reading them together.")

    contracting = {
        "first_fy": min(fys), "last_fy": partial, "n_years": len(fys),
        "closed_years": len(closed),
        "total_all": sum(by_fy.values()),
        "total_closed": sum(by_fy[y] for y in closed),
        "partial_fy_amount": by_fy[partial],
        "n_codes": len({r["code"] for r in fm_rows}),
        "top": [{"name": n, "amount": v} for n, v in ranked[:3]],
        "by_fy": [{"fy": y, "amount": by_fy[y]} for y in fys],
        "invisible": FM["meta"]["excludes"],
        "place_caution": FM["meta"]["caution"],
        "cpi_base": FM["cpi_base"],
    }

    # ============================================================ AWARD IDENTIFIERS, D3
    # THE ONLY SECTION THAT TEACHES A READER TO CHECK US. Its worked example is this
    # site's own worst published error: a programme ceiling read as an award value,
    # overstating a federal award by an order of magnitude, on a site whose premise is
    # checkability. It is printed rather than quietly corrected because the lookup that
    # catches it is the transferable part, and a guide that only shows its clean cases
    # teaches nothing about how the mistake is actually made.
    TL = load(WEB, "timeline", "data", "timeline.json")
    nsf = next((e for e in TL["events"] if e.get("awardId") == "2532460"), None)
    if nsf is None:
        raise SystemExit("derive_sources: NSF award 2532460 is no longer on the timeline, "
                         "so the award-lookup recipe has lost its worked example.")
    TH = load(WEB, "federal-money", "data", "techhub.json")
    leads = TH["leads"]
    if not all(l.get("awardId") for l in leads):
        raise SystemExit("derive_sources: an EDA lead carries no award identifier. The "
                         "recipe tells a reader to look each one up by id.")
    if sum(l["amount"] for l in leads) != TH["award"]:
        raise SystemExit(
            f"derive_sources: the seven EDA leads sum to "
            f"{sum(l['amount'] for l in leads):,} against a published award of "
            f"{TH['award']:,}. The recipe asks a reader to add the ids up and land on "
            "the total, and they would not.")

    CEILING = 160_000_000          # the figure this site printed; see _data/FIGURES.json
    awards = {
        "nsf": {
            "id": nsf["awardId"], "title": nsf["title"], "org": nsf["org"],
            "estimated_total": nsf["amount"], "obligated": nsf["obligated"],
            "obligated_basis": nsf["obligatedBasis"],
            "period_start": nsf["periodStart"], "period_end": nsf["periodEnd"],
            "award_date": nsf["awardDate"],
            "share_obligated": round(nsf["obligated"] / nsf["amount"], 4),
            "note": nsf["amountNote"], "source": nsf["amountSource"],
        },
        "error": {
            "printed": CEILING,
            "actual": nsf["amount"],
            "factor": round(CEILING / nsf["amount"], 1),
            "corrected_on": "2026-08-29",
        },
        "eda": {
            "agency": TH["agency"], "name": TH["name"], "total": TH["award"],
            "n": len(leads),
            "leads": [{"name": l["name"], "id": l["awardId"], "amount": l["amount"],
                       "funds": l["funds"]} for l in
                      sorted(leads, key=lambda l: -l["amount"])],
        },
    }

    # ============================ LOCALISATION, D7, AND THE CHECKS SECTION, D6
    # THE SUBSTITUTION LIST IS DERIVED, not typed, because it is the one list on this page
    # that goes stale invisibly: a recipe changes, a value it depends on moves, and a
    # typed swap list keeps naming the old one. Two transfer tests drove this section, and
    # in the second the reviewer could name every substitution except two. Those two are
    # marked as things the reader must supply, rather than quietly omitted.
    swaps = [
        {"what": "The geography", "ours": f"{footprint['label']}, "
         f"{', '.join(c['fips'] for c in footprint['counties'][:3])} and "
         f"{len(footprint['counties']) - 3} more",
         "yours": "your own county FIPS codes",
         "where": "every recipe", "supply": True,
         "note": "Not in this repository, and not derivable from anything on this page. "
                 "Census publishes a national county gazetteer; LEHD ships a geography "
                 "crosswalk beside the LODES files."},
        {"what": "The industry code set",
         "ours": ", ".join(wage["register_naics"]),
         "yours": "the codes your own plants file under",
         "where": "concentration, pay, federal money", "supply": True,
         "note": "A judgment rather than a lookup. The classification section above is the "
                 "method: start from the plants, test each code, keep the boundary calls "
                 "in a named group."},
        {"what": "The year", "ours": str(lq["worked"]["year"]),
         "yours": "any published year", "where": "every recipe", "supply": False,
         "note": "The QCEW endpoint takes it in the path. Annual averages only exist for "
                 "completed years."},
        {"what": "The aggregation level", "ours": "75 for a three-digit code",
         "yours": "the rung matching YOUR code’s digit length",
         "where": "concentration, pay", "supply": False,
         "note": "County file: 74 sector, 75 three-digit, 76 four, 77 five, 78 six. A "
                 "state file numbers the same rungs 55 to 58."},
        {"what": "The ownership", "ours": "own_code 5, private",
         "yours": "unchanged", "where": "concentration, pay", "supply": False,
         "note": "Industry rows exist only at own_code 5. The national denominator rows "
                 "are own_code 0, and that asymmetry is the point of the basis note."},
        {"what": "The national comparison file", "ours": "US000",
         "yours": "unchanged", "where": "concentration", "supply": False,
         "note": "Same endpoint, same year, area US000."},
        {"what": "The state", "ours": shed["state"],
         "yours": "your own state, and its neighbours if your region crosses a line",
         "where": "labour shed", "supply": False,
         "note": "LODES is one file per state. A region spanning two states needs both, "
                 "plus the aux file for each."},
        {"what": "The deflator base year", "ours": deflator["base_year"],
         "yours": "any year you name and keep", "where": "the basis section, federal money",
         "supply": False,
         "note": "Any base is defensible. Printing which one you used is not optional."},
    ]

    # The checks section counts the harness rather than describing it, and counts it from
    # the hub's own tally so this page cannot claim a number the site does not carry.
    CN = load(WEB, "index", "data", "counts.json")
    checks = {
        "n_pages": len(CN["pages"]),
        "n_claims": sum(v["claims"] for v in CN["pages"].values()),
        "n_manual": sum(v["manual"] for v in CN["pages"].values()),
        "this_page": CN["pages"].get("sources", {}).get("claims", 0),
    }
    checks["n_auto"] = checks["n_claims"] - checks["n_manual"]

    out = {"meta": meta, "sources": sources, "pages": pages, "totals": totals,
           "footprint": footprint, "socs": socs, "attributions": attributions,
           "codes": codes, "doublecount": doublecount, "suppression": supp,
           "suppression_vintage": supp_vintage,
           "lq": lq, "readings": readings, "classification": classification,
           "wage": wage, "awards": awards, "deflator": deflator, "shed": shed,
           "contracting": contracting, "swaps": swaps, "checks": checks,
           "vintage": vintage, "gaps": gaps,
           "onet_attribution": load(WEB, "occupations", "data",
                                    "viz-data.json")["onet_attribution"]}

    p = os.path.join(WEB, "sources", "data", "registry.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    print(f"wrote {p}\n  {totals['n_sources']} sources, {totals['n_filter_lines']} filter "
          f"lines, {totals['n_pages']} pages, {totals['n_key_required']} need a key, "
          f"{totals['n_no_endpoint']} have no endpoint\n  double count: "
          f"{doublecount['column_sum']:,} printed against {doublecount['once_counted']:,} "
          f"counted once, {doublecount['doubled']:,} twice")
    return out


build()
