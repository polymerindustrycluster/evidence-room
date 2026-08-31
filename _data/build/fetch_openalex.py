"""OpenAlex — research OUTPUT, which nothing else in this stack measures.

The three research signals are not interchangeable:
  NSF / NIH awards   money in       -> input
  USPTO patents      protection     -> intent to commercialise
  OpenAlex works     publications   -> OUTPUT

Only the third says whether research is actually being produced. It answers the question
the vault names Scopus/Web of Science for in twenty notes.

!! OPENALEX IS METERED, NOT FREE — corrected 2026-08-15 !!
    No key is required, but there is a per-day spending budget and a 429 carries:
        "Insufficient budget. This request costs $0.001 but you only have $0.0005
         remaining. Resets at midnight UTC."
    So the free allocation is a few hundred requests per day, and an exploratory session
    can exhaust it before the production pull ever runs — which is exactly what happened
    here. Retry-After was ~1900s but the real reset is midnight UTC.

    Consequences, encoded below: use `group_by` so one request answers ten years instead
    of ten; write partial results after every institution so a budget-exhausted run
    resumes instead of restarting; and do NOT probe against this API casually.

WHAT A ROW IS
  One (institution, year) count of WORKS whose title or abstract matches a topic query.
  Not papers "about polymers" by any strict definition — a keyword match over title and
  abstract, which over-captures passing mentions and under-captures work that uses other
  vocabulary (Kent State's liquid-crystal research is the known undercount).

  Counts are of works, not authors, not funding, not citations. A work with authors at
  two institutions counts once for EACH — institution counts do not sum to a regional
  total without deduplication, which this script does not attempt.

NOT A FOOTPRINT MEASURE. Institutions, not counties. Cleveland State and CWRU sit in
PIC-12, Ohio State does not, and a university's research does not "happen in" a county in
any way this data can see. Do not merge with the county sources.
"""
import json, os, time, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import CONTACT  # noqa: E402  (one address, see contact.py)
UA = {"User-Agent": f"PIC-viz/1.0 (mailto:{CONTACT})"}
API = "https://api.openalex.org"

# NEO institutions, plus Ohio State as the in-state non-NEO benchmark. An external
# benchmark is step 1 of the artifact gate; without OSU the NEO numbers have no scale.
INSTITUTIONS = [
    ("University of Akron", "neo"),
    ("Case Western Reserve University", "neo"),
    ("Kent State University", "neo"),
    ("Cleveland State University", "neo"),
    ("Youngstown State University", "neo"),
    ("Ohio State University", "benchmark"),
]
TOPICS = {
    "polymer": "polymer",
    "rubber": "rubber",
    "elastomer": "elastomer",
    "composite material": "composite material",
}
YEARS = (2015, 2024)


MAILTO = CONTACT   # OpenAlex polite pool — higher rate limit


def get(url, tries=4):
    url += ("&" if "?" in url else "?") + "mailto=" + urllib.parse.quote(MAILTO)
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                        timeout=60) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 429 and i < tries - 1:
                time.sleep(5 * (i + 1))       # back off hard; the pool is shared
                continue
            raise
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


# RESUMABLE. OpenAlex rate-limits on a rolling window, and an earlier version of this
# script issued 240 requests in a burst and earned a 429 that persisted for far longer
# than a retry loop can wait out. Partial results are written after every institution, so
# a throttled run can be re-invoked later and picks up where it stopped rather than
# starting the burst again.
PARTIAL = os.path.join(HERE, "openalex.json")
_prev = {}
if os.path.exists(PARTIAL):
    try:
        _d = json.load(open(PARTIAL, encoding="utf-8"))
        _prev = {(r["institution"], r["topic"]) for r in _d.get("rows", [])}
        rows_seed = _d.get("rows", [])
        print(f"  resuming: {len(rows_seed)} rows already held", flush=True)
    except Exception:
        rows_seed = []
else:
    rows_seed = []

ids, rows = {}, list(rows_seed)
for name, klass in INSTITUTIONS:
    d = get(f"{API}/institutions?search={urllib.parse.quote(name)}&per_page=1")
    if not d.get("results"):
        raise SystemExit(f"FATAL: OpenAlex resolved no institution for {name!r}. A name that "
                         f"resolves to nothing is a bad name, not an institution with no "
                         f"research.")
    r = d["results"][0]
    ids[name] = {"id": r["id"].split("/")[-1], "display": r["display_name"],
                 "works_total": r["works_count"], "class": klass}
    print(f"  {name} -> {ids[name]['id']} ({r['works_count']:,} works all-time)", flush=True)
    time.sleep(0.3)

# group_by returns every year in ONE request. The naive loop was 6 institutions x 4 topics
# x 10 years = 240 calls and earned an immediate 429. This is 24.
for name, meta in ids.items():
    for tkey, tquery in TOPICS.items():
        if (meta["display"], tkey) in _prev:
            continue                          # already held from an earlier partial run
        u = (f"{API}/works?filter=authorships.institutions.id:{meta['id']},"
             f"publication_year:{YEARS[0]}-{YEARS[1]},"
             f"title_and_abstract.search:{urllib.parse.quote(tquery)}"
             f"&group_by=publication_year&per_page=1")
        for g in get(u).get("group_by", []):
            try:
                yr = int(g["key"])
            except (ValueError, TypeError):
                continue
            if YEARS[0] <= yr <= YEARS[1]:
                rows.append({"institution": meta["display"], "class": meta["class"],
                             "topic": tkey, "year": yr, "works": g["count"]})
        time.sleep(1.0)
    got = sum(r["works"] for r in rows if r["institution"] == meta["display"])
    print(f"  {meta['display'][:40]}: {got:,} topic-works {YEARS[0]}-{YEARS[1]}", flush=True)

# An institution matching zero works across every topic and every year is a resolution
# failure, not a research desert.
dead = [n for n in ids
        if not any(r["works"] for r in rows if r["institution"] == ids[n]["display"])]
if dead:
    raise SystemExit(f"FATAL: zero works across all topics and years for {dead}. Check the "
                     f"resolved OpenAlex id before writing openalex.json.")

out = {"meta": {
    "source": f"OpenAlex works API, {YEARS[0]}-{YEARS[1]}, title_and_abstract keyword search",
    "row": "one (institution, topic, year) count of WORKS",
    "not_a_footprint": "Institutions, not counties. A university's research does not happen "
                       "in a county in any way this data can see. Never merge with the "
                       "county-grain sources.",
    "double_counting": "A work co-authored across two institutions counts once for EACH. "
                       "Institution counts DO NOT sum to a regional total without "
                       "deduplication, which this script does not attempt.",
    "keyword_caveat": "Keyword match over title and abstract, not a field classification. "
                      "It over-captures passing mentions and under-captures work using other "
                      "vocabulary — Kent State's liquid-crystal research is a known "
                      "undercount. Treat cross-institution comparison as indicative, not "
                      "exact.",
    "benchmark": "Ohio State is included as the in-state non-NEO benchmark. Step 1 of the "
                 "gate is an EXTERNAL benchmark; without it the NEO figures have no scale.",
    "institutions": ids,
    "fetched": time.strftime("%Y-%m-%d")}, "rows": rows}

p = os.path.join(HERE, "openalex.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
print(f"wrote {p} {round(os.path.getsize(p)/1024)} KB, {len(rows)} rows, "
      f"{len(ids)} institutions, {len(TOPICS)} topics, {YEARS[0]}-{YEARS[1]}")
