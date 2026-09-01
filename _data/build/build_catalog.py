"""The data catalog — every script, every output, every source, generated, never written.

WHAT IT ADDS. On 2026-08-18 the stack held 83 fetch/extract/derive scripts and 75 output
files. `PIPELINES.md` named 24 of the scripts; `SOURCES.json` named 20. Fifty-nine were in
neither. Every one of them ran and produced data that pages might depend on, and the only
way to learn what LEHD LODES contributes was to grep the folder. `METHODS-SOP.md` states the
rule this file obeys: "if a rule can be checked, it is not in a document — it is in code."
An inventory is checkable. So it is generated here and `verify_consistency.py` fails the
build when a script exists that the catalog does not know.

WHAT ONE ROW IS. One script in `_data/build/`, with: what it says it adds (from its own
docstring), what it writes (OBSERVED, not parsed — see below), whether each output exists,
when it was last fetched (from the output's own `meta`), which registry sources and which
published pages depend on it, and a list of everything wrong with it. A row for a script
that is broken, undocumented, or orphaned is the point of the catalog, not a failure of it.

HOW OUTPUTS ARE DISCOVERED — three independent witnesses, disagreements reported.
  1. STATIC. Regex for `OUT = os.path.join(HERE, "x.json")` and friends. Fast, brittle:
     39 scripts write through `out`, `p`, or a computed path and declare no `OUT` at all.
  2. OBSERVED. Each script is IMPORTED under a guard: `json.dump`, `builtins.open` in write
     mode, `urllib.request.urlopen`, `subprocess.run`, `sys.exit`, and `time.sleep` are
     patched to record the call and raise `_Probe`. The script gets as far as its first
     write, network call, or shell-out — recording every output path it targeted — and stops.
     Nothing is fetched, nothing is written, nothing sleeps. A script that reads its own
     inputs from disk (a `derive_*`) is allowed to read; one that needs an env key gets a
     stub key so it reaches its first network call instead of dying at `load_key()`.
     Scripts that fail import for any other reason are catalogued as `import_error` with
     the exception — that too is a finding.
  3. RECORDED. Every `*.json` in the folder is opened and its `meta` read. Outputs no
     script claims are catalogued as ORPHANS. Outputs a script claims that do not exist are
     catalogued as MISSING.
  Where static and observed disagree, both are shown. Where a script writes to a path
  outside this folder — one still points at a dead scratchpad from an earlier session — that
  is reported as `writes_outside_build`, not normalised away.

HOW IT FAILS OR DRIFTS — stated up front, because a catalog that rots silently is worse
than none.
  - It is a SNAPSHOT of the tree at run time. It goes stale the moment a script is added.
    Mitigation: `verify_consistency.py --catalog` compares `catalog.json` to the folder and
    fails on any script or output the catalog does not list; `stage/prepare.ps1` and the
    pre-push gate call it. Drift is caught at the next check, not the next reader.
  - The docstring witness trusts the docstring. A stale "WHAT IT ADDS" is faithfully
    catalogued as stale. There is no cure for that except the review trigger in
    `METHODS-SOP.md`; the catalog makes it visible by showing the docstring beside the
    output's actual `meta.row` so a reader can see when they disagree.
  - The observed witness stops at the FIRST guarded call. A script that writes a file, then
    fetches, then writes another, reveals only the first write. Multi-output scripts are
    therefore cross-checked against the RECORDED witness (which output files carry a
    `meta.source` naming this script) and against static regex; a script whose three
    witnesses disagree is flagged `witness_disagreement`, and the human decides.
  - Importing a script executes its module-level code. The guards stop the expensive and
    the destructive; they cannot stop a script that, say, deletes a file at import with
    `os.remove` before any guarded call. None here do (audited 2026-08-18), and the guard set
    is a list at the top of this file that can grow. If a script starts a `while True` loop
    before its first guarded call the catalog hangs — so each import runs with a 20-second
    wall clock and is catalogued as `import_timeout` if it trips.
  - `by_artifact` in `SOURCES.json` maps PAGES to SOURCES, and sources name scripts. So
    "which pages depend on this script" is derived through two hops and only sees scripts a
    registry source names. A script feeding a page through a `derive_*` that the registry
    does not mention shows as `no_registered_consumer` even though a page uses it. That is
    the registry's gap, reported here, not the catalog's error.
  - Timestamps come from `meta.fetched` inside each output, which is a string the fetcher
    wrote. If a fetcher forgets to update it, the catalog shows the forgotten date. File
    mtimes are carried alongside as a second opinion; a big gap between the two is flagged.
  - The catalog does not run any fetcher and cannot tell you a source has changed schema
    upstream. It tells you when the output was last produced and by what. Freshness is a
    prompt to re-run, not a guarantee the re-run will work.

WHAT THIS CATALOG DOES NOT SEE — two other data planes exist and are catalogued elsewhere.
  - **PIC InnovationOS production Supabase** — `cluster_metric_series` / `cluster_metric_observations`
    (51,566 observations, 540 series, back to 1992 as of the 2026-08-17 audit). Its catalog is the
    live table itself; PIPELINES.md section 2 summarises it. Nothing here writes to it, by rule.
  - **The GAC-PIC Obsidian vault + pic-master-db + pic-rag** — company atoms (4,283 cos x 63 cols),
    the SharePoint/vault RAG (81,093 units), and the vault identity gate. Those are governed by their
    own manifests in `Documents\GAC-PIC`, `Documents\pic-master-db`, `Documents\pic-rag`; the
    `vault` and `intake` entries in SOURCES.json are the only bridge into this stack.
  - **The PDF corpus** in `Documents\ohio-econdev-corpus` — seven folders with their own manifests;
    two extractors here (`extract_third_frontier_awards.py`, `extract_jobsohio_awards.py`) read it.
  A question that spans planes ("what do we know about Goodyear?") needs all three; this file is
  authoritative for exactly one: the federal/state feed layer in `_data/build/`.

OUTPUTS. `_data/catalog.json` (machine, complete) and `_data/CATALOG.md` (human, sorted by
what needs attention first). Both are regenerated from scratch every run; nothing is
hand-edited into either. `PIPELINES.md` keeps the DECISIONS; this keeps the INVENTORY.
"""
import ast
import builtins
import glob
import importlib.util
import io
import json
import os
import re
import re
import subprocess
import sys
import threading
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(os.path.dirname(HERE))
DATA = os.path.dirname(HERE)
OUT_JSON = os.path.join(DATA, "catalog.json")
OUT_MD = os.path.join(DATA, "CATALOG.md")
SOURCES = os.path.join(DATA, "SOURCES.json")
PIPELINES = os.path.join(DATA, "PIPELINES.md")

