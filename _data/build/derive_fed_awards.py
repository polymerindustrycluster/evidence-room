"""Shape the award-level pull into federal-money's register: who gets the money, for what.

WHAT IT ADDS. Reads fed_awards.json (fetch_fed_awards.py, raw, not committed) and
writes federal-money/data/awards.json (committed): four page-shaped views of one pull.
recipients is one row per company, EVERY company, so the shipped register drops no
dollars; register is one row per award of $500,000 or more, description included,
largest first (a size cut for the page, not a truncated fetch: the rows below the
floor are counted and summed in the meta, and their dollars are all in the recipients
view); codes is per-NAICS totals with each code's top recipient, which is what lets
the page say the leftovers category is one company; agencies is per-buyer totals.

WHAT ONE ROW IS. In recipients: one company (ledger punctuation variants merged),
its whole-life total, award count, dominant industry code, chief buying agency, and
largest single award. In register: one prime contract award, USAspending's own award
page linked by generated_internal_id. In every view "amount"/"total" is the award's
WHOLE-LIFE obligation: never summed with federal.json's per-fiscal-year rows, and a
claim on the page fails if either surface stops saying so.

TRAPS. The name merge is a conservative normalisation (case, punctuation, a movable
"THE") on purpose: a fuzzy match is how two real firms become one row. Reconciliation
runs on the EXACT figures before display rounding, because comparing sums of rounded
rows tolerates a real drop of up to a dollar per row. And the derive re-asserts the
fetcher's own yield (count, NAICS scope, no null amounts) rather than trusting it: a
derive that trusts its input publishes whatever the last partial fetch left behind.
"""
import collections
import json
import os
import re

from footprints import META

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
RAW = os.path.join(HERE, "fed_awards.json")
OUT = os.path.join(WEB, "federal-money", "data", "awards.json")

FLOOR = 500_000


def canon(name):
    """One company, one key. Case, punctuation and a movable THE are ledger noise;
    anything beyond that is left distinct on purpose - merging on a fuzzy match is how
    two real firms become one row."""
    s = re.sub(r"[^A-Z0-9 ]", " ", (name or "").upper())
    s = re.sub(r"\s+", " ", s).strip()
    if s.endswith(" THE"):
        s = "THE " + s[:-4].strip()
    if s.startswith("THE "):
        s = s[4:]
    return s


raw = json.load(open(RAW, encoding="utf-8"))
rows, rmeta = raw["rows"], raw["meta"]

# THE DERIVE RE-CHECKS THE FETCH'S OWN YIELD. A derive that trusts its input publishes
# whatever the last partial fetch left behind.
assert len(rows) == rmeta["count"], (
    f"fed_awards.json says {rmeta['count']} rows and holds {len(rows)}")
assert all((r["naics"] or "").startswith(("325", "326")) for r in rows)
assert all(r["amount"] is not None and r["amount"] >= 0 for r in rows)

total = sum(r["amount"] for r in rows)

# ------------------------------------------------------------------ recipients
by_c = collections.defaultdict(list)
for r in rows:
    by_c[canon(r["recipient"])].append(r)
merged = sum(1 for rs in by_c.values() if len({r["recipient"] for r in rs}) > 1)

recipients, exact_totals = [], []
for rs in by_c.values():
    tot = sum(r["amount"] for r in rs)
    exact_totals.append(tot)
    naics = collections.defaultdict(float)
    agencies = collections.defaultdict(float)
    for r in rs:
        naics[(r["naics"], r["naics_name"])] += r["amount"]
        agencies[r["agency"]] += r["amount"]
    (ncode, nname), namt = max(naics.items(), key=lambda t: t[1])
    agency, aamt = max(agencies.items(), key=lambda t: t[1])
    big = max(rs, key=lambda r: r["amount"])
    # The most frequent raw spelling stands for the merged set; the page title-cases it.
    name = collections.Counter(r["recipient"] for r in rs).most_common(1)[0][0]
    recipients.append({
        "name": name, "total": round(tot), "awards": len(rs),
        "naics": ncode, "naics_name": nname,
        "naics_share": round(namt / tot, 4) if tot else 1.0,
        "agency": agency, "agency_share": round(aamt / tot, 4) if tot else 1.0,
        "largest": {"amount": round(big["amount"]),
                    "what": big["description"], "usaspending_id": big["usaspending_id"]},
    })
recipients.sort(key=lambda r: -r["total"])

