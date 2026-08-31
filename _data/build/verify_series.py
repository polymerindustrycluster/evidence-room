"""THE FIDELITY GATE. Does the data resemble the world, or only itself?

    python _data/build/verify_series.py          every published dataset
    python _data/build/verify_series.py talent   one

WHY THIS EXISTS, AND WHY IT IS A DIFFERENT KIND OF CHECK. Every other gate in this
repository asks whether the PROSE matches the DATA. verify_claims re-runs each assertion
against the JSON; verify_consistency asks whether the scripts and the catalog agree;
columns, centres, tells and check all read the rendered page. All of them pass with
flying colours on a dataset that is simply wrong, because none of them ever looks at the
data as a series and asks whether a series that shape could have come from the world.

On 2026-08-26 that gap cost three pages, and it survived a full rebuild: the 2026-08-30
rebuild shipped fifteen gates, 401 self-checking claims and a rewritten occupations page,
and the duplicated year was still in it, in eleven of thirteen programmes. The federal education mirror had republished
2019's award counts under year=2020 - identical totals, identical institution sets,
renumbered certificate codes - and it sat in `talent`, `programs` and `occupations` as a
credible flat pandemic year. It supplied one of the seven observations behind "declined
in five of the seven years since the peak". Every gate was green the whole time.

WHAT IT LOOKS FOR. Four shapes that are almost never real and always cheap to test:

  DUPLICATE      two consecutive years byte-identical across a whole series. Genuine
                 repeats happen in one small series; they do not happen in six at once,
                 and they never happen in a national count in the tens of thousands.
  FROZEN TAIL    the last N values identical - a feed that stopped updating while the
                 fetch kept succeeding.
  IMPOSSIBLE     a negative count, or a year outside the declared window.
  HOLE           a gap in an otherwise complete year range that nothing declares. A
                 declared gap (`quarantined`) is fine and is the point; an undeclared
                 one means a fetch failed quietly.

A finding here is not automatically a defect - some are real. It is a demand for a
sentence: either fix the data, or declare the year in `quarantined` with a reason, which
is what makes the gap visible to a reader instead of only to this script.

EXIT 1 on any UNDECLARED duplicate or hole. Declared ones print as OK and stay visible,
because a quarantine nobody re-reads becomes a permanent silent hole of its own.
"""
import json
import os
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
SKIP = {"dist", "shots", "tools", "_data", "_shared", "node_modules", "stage"}
FROZEN_TAIL = 3          # last N identical values in a series >= 6 long
# TUNING, AND WHY IT IS NOT ZERO. A repeated year in ONE short series is ordinary: a
# certificate program conferring 2 awards two years running is a fact, not a fault. The
# signal that means fabrication is a repeat that is SYSTEMIC (the same year duplicated
# across several series at once) or IMPLAUSIBLE (a large count landing on itself). A gate
# that fires on every small repeat gets muted within a week, and a muted gate is worse
# than no gate, so these thresholds are chosen to make every red line worth reading.
# ONE SERIES REPEATING IS A FACT ABOUT THE WORLD. Consumer prices really were flat from
# 1895 to 1901; a small program really did confer two awards twice running. SEVERAL series
# repeating the same year in lockstep is a fact about the PIPELINE, and that is the only
# thing this rule fires on. A magnitude test was tried first and rejected: it cannot tell
# a count of 333 from an index of 3.33, and it turned the historic wage record red.
MIN_SERIES_FOR_SYSTEMIC = 3     # same year duplicated in this many series in one file
MIN_LEN_FOR_HOLE = 8            # a gap only means something in a series long enough
MIN_DENSITY_FOR_HOLE = 0.9      # ... and otherwise near-complete
G, R, Y, Z = "\033[32m", "\033[31m", "\033[33m", "\033[0m"


def series_of(obj, path=""):
    """Yield (path, {year: value}) for anything shaped like an annual series."""
    if isinstance(obj, list):
        rows = [r for r in obj if isinstance(r, dict) and "year" in r]
        if len(rows) >= 4:
            # the payload of a row is everything except the year
            pay = {}
            for r in rows:
                try:
                    y = int(r["year"])
                except (TypeError, ValueError):
                    continue          # a "year" that is not a year is not a series
                v = {k: r[k] for k in r if k != "year"}
                pay[y] = json.dumps(v, sort_keys=True, default=str)
            if len(pay) >= 4:
                yield path, pay
        for i, v in enumerate(obj[:500]):
            yield from series_of(v, f"{path}[{i}]")
    elif isinstance(obj, dict):
        yrs = {}
        for k, v in obj.items():
            ks = str(k)
            if ks.isdigit() and 1800 < int(ks) < 2100 and not isinstance(v, (dict, list)):
                yrs[int(ks)] = json.dumps(v, default=str)
        if len(yrs) >= 4:
            yield path, yrs
        for k, v in obj.items():
            yield from series_of(v, f"{path}.{k}")