SCRIPT_GLOBS = ("fetch_*.py", "extract_*.py", "derive_*.py", "build_*.py")
INFRA = {"build_catalog.py", "verify_claims.py", "verify_consistency.py", "contact.py",
         "footprints.py", "build_pic12_geo.py"}
DOC_HEADS = ("WHAT IT ADDS", "WHAT ONE ROW IS", "WHAT IT IS NOT", "TRAPS", "SOURCE",
             "HOW OUTPUTS ARE DISCOVERED", "HOW IT FAILS OR DRIFTS")
IMPORT_TIMEOUT_S = 20
STUB_KEYS = ("CENSUS_API_KEY", "BEA_API_KEY", "FRED_API_KEY", "EIA_API_KEY", "USPTO_API_KEY",
             "BLS_API_KEY", "CORE_API_KEY", "CRUNCHBASE_API_KEY", "DATA_GOV_API_KEY")


# ------------------------------------------------------------------ witness 1: docstring
def docstring_of(path):
    src = open(path, encoding="utf-8", errors="replace").read()
    try:
        tree = ast.parse(src)
        doc = ast.get_docstring(tree) or ""
    except SyntaxError as e:
        return {"error": f"SyntaxError: {e}"}, src
    sections, cur, buf = {}, None, []
    for line in doc.splitlines():
        m = re.match(r"^([A-Z][A-Z ,&/'\-]{4,60}?)(?:[.:,—\-]|$)\s*(.*)$", line.strip())
        head = None
        if m:
            cand = m.group(1).strip()
            for h in DOC_HEADS:
                if cand.startswith(h):
                    head = h
                    break
        if head:
            if cur:
                sections[cur] = " ".join(buf).strip()
            cur, buf = head, [m.group(2)]
        elif cur:
            buf.append(line.strip())
    if cur:
        sections[cur] = " ".join(buf).strip()
    first = doc.strip().splitlines()[0].strip() if doc.strip() else ""
    return {"first_line": first, "sections": sections, "has_house_docstring":
            "WHAT IT ADDS" in sections and "WHAT ONE ROW IS" in sections,
            "has_traps": "TRAPS" in sections, "length": len(doc)}, src


