"""What has actually been PAID against the federal award lines this site publishes.

WHY THIS FILE EXISTS. accountability/ shipped an H2 reading "no public record says what
has been paid", a figure whose third stage was drawn as an empty dashed outline, and a
figure-registry entry asserting that the public record shows award and execution and never
drawdown. All three were wrong. USAspending carries a Total Outlays field on assistance
awards, and it is populated for seven of the eight federal award lines in the register:
$11,642,401.68 against $48,114,979 of obligations, 24.2 percent, on the day this was read.

WHAT IS STILL NOT PUBLIC, and why the page keeps an absence beside the figure:
  - the $31,250,000 Ohio Innovation Hub grant is a STATE award and is not in USAspending
    at all, so no drawdown figure exists for it anywhere this repository can reach;
  - EDA award ED25HDQ0G0009, Huntsman, $5,970,805, has NO USAspending record of any kind.
    Not a zero outlay: no award row. Checked against every award-type group and by keyword
    search. It is therefore absent from this file rather than present at zero, because a
    zero is a measurement and this is not one.
So there is no figure for the $85,335,784 award total; there is a figure for the part of
it the federal ledger publishes, and the page has to say which is which.

WHERE THE NUMBERS GO. Into funding-map/data/funding.json, on the award objects, by hand
with this run's output beside them: that file is the register of signed Notices of Award
and is maintained, not generated. accountability/derive_accountability.py then recomputes
the totals from it, the way it recomputes everything else.

TRAPS (probed 2026-09-01):
  - POST api.usaspending.gov/api/v2/search/spending_by_award/ — keyless.
  - award_type_codes must come from ONE group per request; these are assistance awards,
    so ["02","03","04","05"]. A mixed list 422s.
  - "Total Outlays" is null on some awards. Null is not zero and is written as null.
"""
import json, os, sys, time, urllib.request
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from contact import UA  # noqa: E402

OUT = os.path.join(HERE, "fed_outlays.json")
URL = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
ASSISTANCE = ["02", "03", "04", "05"]

# The federal award lines funding-map publishes: the seven EDA Tech Hub implementation
# awards and the APEX Good Jobs Challenge award. The state grant is not federal and is not
# here. ED24OIE0G0019 is the completed Phase 1 Tech Hub award to the same grantee: it is
# not part of the $85,335,784 register total, and it is pulled because the page names it.
AWARD_IDS = ["ED25HDQ0G0038", "ED25HDQ0G0013", "ED25HDQ0G0036", "ED24HDQ0G0452",
             "ED25HDQ0G0009", "ED25HDQ0G0030", "ED24HDQ0G0413", "ED25OIE0G0108",
             "ED24OIE0G0019"]
FIELDS = ["Award ID", "Recipient Name", "Award Amount", "Total Outlays", "Description",
          "Awarding Agency", "Start Date", "End Date", "generated_internal_id"]


def ask(aid):
    payload = {"filters": {"award_ids": [aid], "award_type_codes": ASSISTANCE},
               "fields": FIELDS, "limit": 10, "page": 1, "subawards": False}
    req = urllib.request.Request(URL, data=json.dumps(payload).encode(),
                                 headers={**UA, "Content-Type": "application/json"})
    for _ in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read().decode()).get("results", [])
        except Exception as e:
            print(f"  retry {aid}: {type(e).__name__}: {e}", flush=True)
            time.sleep(4)
    raise SystemExit(f"FATAL: {aid} did not answer in four attempts. An absent answer and "
                     f"an absent award are different findings and must not look alike.")


def main():
    print("--- fed_outlays ---", flush=True)
    rows, missing = [], []
    for aid in AWARD_IDS:
        res = ask(aid)
        if len(res) > 1:
            raise SystemExit(f"FATAL: {aid} matched {len(res)} awards. An award id is "
                             f"meant to be one row; summing two would be a guess.")
        if not res:
            missing.append(aid)
            print(f"  {aid:16s} NO USASPENDING RECORD", flush=True)
        else:
            x = res[0]
            rows.append({"award_id": aid, "recipient": x.get("Recipient Name"),
                         "obligated": x.get("Award Amount"),
                         "outlay": x.get("Total Outlays"),
                         "start": x.get("Start Date"), "end": x.get("End Date"),
                         "usaspending_id": x.get("generated_internal_id")})
            o, a = x.get("Total Outlays"), x.get("Award Amount")
            print(f"  {aid:16s} {a:>14,.0f} obligated  "
                  f"{('%14.2f' % o) if o is not None else '          null'} outlaid",
                  flush=True)
        time.sleep(0.4)

    have = [r for r in rows if r["outlay"] is not None]
    base = sum(r["obligated"] for r in have)
    paid = sum(r["outlay"] for r in have)
    if not have or base <= 0:
        raise SystemExit("FATAL: no award line came back with an outlay. Either the field "
                         "has been renamed or the filter is wrong; publishing 'the record "
                         "shows nothing' off a broken pull is the exact error this file "
                         "was written to correct.")
    print(f"\n  {len(have)} lines carry an outlay: {paid:,.2f} of {base:,.0f} "
          f"= {paid / base * 100:.1f}%", flush=True)
    if missing:
        print(f"  no record at all: {', '.join(missing)}  (absent, NOT zero)", flush=True)

    json.dump({"meta": {
        "source": "USAspending.gov spending_by_award, Total Outlays, by award id",
        "row": "one federal award line",
        "caution": "An award with no USAspending record is absent from rows[] and listed "
                   "in missing[]. It is not a zero outlay, and no total here covers it.",
        "fetched": date.today().isoformat()},
        "rows": rows, "missing": missing,
        "totals": {"lines": len(have), "obligated": round(base),
                   "outlaid": round(paid, 2), "share": round(paid / base, 6)}},
        open(OUT, "w", encoding="utf-8"), separators=(",", ":"))
    print(f"  saved fed_outlays.json  {len(rows)} rows", flush=True)


if __name__ == "__main__":
    main()