# -------------------------------------------------------------------- register
register = [{
    "recipient": r["recipient"], "amount": round(r["amount"]),
    "agency": r["agency"], "sub_agency": r["sub_agency"],
    "naics": r["naics"], "start": r["start"], "end": r["end"],
    "what": r["description"], "usaspending_id": r["usaspending_id"],
} for r in sorted(rows, key=lambda r: -r["amount"]) if r["amount"] >= FLOOR]

below = [r for r in rows if r["amount"] < FLOOR]
below_amts = sorted(r["amount"] for r in below)
zero = sum(1 for r in rows if r["amount"] == 0)

# ------------------------------------------------------------------------ codes
# Per-NAICS totals on the AWARD basis, with each code's top recipient: the view that
# lets the page say what is inside a category, and a claim re-check it.
by_n = collections.defaultdict(list)
for r in rows:
    by_n[(r["naics"], r["naics_name"])].append(r)
codes = []
for (ncode, nname), rs in sorted(by_n.items(), key=lambda t: -sum(r["amount"] for r in t[1])):
    tot = sum(r["amount"] for r in rs)
    per = collections.defaultdict(float)
    for r in rs:
        per[canon(r["recipient"])] += r["amount"]
    topk, topv = max(per.items(), key=lambda t: t[1]) if tot else (None, 0.0)
    topname = collections.Counter(
        r["recipient"] for r in rs if canon(r["recipient"]) == topk).most_common(1)[0][0] \
        if topk else None
    codes.append({"naics": ncode, "name": nname, "total": round(tot), "awards": len(rs),
                  "top": {"name": topname,
                          "share": round(topv / tot, 4) if tot else None}})

# --------------------------------------------------------------------- agencies
by_a = collections.defaultdict(lambda: {"total": 0.0, "awards": 0})
for r in rows:
    by_a[r["agency"]]["total"] += r["amount"]
    by_a[r["agency"]]["awards"] += 1
agencies = [{"agency": a, "total": round(v["total"]), "awards": v["awards"]}
            for a, v in sorted(by_a.items(), key=lambda t: -t[1]["total"])]

# ------------------------------------------------- reconciliation, then write
# On the EXACT figures, before display rounding: rounding each row first and comparing
# sums would tolerate a real drop of up to a dollar per row.
assert abs(sum(exact_totals) - total) < 1
assert abs(sum(r["amount"] for r in rows if r["amount"] >= FLOOR)
           + sum(below_amts) - total) < 1
assert abs(sum(v["total"] for v in by_a.values()) - total) < 1

out = {
    "meta": {
        "source": "USAspending.gov spending_by_award, place of performance",
        "row": "one prime contract award (award types A-D) with obligation activity "
               "in FY2019-FY2026; amount is the award’s whole-life obligation",
        "footprint": META["pic12"],
        "scope": "Prime contracts at place of performance in the 12 PIC-12 counties, "
                 "NAICS 3251-3259, 3261 and 3262 filtered by the API itself. Grants, "
                 "loans and direct payments are not in this file.",
        "basis": "An award’s amount counts its whole life, including dollars obligated "
                 "outside FY2019-FY2026 on contracts the window touches, in the dollars "
                 "of the day. federal.json counts per-fiscal-year slices of the same "
                 "ledger. The two bases are shown separately and are NEVER summed; a "
                 "claim fails if either surface stops saying so.",
        "caution": "Place of performance is a reported field on the award, not an "
                   "observation of where work happened. An obligation is not an outlay.",
        "filters": rmeta["filters"],
        "fetched": rmeta["fetched"],
        "award_count": len(rows), "total": round(total),
        "zero_awards": zero,
        "recipient_count": len(recipients), "name_variants_merged": merged,
        "register_floor": FLOOR,
        "register": {"count": len(register),
                     "total": round(sum(r["amount"] for r in register))},
        "below_floor": {"count": len(below),
                        "total": round(sum(below_amts)),
                        "median": round(below_amts[len(below_amts) // 2])},
    },
    "recipients": recipients,
    "register": register,
    "codes": codes,
    "agencies": agencies,
}
json.dump(out, open(OUT, "w", encoding="utf-8"), separators=(",", ":"))
print(f"  federal-money/data/awards.json  {round(os.path.getsize(OUT)/1024)} KB")
print(f"  {len(rows)} awards -> {len(recipients)} recipients "
      f"({merged} name-variant merges), {len(register)} register rows >= ${FLOOR:,}, "
      f"{len(below)} below the floor summing ${round(sum(below_amts)):,}")
