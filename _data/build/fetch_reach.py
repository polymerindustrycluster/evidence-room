"""Who the region's polymer research reaches, and who reaches for it.

TWO DIRECTIONS, NEVER ONE. `collaboration/` measures one edge — Akron to Case Western. This
measures the whole neighbourhood, and it measures it both ways, because "we collaborate
widely" and "others bring us in" are different claims about standing and only one of them
is flattering by default:

  LED     at least one CORRESPONDING author sits at Akron or Case Western -> our reach
  JOINED  the region is on the paper but nobody here is corresponding    -> our standing

WHY CORRESPONDING AND NOT FIRST AUTHOR. In polymer chemistry the first author is normally
the graduate student who ran the experiment; the corresponding author is the principal
investigator whose lab it is. Ranking "reach" by first-author institution would credit
whoever's student did the bench work, which is not the same question and is often not even
the same institution. `is_corresponding` is populated on about 94 percent of this corpus,
measured before this file was written, so the split is answerable rather than assumed.

IMPACT IS A SEPARATE PROPOSITION and is treated as one. Citation counts are collected here
because they come in the same payload, but they are never charted against collaboration:
impact and collaboration are different questions, and putting them side by side to observe
that they differ is the juxtaposition this project's register was red-teamed for.

RAW COUNTS ARE NOT USED FOR ANYTHING OVER TIME. A 2015 paper has had a decade to accumulate
citations and a 2024 paper has had months, so a raw-citation trend is a picture of the
calendar. FWCI is field- and age-normalized by OpenAlex (1.0 = world average for that field
and year) and is the only citation measure this page will publish as a comparison.

  python fetch_reach.py
"""
import json, os, time, urllib.request, collections

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
OA = "https://api.openalex.org"
AK, CW = "I110152177", "I58956616"
HOME = {AK: "University of Akron", CW: "Case Western Reserve University"}
YEARS = "2015-2024"

# THE BOUND, and why it changed. The first version of this file matched the full-text
# keyword "polymer", which is a word rather than a classification. It swept in biomedical
# polymer work — drug delivery, implants, tissue scaffolds — and four of the five largest
# "partners" it produced were hospitals. That is real polymer science and it is not the
# cluster PIC means, and it was steering the top of the ranking.
#
# OpenAlex classifies every work into topic -> subfield -> field. Confirmed against the
# authoritative snapshot (s3://openalex/data/jsonl/subfields), NOT guessed:
#     2507  Polymers and Plastics   (Materials Science)   <- the bound
#     2502  Biomaterials            (Materials Science)   <- a SEPARATE subfield
# Biomaterials is its own subfield. The keyword could not tell them apart; the taxonomy can.
#
# ANY assigned topic, not only the primary one. Measured before choosing:
#     primary_topic 2507 only ......  544   too narrow — drops work whose top topic is a
#                                           neighbouring subfield but which is substantially
#                                           about polymers
#     topics 2507 (any) ...........  1,448  <- the bound
#     topics 2507 or 2502 .........  2,423  re-admits biomaterials, which is the thing being
#                                           excluded
#     keyword "polymer" ...........  4,037  the old bound
# Excluding Medicine-as-primary-field moves 1,448 to 1,436 — twelve works. So the medical
# contamination was never arriving through Medicine; it arrived through Biomaterials, and
# the taxonomy separates the two cleanly where a keyword could not.
#
# Both counts are fetched and both are published, so a reader can see what the bound did
# rather than being handed a smaller number with no explanation.
SUBFIELD = "2507"          # Polymers and Plastics
SUBFIELD_ALT = "2502"      # Biomaterials — reported for contrast, never merged in
TERM = "polymer"           # the old bound, kept only to quantify the difference


def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                        timeout=180) as r:
                return json.load(r)
        except Exception as e:
            if i == tries - 1:
                print(f"    FAILED {url[:100]}: {e}")
                return None
            time.sleep(2 + 3 * i)


SEL = "id,publication_year,fwci,citation_normalized_percentile,cited_by_count,authorships"
BASE_FILT = f"institutions.id:{AK}|{CW},publication_year:{YEARS}"
FILT = f"{BASE_FILT},topics.subfield.id:{SUBFIELD}"
from contact import MAILTO  # noqa: E402


