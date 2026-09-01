"""The counterfactual: did POLYMER DEGREES decline, or did Northeast Ohio decline?

The talent page reports that regional polymer conferrals fell from 179 in 2016 to 63 in
2023 and benchmarks that against Ohio. Ohio is not a counterfactual — the region is a large
share of Ohio's polymer output, so the two series are not independent and Ohio falling is
substantially the region falling. Without a national line, a field-wide contraction reads as
a regional failure, and the workforce ask that follows ("fund more polymer degrees here") is
aimed at the wrong thing.

This is the same defect the laborshed page carried until it was benchmarked: a true local
number, published without the comparison that says whether it is local.

METHOD. The same CIP list, the same `majornum=1` filter, the same years — the only thing
that changes is dropping the `fips=39` restriction. Anything else and the comparison is
between two different definitions of "polymer degree" rather than between two places.

WHY THE SUMMARY ENDPOINT. Fetching every institution in the country for ten CIP codes over
twelve years is 120 paged calls; `/summaries?stat=sum&by=year` is ten. It was VALIDATED
before use rather than trusted: national 2023 for CIP 143201 sums to 264 from the per-row
totals (race=99, sex=99, 36 rows) and the summary endpoint returns 264. If that ever
diverges, the summary is silently including the race and sex breakdown rows and every
national figure here is inflated — re-run the check before believing a new vintage.

  python fetch_ipeds_national.py
"""
import json, os, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
from contact import UA  # noqa: E402  (one address, see contact.py)
API = "https://educationdata.urban.org/api/v1/college-university/ipeds/completions-cip-6"
YEARS = list(range(2012, 2024))

# Imported from the fetcher rather than retyped, so the two lists cannot drift apart.
from fetch_ipeds import CIP


def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                        timeout=180) as r:
                return json.load(r)
        except Exception as e:
            if i == tries - 1:
                print(f"    FAILED {url}: {e}")
                return None
            time.sleep(2 + 3 * i)


def series(cip, fips=None):
    """awards by year for one CIP, nationally or for one state."""
    u = (f"{API}/summaries?var=awards_6digit&stat=sum&by=year"
         f"&cipcode_6digit={cip}&majornum=1" + (f"&fips={fips}" if fips else ""))
    d = get(u)
    return {r["year"]: r["awards_6digit"] or 0 for r in (d or {}).get("results", [])}


# --- the validation this whole file rests on, re-run every time rather than assumed
probe_rows, url = 0, f"{API}/2023/?cipcode_6digit=143201&majornum=1&race=99&sex=99"
while url:
    d = get(url)
    if not d:
        break
    probe_rows += sum(r.get("awards_6digit") or 0 for r in d["results"])
    url = d.get("next")
probe_sum = series("143201").get(2023)
if probe_sum != probe_rows:
    raise SystemExit(
        f"FATAL: summary endpoint disagrees with the per-row total for CIP 143201 in 2023 "
        f"({probe_sum} vs {probe_rows}). The summary is probably counting race and sex "
        f"breakdown rows on top of the totals, which would inflate every national figure. "
        f"Do not publish a national comparison until this reconciles.")
print(f"  validation OK: national 2023 CIP 143201 = {probe_rows} both ways")

# PER-CIP, not only per-group. The group total cannot answer whether the national line is
# comparable to the regional one, and it turned out not to be: PIC-12 confers ZERO
# 150607 (plastics engineering technology), the largest of the three national core codes,
# which fell 42 percent nationally and dragged the national "core" down with it. Benchmarking
# a region against an aggregate containing a program type it does not offer overstates the
# national decline and makes a regional failure look like a field-wide one.
nat, ohio, per_cip = {}, {}, {}
for cip, (label, group) in CIP.items():
    n, o = series(cip), series(cip, fips=39)
    per_cip[cip] = {"label": label, "group": group,
                    "us": [{"year": y, "awards": n.get(y, 0)} for y in YEARS],
                    "ohio": [{"year": y, "awards": o.get(y, 0)} for y in YEARS]}
    for y in YEARS:
        nat.setdefault(group, {}).setdefault(y, 0)
        ohio.setdefault(group, {}).setdefault(y, 0)
        nat[group][y] += n.get(y, 0)
        ohio[group][y] += o.get(y, 0)
    print(f"  {cip} {label[:34]:<34} US {sum(n.get(y, 0) for y in YEARS):>7,}  "
          f"OH {sum(o.get(y, 0) for y in YEARS):>6,}", flush=True)

out = {"meta": {
    "source": "IPEDS completions, via the Urban Institute Education Data API, "
              "completions-cip-6 summary endpoint (stat=sum, by=year).",
    "row": "one (year, CIP group) national count of DEGREES CONFERRED. majornum=1 only.",
    "same_definition": "Identical CIP list, years and majornum filter as the regional and "
                       "Ohio series. The ONLY difference is that no state filter is applied "
                       "— otherwise this would compare two definitions, not two places.",
    "why": "Ohio is not a counterfactual for Northeast Ohio: the region is a large share of "
           "Ohio's polymer conferrals, so the two series are not independent. The national "
           "line is what says whether a local decline is a local fact.",
    "validated": "The summary endpoint was checked against a per-row sum of the totals rows "
                 "(race=99, sex=99) for CIP 143201 in 2023 before use; both give 264.",
    "not": "Degrees conferred, not people who stayed. IPEDS cannot see whether a graduate "
           "takes a job in the region, in the industry, or at all.",
    "years": YEARS,
    "fetched": time.strftime("%Y-%m-%d")},
    "us": {g: [{"year": y, "awards": nat[g][y]} for y in YEARS] for g in nat},
    "per_cip": per_cip,
    "ohio_check": {g: [{"year": y, "awards": ohio[g][y]} for y in YEARS] for g in ohio}}

p = os.path.join(HERE, "ipeds_national.json")
json.dump(out, open(p, "w", encoding="utf-8"), separators=(",", ":"))
c = out["us"]["core"]
print(f"\nwrote {p}")
print(f"  US core: {c[0]['awards']} in {YEARS[0]} -> {c[-1]['awards']} in {YEARS[-1]} "
      f"({(c[-1]['awards'] / c[0]['awards'] - 1) * 100:+.0f}%)")
peak = max(c, key=lambda r: r["awards"])
print(f"  US core peak {peak['awards']} in {peak['year']}; "
      f"{(c[-1]['awards'] / peak['awards'] - 1) * 100:+.0f}% from peak")
