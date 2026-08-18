"""Re-run every published claim against the data that produced it.

WHY THIS EXISTS
  A chart is a claim with a picture attached. When the underlying series revises — and
  95% of them do — the picture updates silently and the sentence beside it does not.
  This turns each headline sentence into an assertion that fails loudly instead.

  Every claim also carries `falsified_if`: the condition that would make it wrong. That
  is not a caveat. It is the thing a reviewer should attack first, written down by the
  person who made the claim.

USAGE
  python verify_claims.py            all artifacts
  python verify_claims.py churn      one
  python verify_claims.py --list     every claim and its falsification condition
"""
import json, os, sys, math

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))

GREEN, RED, YELLOW, DIM, OFF = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"


def one(it):
    """The single matching row. Raises if zero or many — an assertion that silently
    picked the first of three matches would be worse than no assertion."""
    xs = list(it)
    if len(xs) != 1:
        raise ValueError(f"expected exactly 1 row, got {len(xs)}")
    return xs[0]


def pct(a, b):
    return (a / b * 100) if b else float("nan")


def close(a, b, tol=1e-9):
    return abs(a - b) <= tol


ENV = {"one": one, "pct": pct, "close": close, "sum": sum, "len": len, "min": min,
       "max": max, "abs": abs, "round": round, "sorted": sorted, "set": set,
       "any": any, "all": all, "int": int, "float": float, "str": str,
       "math": math, "list": list, "range": range}


def load(artifact, spec):
    d = os.path.join(WEB, artifact, "data")
    if isinstance(spec, str):
        return json.load(open(os.path.join(d, spec), encoding="utf-8"))
    return {k: json.load(open(os.path.join(d, v), encoding="utf-8")) for k, v in spec.items()}


def run(artifact, verbose=False):
    cp = os.path.join(WEB, artifact, "claims.json")
    if not os.path.exists(cp):
        return None
    spec = json.load(open(cp, encoding="utf-8"))
    # An all-manual artifact has nothing to load, and demanding a data file it does not
    # need is how one page's leftover key took the whole gate down with a traceback. Load
    # lazily: if something is actually checked, a missing file still fails, and loudly.
    checked = [c for c in spec["claims"] if c.get("verify") != "manual"]
    D = load(artifact, spec["data"]) if checked and spec.get("data") else None
    results = []
    for c in spec["claims"]:
        # Not every claim is machine-checkable. A figure quoted from a project narrative
        # or a press release has no dataset to re-run against. Recording it as MANUAL
        # with its source and reviewer is honest; inventing a circular assertion that
        # checks a constant against itself is not.
        if c.get("verify") == "manual":
            results.append((c, "manual", ""))
            continue
        env = dict(ENV); env["D"] = D
        try:
            g = {"__builtins__": {}}; g.update(env)
            ok = bool(eval(c["assert"], g, {}))
            actual = ""
            if not ok and c.get("actual"):
                try:
                    actual = repr(eval(c["actual"], g, {}))
                except Exception as e:
                    actual = f"<{type(e).__name__}>"
            results.append((c, ok, actual))
        except Exception as e:
            results.append((c, None, f"{type(e).__name__}: {e}"))
    return spec, results


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    listing = "--list" in sys.argv
    arts = args or sorted(d for d in os.listdir(WEB)
                          if os.path.exists(os.path.join(WEB, d, "claims.json")))
    total = passed = failed = errored = manual = 0
    for a in arts:
        got = run(a)
        if not got:
            print(f"{a}: no claims.json"); continue
        spec, results = got
        src = spec.get("data")
        src = src if isinstance(src, str) else ", ".join(src.values()) if src \
            else "no dataset — every claim here is manual"
        print(f"\n{a}  {DIM}({len(results)} claims · {src}){OFF}")
        for c, ok, actual in results:
            total += 1
            if ok == "manual":
                manual += 1; mark = f"{DIM}MANL{OFF}"
            elif ok is True:
                passed += 1; mark = f"{GREEN}PASS{OFF}"
            elif ok is False:
                failed += 1; mark = f"{RED}FAIL{OFF}"
            else:
                errored += 1; mark = f"{YELLOW}ERR {OFF}"
            print(f"  {mark} {c['id']}")
            print(f"       {c['text']}")
            if ok == "manual":
                print(f"       {DIM}verified by hand against: {c['source']}{OFF}")
                if c.get("checked_by"):
                    print(f"       {DIM}checked by: {c['checked_by']}{OFF}")
            elif ok is not True:
                print(f"       {RED}assert{OFF} {c['assert']}")
                if actual:
                    print(f"       {RED}actual{OFF} {actual}")
            if listing:
                print(f"       {DIM}source:       {c['source']}{OFF}")
                print(f"       {DIM}falsified if: {c['falsified_if']}{OFF}")
                if c.get("official_check"):
                    print(f"       {DIM}cross-check:  {c['official_check']}{OFF}")
    print(f"\n{'-' * 60}")
    print(f"{total} claims · {GREEN}{passed} pass{OFF} · "
          f"{RED if failed else DIM}{failed} fail{OFF} · "
          f"{YELLOW if errored else DIM}{errored} error{OFF} · "
          f"{DIM}{manual} manual{OFF}")
    if manual:
        print(f"{DIM}MANUAL claims are not checked here. They are quoted from documents and "
              f"need a human or a council lane.{OFF}")
    if failed or errored:
        print(f"\n{RED}A failing claim means a published sentence no longer matches its data.{OFF}")
        print("Fix the sentence or the computation — never the assertion.")
    sys.exit(1 if (failed or errored) else 0)


if __name__ == "__main__":
    main()