def count(filt, search=None):
    u = f"{OA}/works?per-page=1&filter={filt}{MAILTO}" + (f"&search={search}" if search else "")
    d = get(u)
    return (d or {}).get("meta", {}).get("count")

# What the bound costs, measured before the pull so it can be published beside the result.
bounds = {"keyword": count(BASE_FILT, TERM),
          "subfield_polymers_plastics": count(FILT),
          "subfield_biomaterials": count(f"{BASE_FILT},topics.subfield.id:{SUBFIELD_ALT}")}
print(f"  bound: keyword '{TERM}' = {bounds['keyword']:,} · "
      f"subfield {SUBFIELD} = {bounds['subfield_polymers_plastics']:,} · "
      f"biomaterials {SUBFIELD_ALT} = {bounds['subfield_biomaterials']:,}", flush=True)

works, cursor, page = [], "*", 0
while cursor:
    d = get(f"{OA}/works?per-page=200&cursor={cursor}&filter={FILT}&select={SEL}{MAILTO}")
    if not d:
        break
    works += d["results"]
    cursor = d["meta"].get("next_cursor")
    page += 1
    if page % 5 == 0:
        print(f"  {len(works):,} works…", flush=True)
    if page > 60:
        print("    (stopped at 60 pages — check paging)")
        break
    time.sleep(0.4)          # politeness: a 70-request burst earned a multi-hour 429
print(f"  fetched {len(works):,} works")
if not works or len(works) < 0.8 * (bounds["subfield_polymers_plastics"] or 0):
    raise SystemExit(
        f"pulled {len(works)} of an expected {bounds['subfield_polymers_plastics']} works. "
        f"A short pull understates the network and silently shrinks the map — rerun rather "
        f"than publish a partial one.")

led = collections.Counter()      # partner institution -> works where WE corresponded
joined = collections.Counter()   # partner institution -> works where THEY corresponded
name, ctry = {}, {}
n_led = n_joined = n_nocorr = 0
fwci, pct_top10, pct_top1, n_pct = [], 0, 0, 0

for w in works:
    insts, corr_home, any_corr = set(), False, False
    for a in w["authorships"]:
        ids = [i["id"].rsplit("/", 1)[-1] for i in (a.get("institutions") or [])]
        for i in (a.get("institutions") or []):
            k = i["id"].rsplit("/", 1)[-1]
            insts.add(k)
            name[k] = i["display_name"]
            ctry[k] = i.get("country_code")
        if a.get("is_corresponding"):
            any_corr = True
            if any(k in HOME for k in ids):
                corr_home = True
    partners = {k for k in insts if k not in HOME}
    if not any_corr:
        n_nocorr += 1
        bucket = None                      # unattributable: counted, never assigned
    elif corr_home:
        n_led += 1
        bucket = led
    else:
        n_joined += 1
        bucket = joined
    if bucket is not None:
        for k in partners:
            bucket[k] += 1
    if w.get("fwci") is not None:
        fwci.append(w["fwci"])
    p = w.get("citation_normalized_percentile") or {}
    if p.get("value") is not None:
        n_pct += 1
        pct_top10 += bool(p.get("is_in_top_10_percent"))
        pct_top1 += bool(p.get("is_in_top_1_percent"))

partner_ids = sorted(set(led) | set(joined), key=lambda k: -(led[k] + joined[k]))
print(f"  led {n_led:,} · joined {n_joined:,} · no corresponding author {n_nocorr:,}")
print(f"  {len(partner_ids):,} distinct partner institutions")

# ---- coordinates, so the network can be drawn as a place rather than a list
geo = {}
for i in range(0, len(partner_ids), 50):
    chunk = partner_ids[i:i + 50]
    d = get(f"{OA}/institutions?per-page=50&filter=ids.openalex:{'|'.join(chunk)}"
            f"&select=id,display_name,country_code,type,geo")
    for r in (d or {}).get("results", []):
        k = r["id"].rsplit("/", 1)[-1]
        g = r.get("geo") or {}
        if g.get("latitude") is not None:
            geo[k] = {"lat": round(g["latitude"], 3), "lon": round(g["longitude"], 3),
                      "city": g.get("city"), "country": g.get("country_code"),
                      "type": r.get("type")}
    if i % 500 == 0:
        print(f"    geo {len(geo):,}/{len(partner_ids):,}", flush=True)