# ------------------------------------------------------------------ witness 1b: static regex
def static_outputs(src):
    outs = set()
    for m in re.finditer(r'os\.path\.join\((?:HERE|os\.path\.dirname\([^)]*\))\s*,\s*["\']([^"\']+\.(?:json|jsonl|csv|txt))["\']', src):
        outs.add(m.group(1))
    for m in re.finditer(r'^\s*(?:OUT|OUT_[A-Z_]+)\s*=\s*r?["\']([^"\']+)["\']', src, re.M):
        outs.add(m.group(1))
    return sorted(outs)


def static_sources(src):
    urls = sorted(set(re.findall(r'https?://[a-zA-Z0-9.\-]+(?:/[^\s"\'){}<>]*)?', src)))
    hosts = sorted({re.sub(r"^https?://", "", u).split("/")[0] for u in urls})
    return {"hosts": hosts, "n_urls": len(urls)}


# ------------------------------------------------------------------ witness 2: observed import
class _Probe(Exception):
    pass


def observe(path):
    """Import the script with writes/network/shell/exit/sleep guarded. Record what it
    targets; stop at the first guarded call. Never lets it fetch, write, or sleep."""
    rec = {"writes": [], "reads": [], "network": [], "shell": [], "stopped_at": None,
           "import_error": None, "import_timeout": False}
    real_open, real_dump, real_urlopen, real_run, real_exit, real_sleep = (
        builtins.open, json.dump, urllib.request.urlopen, subprocess.run, sys.exit, time.sleep)
    real_popen = subprocess.Popen

    def g_open(file, mode="r", *a, **k):
        f = os.fspath(file) if not isinstance(file, int) else str(file)
        if any(c in mode for c in "wax+"):
            rec["writes"].append(f)
            rec["stopped_at"] = f"open({os.path.basename(f)},'{mode}')"
            raise _Probe()
        if f.endswith((".json", ".jsonl", ".csv", ".txt", ".env")):
            rec["reads"].append(f)
        return real_open(file, mode, *a, **k)

    def g_dump(obj, fp, *a, **k):
        name = getattr(fp, "name", "?")
        rec["writes"].append(str(name))
        rec["stopped_at"] = f"json.dump({os.path.basename(str(name))})"
        raise _Probe()

    def g_urlopen(req, *a, **k):
        url = req.full_url if hasattr(req, "full_url") else str(req)
        rec["network"].append(re.sub(r"[?&](key|api_key|user_key|UserID)=[^&]+", r"\1=<redacted>", url))
        rec["stopped_at"] = "urlopen"
        raise _Probe()

    def g_run(cmd, *a, **k):
        rec["shell"].append(cmd if isinstance(cmd, str) else " ".join(map(str, cmd))[:120])
        rec["stopped_at"] = "subprocess"
        raise _Probe()

    def g_exit(code=0):
        rec["stopped_at"] = f"sys.exit({code})"
        raise _Probe()

    def g_sleep(s):
        return None

    env_backup = {k: os.environ.get(k) for k in STUB_KEYS}
    for k in STUB_KEYS:
        os.environ.setdefault(k, "CATALOG-PROBE-STUB")
    builtins.open, json.dump, urllib.request.urlopen, subprocess.run, sys.exit, time.sleep = (
        g_open, g_dump, g_urlopen, g_run, g_exit, g_sleep)
    subprocess.Popen = g_run
    old_argv, old_cwd, old_stdout, old_stderr = sys.argv, os.getcwd(), sys.stdout, sys.stderr
    sys.argv = [path]
    os.chdir(HERE)
    sys.stdout = sys.stderr = io.StringIO()
    done = threading.Event()
    err = {}

    def runner():
        try:
            spec = importlib.util.spec_from_file_location("_cat_" + os.path.basename(path)[:-3], path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
        except _Probe:
            pass
        except SystemExit as e:
            rec["stopped_at"] = f"SystemExit({e.code})"
        except BaseException as e:  # noqa
            err["e"] = f"{type(e).__name__}: {str(e)[:200]}"
        finally:
            done.set()

    t = threading.Thread(target=runner, daemon=True)
    t.start()
    done.wait(IMPORT_TIMEOUT_S)
    if not done.is_set():
        rec["import_timeout"] = True
    if err:
        rec["import_error"] = err["e"]

    builtins.open, json.dump, urllib.request.urlopen, subprocess.run, sys.exit, time.sleep = (
        real_open, real_dump, real_urlopen, real_run, real_exit, real_sleep)
    subprocess.Popen = real_popen
    sys.argv, sys.stdout, sys.stderr = old_argv, old_stdout, old_stderr
    os.chdir(old_cwd)
    for k, v in env_backup.items():
        if v is None:
            os.environ.pop(k, None)
    rec["writes"] = sorted({_portable(w) for w in rec["writes"]})
    rec["reads"] = sorted({_portable(r) for r in rec["reads"]})[:12]
    return rec


# ------------------------------------------------------------------ witness 3: recorded outputs
def recorded_outputs():
    out = {}
    for f in sorted(glob.glob(os.path.join(HERE, "*.json"))):
        name = os.path.basename(f)
        row = {"file": name, "bytes": os.path.getsize(f),
               "mtime": time.strftime("%Y-%m-%d", time.localtime(os.path.getmtime(f))),
               "meta": None, "unreadable": None}
        try:
            d = json.load(open(f, encoding="utf-8"))
            m = d.get("meta") if isinstance(d, dict) else None
            if isinstance(m, dict):
                row["meta"] = {k: (m[k] if isinstance(m[k], (str, int, float, bool)) else
                                   json.dumps(m[k])[:160])
                               for k in ("fetched", "as_of", "row", "what_one_row_is", "source",
                                         "sources", "counts", "footprint") if k in m}
        except Exception as e:
            row["unreadable"] = f"{type(e).__name__}"
        out[name] = row
    return out


# ------------------------------------------------------------------ registry cross-reference
def registry():
    try:
        d = json.load(open(SOURCES, encoding="utf-8"))
    except Exception as e:
        return {}, {}, f"SOURCES.json unreadable: {e}"
    script_to_sources = {}
    for key, s in d.get("sources", {}).items():
        for tok in str(s.get("script", "")).replace(",", " ").split():
            if tok.endswith(".py"):
                script_to_sources.setdefault(os.path.basename(tok), []).append(key)
    source_to_pages = {}
    for page, srcs in d.get("by_artifact", {}).items():
        for s in (srcs if isinstance(srcs, list) else [srcs]):
            source_to_pages.setdefault(s, []).append(page)
    return script_to_sources, source_to_pages, None


def pipelines_mentions():
    try:
        s = open(PIPELINES, encoding="utf-8").read()
    except Exception:
        return set()
    return set(re.findall(r"(?:fetch|extract|derive|build)_[a-z0-9_]+\.py", s))


# ------------------------------------------------------------------ main
def _scrub(obj):
    """Last line of defence: no absolute path survives into the catalog.

    `_portable` fixes the paths the prober collects, but absolute paths also arrive through
    channels it never sees — an env value a script echoes back, a filename inside an
    ImportError message. Both were found in the staged public tree on 2026-08-19, after
    `_portable` had already cleaned the 25 obvious ones. This pass runs over the finished
    structure, so a NEW channel is covered the day it appears rather than the day somebody
    notices. Drive-letter and UNC paths become a marker plus the basename, which keeps the
    row readable without publishing the author's machine layout.
    """
    pat = re.compile(r"""(?:[A-Za-z]:[\\/]|\\\\)[^"'<>|\n]{3,}""")
    # THAT PATTERN IS WINDOWS-ONLY, so on macOS and Linux this "last line of defence"
    # defended nothing. The catalog in the tree on 2026-09-01 carried an absolute POSIX
    # path with the author's home-directory name in it, through the ImportError channel
    # the docstring above names, into a file that ships in the public cut. The two
    # prefixes that can leak are known here, so they are matched literally: guessing at
    # path shapes would scrub the https:// URLs the registry rows are full of.
    roots = {os.path.abspath(WEB), os.path.realpath(WEB), os.path.expanduser("~")}
    posix = sorted((r for r in roots if r not in ("", "/")), key=len, reverse=True)
    posix_pat = re.compile("(?:" + "|".join(re.escape(r) for r in posix) + r")[^\"'<>|\n]*")

    def fix(text):
        def one(m):
            tail = re.split(r"[\\/]", m.group(0).rstrip("\\/"))[-1]
            return "<path>/" + tail if tail else "<path>"
        return posix_pat.sub(one, pat.sub(one, text))

    if isinstance(obj, str):
        return fix(obj)
    if isinstance(obj, list):
        return [_scrub(v) for v in obj]
    if isinstance(obj, dict):
        return {fix(k) if isinstance(k, str) else k: _scrub(v) for k, v in obj.items()}
    return obj


def _portable(path):
    """Every path in the catalog must be repo-relative, because this file is PUBLISHED.

    The catalog ships in the public cut, so an absolute path would put the author's machine
    layout (a full drive path under the author home) into a public artifact and make the
    two clones of the same commit. Found by the leak scan on 2026-08-19: 25 absolute paths
    had reached the staged tree, because the old normalisation only stripped paths under
    `_data/build/` and left everything under the web root alone.

    Under _data/build  -> relative to it.  Elsewhere in the tree -> relative to the web root.
    Outside the tree entirely -> the basename only, marked, since the location is machine
    state and naming it tells a reader nothing they can act on.
    """
    if not os.path.isabs(path):
        return path.replace("\\", "/")
    norm = os.path.normpath(path)
    for base in (HERE, WEB):
        if norm.startswith(base + os.sep) or norm == base:
            return os.path.relpath(norm, base).replace("\\", "/")
    return "<outside-repo>/" + os.path.basename(norm)


def main():
    t0 = time.time()
    scripts = sorted({os.path.basename(p) for g in SCRIPT_GLOBS for p in glob.glob(os.path.join(HERE, g))}
                     - INFRA)
    rec_out = recorded_outputs()
    s2src, src2pg, reg_err = registry()
    in_pipelines = pipelines_mentions()
    rows, claimed_outputs = [], set()

    for name in scripts:
        path = os.path.join(HERE, name)
        doc, src = docstring_of(path)
        static = static_outputs(src)
        obs = observe(path)
        # The static regex cannot tell a READ from a WRITE — `os.path.join(HERE, "patents.json")`
        # in derive_credit.py is an input. So the OBSERVED witness is authoritative wherever it
        # saw a write; static is the fallback only when observation saw nothing (import error,
        # timeout, or a script that never reached a guarded call). Reads the observer recorded
        # are subtracted from the static set so an input is never catalogued as an output.
        # A FETCHER's first action is to hit the network, so the observer stops before it
        # ever writes; only derive_* / extract_* (which read local inputs, then write) get
        # caught in the act. That is expected, not a defect. So: outputs = everything the
        # observer SAW written, plus everything static regex names MINUS anything the observer
        # saw READ. Each output records how it was learned, and the flag below only fires
        # when neither witness produced anything.
        obs_reads = {os.path.basename(r) for r in obs["reads"]}
        static_clean = [o for o in static if os.path.basename(o) not in obs_reads]
        outs = sorted(set(obs["writes"]) | set(static_clean))
        how = {o: ("observed" if o in obs["writes"] else "static") for o in outs}
        static = static_clean
        outs_in_build = [o for o in outs if not os.path.isabs(o) and "/" not in o and "\\" not in o]
        # derive_* scripts legitimately write to web/<page>/data/ — that is the house layout,
        # not a stray. Normalise those to "page/data/file" and only flag paths that resolve
        # OUTSIDE the web tree (a dead scratchpad, a Desktop folder that no longer exists).
        page_outs, outside = [], []
        for o in outs:
            if o in outs_in_build:
                continue
            ap = os.path.normpath(os.path.join(HERE, o)) if not os.path.isabs(o) else os.path.normpath(o)
            if ap.startswith(os.path.normpath(WEB) + os.sep):
                page_outs.append(os.path.relpath(ap, WEB).replace("\\", "/"))
            else:
                outside.append(o)
        for o in outs_in_build:
            claimed_outputs.add(o)
        exists = {o: (o in rec_out) for o in outs_in_build}
        srcs = s2src.get(name, [])
        pages = sorted({p for s in srcs for p in src2pg.get(s, [])})
        witnesses = {"static": sorted(static), "observed": sorted(obs["writes"])}
        # underscore-prefixed files (_rows.jsonl, _cache.json) are resume/working files by
        # convention; a script that writes its resume log first is not "disagreeing" with
        # the regex that saw its final output. Compare only the non-working outputs.
        # "disagreement" now means the catalog had to FALL BACK to static regex because
        # observation saw no write — the outputs listed are inferred, not witnessed.
        disagree = False  # replaced by per-output provenance in `output_learned_by`

        flags = []
        if doc.get("error"):
            flags.append("syntax_error")
        if not doc.get("has_house_docstring"):
            flags.append("no_house_docstring")
        if not doc.get("has_traps"):
            flags.append("no_traps_section")
        if obs["import_error"]:
            flags.append("import_error")
        if obs["import_timeout"]:
            flags.append("import_timeout")
        if not outs:
            flags.append("no_output_detected")
        if outside:
            flags.append("writes_outside_build")
        # Underscore-prefixed files are resume logs / caches that are consumed and removed on
        # a clean run; their absence is normal. Only a missing FINAL output is a finding.
        if any(not v for o, v in exists.items() if not os.path.basename(o).startswith("_")) or            any(not os.path.exists(os.path.join(WEB, o)) for o in page_outs):
            flags.append("output_missing_on_disk")
        if not srcs:
            flags.append("not_in_SOURCES.json")
        if srcs and not pages:
            flags.append("no_registered_consumer")
        if name not in in_pipelines:
            flags.append("not_in_PIPELINES.md")

        # freshness from the output's own meta vs the file mtime
        fresh = []
        for o in outs_in_build:
            r = rec_out.get(o)
            if not r:
                continue
            f = (r["meta"] or {}).get("fetched") or (r["meta"] or {}).get("as_of")
            fresh.append({"output": o, "meta_fetched": f, "file_mtime": r["mtime"], "bytes": r["bytes"],
                          "row": (r["meta"] or {}).get("row") or (r["meta"] or {}).get("what_one_row_is")})
            if f and isinstance(f, str) and re.match(r"\d{4}-\d{2}-\d{2}", f):
                if abs((time.mktime(time.strptime(f[:10], "%Y-%m-%d")) -
                        time.mktime(time.strptime(r["mtime"], "%Y-%m-%d"))) / 86400) > 3:
                    flags.append("meta_fetched_vs_mtime_gap")

        rows.append({
            "script": name,
            "kind": name.split("_")[0],
            "what_it_adds": (doc.get("sections", {}).get("WHAT IT ADDS") or doc.get("first_line") or "")[:600],
            "what_one_row_is": (doc.get("sections", {}).get("WHAT ONE ROW IS") or "")[:400],
            "traps": (doc.get("sections", {}).get("TRAPS") or "")[:600],
            "docstring": {k: doc.get(k) for k in ("has_house_docstring", "has_traps", "length")},
            "hosts": static_sources(src)["hosts"],
            "outputs": outs_in_build,
            "page_outputs": page_outs,
            "page_outputs_exist": {o: os.path.exists(os.path.join(WEB, o)) for o in page_outs},
            "outputs_exist": exists,
            "writes_outside_build": outside,
            "witnesses": witnesses,
            "output_learned_by": how,
            "observed_stop": obs["stopped_at"],
            "observed_network": obs["network"][:4],
            "observed_reads": obs["reads"],
            "import_error": obs["import_error"],
            "registry_sources": srcs,
            "consuming_pages": pages,
            "in_pipelines_md": name in in_pipelines,
            "freshness": fresh,
            "flags": sorted(set(flags)),
        })

    # Third witness. A fetcher that dies at its first URL check (SystemExit before any write)
    # leaves its output unclaimed by both other witnesses — but the output's own `meta.source`
    # names the upstream, and usually exactly one script hits that host. Match on a distinctive
    # host token; where more than one script matches, leave it an orphan and let a human decide.
    host_to_scripts = {}
    for r in rows:
        for h in r["hosts"]:
            host_to_scripts.setdefault(h, set()).add(r["script"])
    for o, rec in rec_out.items():
        if o in claimed_outputs or o.startswith("_"):
            continue
        src = str((rec.get("meta") or {}).get("source", "")).lower()
        if not src:
            continue
        hits = {sc for h, scs in host_to_scripts.items() for sc in scs
                if h.lower() in src or any(t in src for t in h.lower().split(".")[:-1] if len(t) > 4)}
        # tie-break by filename stem appearing in the script name (lodes_2019.json -> fetch_lodes*)
        stem = o.split(".")[0].split("_")[0]
        stem_hits = {sc for sc in hits if stem in sc}
        pick = stem_hits if stem_hits else hits
        if len(pick) == 1:
            sc = next(iter(pick))
            for r in rows:
                if r["script"] == sc:
                    r["outputs"].append(o); r["outputs"] = sorted(set(r["outputs"]))
                    r["outputs_exist"][o] = True
                    r.setdefault("output_learned_by", {})[o] = "meta.source"
                    claimed_outputs.add(o)
                    break
    orphans = sorted(o for o in rec_out if o not in claimed_outputs and not o.startswith("_")
                     and o not in ("catalog.json",))
    summary = {
        "generated": time.strftime("%Y-%m-%d %H:%M"),
        "seconds": round(time.time() - t0, 1),
        "scripts": len(rows),
        "outputs_on_disk": len(rec_out),
        "outputs_claimed": len(claimed_outputs),
        "orphan_outputs": len(orphans),
        "registry_error": reg_err,
        "flag_counts": {},
    }
    for r in rows:
        for f in r["flags"]:
            summary["flag_counts"][f] = summary["flag_counts"].get(f, 0) + 1
    summary["flag_counts"] = dict(sorted(summary["flag_counts"].items(), key=lambda kv: -kv[1]))

    cat = {"meta": {"what_this_is": "GENERATED inventory of _data/build/. Do not edit. Regenerate with "
                                    "python _data/build/build_catalog.py. Decisions live in PIPELINES.md.",
                    **summary},
           "scripts": rows,
           "orphan_outputs": [rec_out[o] for o in orphans],
           "outputs": rec_out}
    cat = _scrub(cat)
    json.dump(cat, open(OUT_JSON, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    write_md(cat)
    print(f"{len(rows)} scripts · {len(rec_out)} outputs · {len(orphans)} orphans · {summary['seconds']}s")
    for k, v in summary["flag_counts"].items():
        print(f"  {v:>3}  {k}")
    print(f"wrote {OUT_JSON}\nwrote {OUT_MD}")


def write_md(cat):
    m = cat["meta"]
    L = ["# Data catalog — `_data/build/`", "",
         f"**Generated {m['generated']}** by `build_catalog.py` in {m['seconds']}s. **Do not edit; regenerate.** "
         "This is the INVENTORY. Decisions, scope, and traps that need judgment are in `PIPELINES.md`; "
         "the rules a machine cannot check are in `METHODS-SOP.md`.", "",
         f"{m['scripts']} scripts · {m['outputs_on_disk']} output files on disk · "
         f"{m['outputs_claimed']} claimed by a script · **{m['orphan_outputs']} orphan outputs no script claims**", "",
         "## What needs attention", "",
         "| flag | scripts | means |", "|-|-|-|"]
    MEAN = {
        "not_in_PIPELINES.md": "the decisions register does not mention this script",
        "not_in_SOURCES.json": "no registry source names it — its data cannot show a 'Reproduce this' block",
        "no_house_docstring": "missing WHAT IT ADDS / WHAT ONE ROW IS — a reader cannot tell what a row is without opening the code",
        "no_traps_section": "no TRAPS — the failure modes were not written down",
        "no_registered_consumer": "a registry source names it but no published page maps to that source",
        "no_output_detected": "neither static regex nor guarded import found a write — check by hand",
        "output_missing_on_disk": "the script targets an output that is not present — never run, or output moved",
        "writes_outside_build": "writes to a path outside _data/build/ — one still points at a dead scratchpad",
        "import_error": "the module raised on guarded import — see the row",
        "import_timeout": f"module-level code ran >{IMPORT_TIMEOUT_S}s before any guarded call",
        "meta_fetched_vs_mtime_gap": "output's own meta.fetched differs from file mtime by >3 days — fetcher forgot to stamp, or file was copied",
        "syntax_error": "does not parse",
    }
    for k, v in m["flag_counts"].items():
        L.append(f"| `{k}` | {v} | {MEAN.get(k, '')} |")
    L += ["", "## Scripts", "",
          "Sorted: most flags first, then name. `▲` = registry source(s) · `→` = pages that consume it. "
          "Outputs marked ᵃ were learned by static regex (the script fetches before it writes, so the guarded import "
          "stopped at the network call); ᵇ were attributed via the output's own meta.source; unmarked outputs were witnessed being written.", ""]
    for r in sorted(cat["scripts"], key=lambda r: (-len(r["flags"]), r["script"])):
        L.append(f"### `{r['script']}`")
        if r["flags"]:
            L.append("**Flags:** " + " · ".join(f"`{f}`" for f in r["flags"]))
        if r["what_it_adds"]:
            L.append(f"**Adds.** {r['what_it_adds']}")
        if r["what_one_row_is"]:
            L.append(f"**One row.** {r['what_one_row_is']}")
        outs = ", ".join(f"`{o}`" + ("" if r["outputs_exist"].get(o) else " *(missing)*") +
                         ({"observed": "", "static": "ᵃ", "meta.source": "ᵇ"}.get(r.get("output_learned_by", {}).get(o), "ᵃ")) for o in r["outputs"])
        outs += ("  ·  " if outs and r.get("page_outputs") else "") + ", ".join(
            f"`{o}`" + ("" if r["page_outputs_exist"].get(o) else " *(missing)*") for o in r.get("page_outputs", []))
        L.append(f"**Writes.** {outs or '—'}" + (f"  · **OUTSIDE web tree:** `{r['writes_outside_build']}`" if r["writes_outside_build"] else ""))
        if r["freshness"]:
            L.append("**Last fetched.** " + " · ".join(
                f"`{f['output']}` {f['meta_fetched'] or '?'} (mtime {f['file_mtime']}, {f['bytes']//1024} KB)"
                for f in r["freshness"]))
        if r["hosts"]:
            L.append("**Hosts.** " + ", ".join(r["hosts"][:6]) + (" …" if len(r["hosts"]) > 6 else ""))
        L.append("**Registry.** ▲ " + (", ".join(r["registry_sources"]) or "—") + "  → " +
                 (", ".join(r["consuming_pages"]) or "—") +
                 ("  · in PIPELINES.md" if r["in_pipelines_md"] else ""))
        if r["import_error"]:
            L.append(f"**Import error.** `{r['import_error']}`")
        if r["traps"]:
            L.append(f"**Traps.** {r['traps'][:400]}{'…' if len(r['traps']) > 400 else ''}")
        L.append("")
    if cat["orphan_outputs"]:
        L += ["## Orphan outputs — on disk, no script claims them", "",
              "| file | mtime | KB | meta.source |", "|-|-|-|-|"]
        for o in cat["orphan_outputs"]:
            L.append(f"| `{o['file']}` | {o['mtime']} | {o['bytes']//1024} | {(o['meta'] or {}).get('source','')[:80]} |")
    open(OUT_MD, "w", encoding="utf-8").write("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