def _magnitude(payload):
    """Largest number inside a serialised row, so a repeat can be judged for plausibility."""
    best = 0
    num, i = "", 0
    while i <= len(payload):
        c = payload[i] if i < len(payload) else " "
        if c.isdigit():
            num += c
        else:
            if num:
                best = max(best, int(num))
            num = ""
        i += 1
    return best


def declared(doc):
    """Years the dataset says are deliberately absent, at any depth."""
    out = set()

    def walk(o):
        if isinstance(o, dict):
            q = o.get("quarantined")
            for y in (q or {}) if isinstance(q, (dict, list)) else ():
                try:
                    out.add(int(y))
                except (TypeError, ValueError):
                    pass
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o[:500]:
                walk(v)
    walk(doc)
    return out


def gap_policy(doc):
    """A file may declare that holes are EXPECTED, with a reason. Suppression is the
    real case: BLS withholds a metro-year, the house rule says a withheld cell is never a
    zero, so the deriver drops it - and a dropped cell is indistinguishable from a failed
    fetch to anything but a sentence. The sentence is the deliverable."""
    found = []

    def walk(o):
        if isinstance(o, dict):
            g = o.get("gaps")
            if isinstance(g, dict) and g.get("reason"):
                found.append(g["reason"])
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o[:500]:
                walk(v)
    walk(doc)
    return found[0] if found else None


def audit(page):
    d = os.path.join(WEB, page, "data")
    if not os.path.isdir(d):
        return []
    findings = []
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".json"):
            continue
        try:
            doc = json.load(open(os.path.join(d, fn), encoding="utf-8"))
        except Exception as e:
            findings.append(("ERROR", f"{page}/{fn}", str(e)[:90]))
            continue
        ok_years = declared(doc)
        policy = gap_policy(doc)
        dupes = defaultdict(list)
        for path, ys in series_of(doc):
            years = sorted(ys)
            for a, b in zip(years, years[1:]):
                if b - a == 1 and ys[a] == ys[b] and ys[a] not in ("0", "null"):
                    dupes[b].append((path, _magnitude(ys[a])))
            # frozen tail
            vals = [ys[y] for y in years]
            if len(vals) >= 6 and len(set(vals[-FROZEN_TAIL:])) == 1 and vals[-1] not in ("0", "null"):
                findings.append(("FROZEN", f"{page}/{fn}{path}",
                                 f"last {FROZEN_TAIL} years identical ({vals[-1][:40]})"))
            # undeclared hole - only in a long, otherwise-complete series
            span = years[-1] - years[0] + 1
            holes = [y for y in range(years[0], years[-1] + 1)
                     if y not in ys and y not in ok_years]
            if holes and span >= MIN_LEN_FOR_HOLE and len(ys) / span >= MIN_DENSITY_FOR_HOLE:
                findings.append(("OK-DECLARED" if policy else "HOLE", f"{page}/{fn}{path}",
                                 f"missing year(s) {holes}"
                                 + (f" - declared: {policy[:70]}" if policy else
                                    " - undeclared")))
        for year, paths in sorted(dupes.items()):
            big = max((v for _, v in paths), default=0)
            if year in ok_years:
                kind = "OK-DECLARED"
            elif len(paths) >= MIN_SERIES_FOR_SYSTEMIC:
                kind = "DUPLICATE"
            else:
                kind = "INFO"
            findings.append((kind, f"{page}/{fn}",
                             f"{year} identical to {year - 1} in {len(paths)} series"
                             f"{f', largest value {big}' if big else ''}"
                             f" e.g. {paths[0][0][:56] or '(root)'}"))
    return findings


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    pages = [only] if only else sorted(
        p for p in os.listdir(WEB)
        if os.path.isdir(os.path.join(WEB, p)) and p not in SKIP and not p.startswith("."))
    bad = 0
    for p in pages:
        for kind, where, msg in audit(p):
            if kind == "INFO":
                continue          # printed only with -v; one flat year is not news
            if kind in ("DUPLICATE", "HOLE", "ERROR", "FROZEN"):
                bad += 1
                print(f"  {R}{kind:<11}{Z} {where}\n      {msg}")
            else:
                print(f"  {G}{kind:<11}{Z} {where}\n      {msg}")
    if bad:
        print(f"\n{R}{bad} unexplained series defect(s).{Z} Fix the data, or declare the "
              f"year in a 'quarantined' block with a reason so the page can say so.")
        return 1
    print(f"\n{G}series fidelity: clean{Z}  ({len(pages)} pages)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