print(f"  coordinates for {len(geo):,} of {len(partner_ids):,} partners")

rows = [{"id": k, "name": name.get(k, k), "country": ctry.get(k),
         "led": led[k], "joined": joined[k], "total": led[k] + joined[k],
         **({"lat": geo[k]["lat"], "lon": geo[k]["lon"], "city": geo[k]["city"],
             "type": geo[k]["type"]} if k in geo else {})}
        for k in partner_ids]

fwci.sort()
med = fwci[len(fwci) // 2] if fwci else None
out = {"meta": {
    # Built from SUBFIELD, which is what FILT actually queries. It used to be built from
    # TERM, so the methodology box published the keyword bound — the one polymer_bound two
    # entries down explains was DISCARDED for putting four hospitals in the top five. The
    # pull was always right; only its description was wrong, which is the harder kind to
    # notice, because nothing downstream disagrees with a string.
    "source": f"OpenAlex works, {YEARS}, in subfield {SUBFIELD} ('Polymers and Plastics'), "
              "with an authorship at the University of Akron or Case Western Reserve "
              "University.",
    "row": "one partner institution: works on which it appears alongside the region, split "
           "by whether a corresponding author sat here or there.",
    "led_joined": "LED = at least one corresponding author at Akron or Case Western. "
                  "JOINED = the region is on the paper but no corresponding author here. "
                  "Works with no corresponding author flagged at all are counted and "
                  "assigned to neither.",
    "why_corresponding": "In polymer chemistry the first author is usually the student who "
                         "did the work and the corresponding author is the principal "
                         "investigator. First-author institution answers a different "
                         "question and would miscredit the lead.",
    "polymer_bound": (
        f"Works are bounded by OpenAlex subfield {SUBFIELD}, 'Polymers and Plastics', a "
        f"classification, not a keyword. An earlier version matched the full-text word "
        f"'polymer', which swept in biomedical polymer research and put four hospitals in "
        f"the five largest partners. Biomaterials is a SEPARATE subfield ({SUBFIELD_ALT}) "
        f"and is reported beside this one rather than merged into it."),
    "bounds": bounds,
    "impact_is_separate": "FWCI is collected here but is never charted against "
                          "collaboration. Impact and collaboration are different "
                          "propositions; juxtaposing them would invite a reader to treat "
                          "them as one.",
    "no_raw_trends": "Raw citation counts are never compared across years. A 2015 paper has "
                     "had a decade to accumulate them and a 2024 paper has had months, so "
                     "a raw-citation trend draws the calendar. FWCI is field- and "
                     "age-normalized by OpenAlex; 1.0 is the world average.",
    "home": list(HOME.values()),
    "fetched": time.strftime("%Y-%m-%d")},
    "totals": {"works": len(works), "led": n_led, "joined": n_joined,
               "no_corresponding": n_nocorr, "partners": len(partner_ids),
               "partners_with_geo": len(geo),
               "fwci_n": len(fwci), "fwci_median": med,
               "fwci_mean": round(sum(fwci) / len(fwci), 3) if fwci else None,
               "pct_n": n_pct, "top10": pct_top10, "top1": pct_top1},
    "partners": rows,
    "fwci_deciles": [fwci[int(f * len(fwci))] for f in
                     (0.1, 0.25, 0.5, 0.75, 0.9)] if fwci else []}

p = os.path.join(HERE, "reach.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
t = out["totals"]
print(f"\nwrote {p}")
print(f"  {t['works']:,} works · led {t['led']:,} · joined {t['joined']:,}")
print(f"  {t['partners']:,} partners, {t['partners_with_geo']:,} mappable")
print(f"  FWCI median {t['fwci_median']}, mean {t['fwci_mean']} (1.0 = world average)")
print(f"  top 10% of field: {t['top10']:,} of {t['pct_n']:,} "
      f"({t['top10']/max(t['pct_n'],1):.0%}) · top 1%: {t['top1']:,}")
