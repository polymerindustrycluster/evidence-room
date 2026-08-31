"""Re-check the things that are true in two places at once.

WHY THIS EXISTS
  `verify_claims.py` guards each published sentence against the data that produced it.
  Nothing guarded the other class of defect: a fact recorded in two places, with nothing
  forcing the copies to agree. An audit on 2026-08-17 found, in a single afternoon:

    - a page whose prose said "these fourteen counties" over twelve-county data
    - a source registry naming two fetch scripts that do not exist, on six pages that
      publish "Reproduce this" blocks citing them
    - a bundle six hours behind its source, shipping superseded logic
    - three pages passing `meta: {}` to the methodology block, publishing no limits at all
    - two files named `peers.json` differing by a factor of 83
    - an artifact (`credit`) that builds and ships but is unreachable from the hub

  Every one of those is the same failure. None was caught by a test, and two ad-hoc
  surveys run to look for them returned WRONG answers — one read the alphabetically-first
  data file instead of the one the page renders, one used a regex that missed `meta: {}`.
  That is the argument for this file: a repo this size cannot be audited by asking it
  questions, because the questions are wrong more often than the data is.

WHAT IT DOES NOT DO
  It does not check whether a claim's assertion actually bounds the sentence it protects
  (`verify_claims.py` runs the assertions; judging whether a band is too loose is
  inference, and inference is a human's job). It does not check prose for truth. It
  checks agreement between things that are supposed to already agree.

USAGE
  python _data/build/verify_consistency.py          # human-readable
  python _data/build/verify_consistency.py --json   # machine-readable
  Exit 1 if any ERROR. WARNs do not fail the run.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
BUILD = HERE
DIST = os.path.join(WEB, "dist")

# Folders under web/ that are not artifacts.
SUPPORT = {"_data", "_shared", "dist", "tools", "shots", "node_modules"}

# Artifacts allowed to ship without claims.json, and why. A page with no falsifiable
# sentence is legitimate; a page that simply never got one is not, so the exemption is
# named here rather than inferred from the file's absence.
NO_CLAIMS_OK = {
    "index": "hub page — asserts nothing of its own, links pages that do",
    "funding-map": "renders an award register; every figure is a row in the source, not a derived claim",
    "timeline": "renders a date register; same reasoning as funding-map",
}

# Number words a footprint might be spelled out as, mapped to the count they mean.
NUMBER_WORDS = {
    "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
}

findings: list[tuple[str, str, str, str]] = []   # (severity, check, subject, message)


def err(check: str, subject: str, message: str) -> None:
    findings.append(("ERROR", check, subject, message))


def warn(check: str, subject: str, message: str) -> None:
    findings.append(("WARN", check, subject, message))


def artifacts() -> list[str]:
    """A subfolder of web/ holding an index.html. Same rule tools/bundle.mjs uses."""
    return sorted(
        d for d in os.listdir(WEB)
        if d not in SUPPORT
        and not d.startswith("_")
        and os.path.isfile(os.path.join(WEB, d, "index.html"))
    )


def read(*parts: str) -> str:
    with open(os.path.join(*parts), encoding="utf-8", errors="replace") as fh:
        return fh.read()


def load_json(path: str):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


# --------------------------------------------------------------- 1. registry scripts
def check_registry_scripts(reg: dict) -> None:
    """`script` must name files that exist, or be null with a stated reason.

    The registry's own readme promises "run it and you get the same bytes". Naming a
    script that is not on disk breaks that promise on every page citing the source, which
    is worse than naming none — a reader who cannot find the file assumes they are wrong.
    """
    by_art = reg.get("by_artifact", {})
    for key, src in reg.get("sources", {}).items():
        pages = sorted(a for a, keys in by_art.items() if key in keys)
        raw = src.get("script")
        if raw is None:
            why = [k for k in (src.get("filters") or {}) if "reproduc" in k.lower()]
            if not why:
                err("registry-script", key,
                    "script is null but no filters key explains why it cannot be re-run "
                    f"(pages: {', '.join(pages) or 'none'})")
            continue
        names = [n.strip().replace("_data/build/", "") for n in raw.split(",") if n.strip()]
        if not names:
            err("registry-script", key, "script is an empty string; use null with a reason")
            continue
        for n in names:
            if not n.endswith(".py"):
                err("registry-script", key,
                    f"{n!r} is prose in a path field; use null with a reproducibility note")
            elif not os.path.exists(os.path.join(BUILD, n)):
                err("registry-script", key,
                    f"names {n} which is not on disk — "
                    f"{len(pages)} page(s) publish it as reproducible: {', '.join(pages)}")


# ------------------------------------------------------------- 2. registry coverage
def check_registry_coverage(reg: dict, arts: list[str]) -> None:
    by_art = reg.get("by_artifact", {})
    sources = reg.get("sources", {})
    for a in arts:
        if a not in by_art:
            err("registry-coverage", a, "absent from by_artifact — publishes no provenance")
    for a in by_art:
        if a not in arts:
            err("registry-coverage", a, "by_artifact row has no artifact folder")
    for a, keys in by_art.items():
        for k in keys:
            if k not in sources:
                err("registry-coverage", a, f"cites source {k!r} which is not in sources")
    used = {k for keys in by_art.values() for k in keys}
    for k in sources:
        if k not in used:
            warn("registry-coverage", k, "source entry no artifact uses")


# ------------------------------------------------------------------ 3. required files
def check_required_files(arts: list[str]) -> None:
    for a in arts:
        for f in ("index.html", "app.js"):
            if not os.path.isfile(os.path.join(WEB, a, f)):
                err("required-file", a, f"missing {f}")
        if not os.path.isfile(os.path.join(WEB, a, "claims.json")):
            if a in NO_CLAIMS_OK:
                continue
            err("required-file", a,
                "no claims.json — no sentence on this page is falsifiable. If that is "
                "deliberate, add it to NO_CLAIMS_OK with a reason.")


# ------------------------------------------------------- 4. methodology gets real meta
METHODOLOGY = re.compile(r"PV\.methodology\s*\(\s*\{(.*?)\}\s*\)\s*;", re.S)
EMPTY_META = re.compile(r"meta:\s*\{\s*\}")
META_VAR = re.compile(r"meta:\s*([A-Za-z_]\w*)\.meta")
DATA_CALL = r"(?:const|let|var)\s+{}\s*=\s*await\s+PV\.data\(\s*['\"]([^'\"]+)"

def _key_sets() -> dict[str, set[str]]:
    """Read the renderer's three classification sets rather than restating them.

    Keeping a second copy of the rule is the defect this harness exists to catch, so it
    parses the source. That is fragile in known ways and both council families said so:
    single quotes, a spread, a `.add()` call, or a `]);` inside a comment would all defeat
    it. Mitigated by failing closed — an unparseable or empty set aborts the run rather
    than quietly treating every key as unclassified — but the durable fix is to export
    these from one shared JSON both languages load.
    """
    src = read(WEB, "_shared", "picviz.js")
    out: dict[str, set[str]] = {}
    for name in ("LIMITS", "METHOD", "STRUCTURAL"):
        m = re.search(rf"const {name} = new Set\(\[(.*?)\]\);", src, re.S)
        if not m:
            raise SystemExit(
                f"verify_consistency: could not find {name} in _shared/picviz.js. The "
                "renderer's classification moved; update this parser rather than guessing."
            )
        keys = set(re.findall(r'"([^"]+)"', m.group(1)))
        if not keys:
            raise SystemExit(
                f"verify_consistency: parsed {name} out of picviz.js but it is EMPTY. "
                "Almost certainly a quoting change the regex cannot see — refusing to run "
                "rather than reporting every key as unclassified."
            )
        out[name] = keys
    return out


def _structural_keys() -> set[str]:
    """Keys that are not published as limitation prose (STRUCTURAL + METHOD)."""
    s = _key_sets()
    return s["STRUCTURAL"] | s["METHOD"]


def check_meta_classified(arts: list[str]) -> None:
    """Every prose meta key must be classified in picviz.js. Unknown = ERROR.

    Fail-closed publication, fail-loud validation. The renderer publishes only what is in
    LIMITS or METHOD, so an unclassified key cannot leak onto a public page — and this
    check means it cannot be silently dropped either, which is how 28 real limitations
    went unpublished until 2026-08-17. Adding a meta key is a deliberate act: classify it.
    """
    sets = _key_sets()
    known = sets["LIMITS"] | sets["METHOD"] | sets["STRUCTURAL"]
    for a in arts:
        ddir = os.path.join(WEB, a, "data")
        if not os.path.isdir(ddir):
            continue
        for f in sorted(os.listdir(ddir)):
            if not f.endswith(".json"):
                continue
            try:
                meta = (load_json(os.path.join(ddir, f)).get("meta") or {})
            except Exception:
                continue
            for k, v in meta.items():
                if isinstance(v, str) and len(v.strip()) >= 25 and k not in known:
                    err("meta-classified", f"{a}/data/{f}",
                        f"meta key {k!r} is in none of LIMITS / METHOD / STRUCTURAL, so it "
                        "is not published and nobody decided that. Classify it in "
                        "_shared/picviz.js.")


def _limits(meta: dict, structural: set[str]) -> list[str]:
    """Same rule picviz.js applies: prose, not structural, long enough to be a sentence."""
    return [v for k, v in meta.items()
            if isinstance(v, str) and k not in structural and len(v.strip()) >= 25]


def _strip_comments(src: str) -> str:
    """Drop // line comments and /* */ blocks before pattern-matching.

    A commented-out `PV.methodology(...)` used to satisfy the methodology check — the
    regex cannot tell live code from a corpse. Cheap and imperfect (it will also blank a
    `//` inside a string literal) but it fails toward reporting a missing call, which is
    the safe direction.
    """
    src = re.sub(r"/\*.*?\*/", " ", src, flags=re.S)
    return re.sub(r"(?m)^\s*//.*$", "", src)


def _rendered_meta(a: str) -> tuple[str | None, dict | None]:
    """The data file this page actually renders its meta from, and that file's meta.

    Every check that needs a page's metadata MUST come through here. An earlier version of
    check_footprint_prose walked `sorted(os.listdir(data/))` and took the first file with a
    footprint — which is the exact defect this file's own header cites as the reason it
    exists ("read the alphabetically-first data file instead of the one the page renders").
    Two council families flagged it independently. One resolver, used everywhere.
    """
    app = os.path.join(WEB, a, "app.js")
    if not os.path.isfile(app):
        return None, None
    src = _strip_comments(read(app))
    m = METHODOLOGY.search(src)
    if not m:
        return None, None
    var = META_VAR.search(m.group(1))
    if not var:
        return None, None
    d = re.search(DATA_CALL.format(re.escape(var.group(1))), src)
    if not d:
        return None, None
    path = os.path.join(WEB, a, "data", d.group(1))
    if not os.path.isfile(path):
        return d.group(1), None
    try:
        return d.group(1), (load_json(path).get("meta") or {})
    except Exception:
        return d.group(1), None


def check_methodology(arts: list[str]) -> None:
    """Every page must render a methodology block, and publish at least one limitation.

    ONE SEVERITY FOR ONE READER-VISIBLE OUTCOME. Earlier this graded `meta: {}` as ERROR
    while an inline literal with no prose, an untraceable variable, and PVSources without
    a limits array were all WARN — four routes to the identical published page (a
    methodology block with an empty Limitations section), one of which failed the build
    and three of which did not. Both council families called that out. The reader cannot
    see which code path produced the silence, so neither does the severity.
    """
    structural = _structural_keys()
    for a in arts:
        app = os.path.join(WEB, a, "app.js")
        html = os.path.join(WEB, a, "index.html")
        src = _strip_comments(read(app) if os.path.isfile(app) else "")
        page = _strip_comments(read(html) if os.path.isfile(html) else "")
        blob = src + page

        if "PVSources.render" in blob:
            # The standalone renderer takes its limitations as an explicit array, since it
            # cannot share picviz.js's exclusion rule without copying it. Count real
            # strings: `limits: [""]` and `limits: [null]` used to satisfy this.
            call = re.search(r"PVSources\.render\((.*?)\)\s*;", blob, re.S)
            arr = re.search(r"limits\s*:\s*\[(.*?)\]", call.group(1), re.S) if call else None
            real = [s for s in re.findall(r"['\"](.*?)['\"]", arr.group(1), re.S)
                    if len(s.strip()) >= 25] if arr else []
            if real:
                continue
            err("methodology", a,
                "calls PVSources.render() with no usable limits array — publishes sources "
                "and an empty Limitations section")
            continue

        m = METHODOLOGY.search(src)
        if not m:
            err("methodology", a, "no PV.methodology() call — publishes no provenance")
            continue
        arg = m.group(1)

        var = META_VAR.search(arg)
        if not var:
            # An inline literal rather than `X.meta` — a legitimate shape for a page whose
            # data file carries no meta block. Judge it on whether it contains limitation
            # PROSE. The previous version accepted any non-structural KEY NAME, so the key
            # `page` alone satisfied it and the branch never checked anything at all.
            strings = [s for s in re.findall(r"['\"](.*?)['\"]", arg, re.S)
                       if len(s.strip()) >= 25]
            if strings:
                continue
            err("methodology", a,
                "meta is an inline literal with no limitation prose — renders a "
                "methodology block with an empty Limitations section")
            continue

        fname, meta = _rendered_meta(a)
        if meta is None:
            err("methodology", a,
                f"meta traces to {fname or 'an unresolved file'}, which is missing or "
                "will not parse")
            continue
        if not _limits(meta, structural):
            err("methodology", a,
                f"{fname} carries no limitation prose — the page renders a methodology "
                "block with an empty Limitations section")


# ------------------------------------------------------------ 5. footprint vs the prose
def check_footprint_prose(arts: list[str]) -> None:
    """If the data says twelve counties, the prose may not say fourteen.

    Caught `federal-money`, which said "these fourteen counties" over a PIC-12 dataset
    whose own note read "Chosen for federal-data pages so figures reconcile."
    """
    for a in arts:
        # The RENDERED file, not the alphabetically-first one. The previous version walked
        # sorted(listdir) and took the first footprint it found — the identical mistake
        # this file's header cites as its reason for existing, caught here by two council
        # families rather than by the harness itself.
        _, meta = _rendered_meta(a)
        if not meta:
            continue
        fp = meta.get("footprint")
        if not (isinstance(fp, dict) and isinstance(fp.get("n"), int)):
            continue
        n = fp["n"]
        blob = ""
        for f in ("index.html", "app.js"):
            p = os.path.join(WEB, a, f)
            if os.path.isfile(p):
                blob += _strip_comments(read(p))
        # A county count is only a FOOTPRINT claim when the sentence is asserting the
        # footprint's size. "The two share ten counties" states the OVERLAP between
        # PIC-12 and NEO-14, which is true and has nothing to do with either total, and
        # flagging it taught the writer to avoid a correct sentence rather than to fix a
        # wrong one. A gate that fires on true prose gets satisfied by rewording, which
        # is how a check stops meaning anything. Overlap and subset phrasings are exempt.
        OVERLAP = r"(?:shares?|sharing|overlap(?:s|ping)?|in common|both|each of|of (?:those|these|the twelve|the fourteen))\s+(?:\w+\s+){0,3}$"
        def _is_overlap(upto: str) -> bool:
            return bool(re.search(OVERLAP, upto[-90:], re.I))
        for word, value in NUMBER_WORDS.items():
            if value == n:
                continue
            for m in re.finditer(rf"\b{word}\s+count(?:y|ies)\b", blob, re.I):
                if _is_overlap(blob[:m.start()]):
                    continue
                err("footprint-prose", a,
                    f"prose says {word!r} counties but meta.footprint.n is {n}")
                break
        for m in re.finditer(r"\b(\d{1,2})\s+count(?:y|ies)\b", blob, re.I):
            if int(m.group(1)) != n and not _is_overlap(blob[:m.start()]):
                err("footprint-prose", a,
                    f"prose says '{m.group(1)} counties' but meta.footprint.n is {n}")


# ------------------------------------------------------------------ 6. bundle freshness
def check_bundles(arts: list[str]) -> None:
    """A bundle older than its source ships superseded content, silently."""
    if not os.path.isdir(DIST):
        # ERROR, not WARN: losing every bundle must not be easier to pass than losing one.
        err("bundle", "dist", "no dist/ folder — nothing is shipped")
        return
    for a in arts:
        b = os.path.join(DIST, f"{a}.html")
        if not os.path.isfile(b):
            err("bundle", a, "no bundle in dist/ — never shipped")
            continue
        bt = os.path.getmtime(b)
        # Every INPUT the bundler inlines, not just the two obvious ones. Comparing only
        # index.html and app.js meant a renderer change in _shared/ — which rewrites every
        # page — or a data refresh, which changes every figure, both read as "fresh". Both
        # council families flagged this, and it bit during this session: picviz.js was
        # edited and the bundles were only rebuilt because someone remembered to.
        inputs = [os.path.join(WEB, a, f) for f in ("index.html", "app.js", "styles.css")]
        ddir = os.path.join(WEB, a, "data")
        if os.path.isdir(ddir):
            inputs += [os.path.join(ddir, f) for f in os.listdir(ddir)]
        shared = os.path.join(WEB, "_shared")
        if os.path.isdir(shared):
            inputs += [os.path.join(shared, f) for f in os.listdir(shared)]
        for p in inputs:
            if os.path.isfile(p) and os.path.getmtime(p) > bt:
                gap = (os.path.getmtime(p) - bt) / 60
                err("bundle", a,
                    f"bundle is {gap:.0f} min behind {os.path.relpath(p, WEB)} — rebuild")
                break
    reg = os.path.join(WEB, "_data", "SOURCES.json")
    if os.path.isfile(reg):
        rt = os.path.getmtime(reg)
        stale = [a for a in arts
                 if os.path.isfile(os.path.join(DIST, f"{a}.html"))
                 and os.path.getmtime(os.path.join(DIST, f"{a}.html")) < rt]
        if stale:
            err("bundle", "SOURCES.json",
                f"registry is newer than {len(stale)} bundle(s), which inline it: "
                f"{', '.join(stale[:6])}{'…' if len(stale) > 6 else ''}")
    for f in sorted(os.listdir(DIST)):
        if f.endswith(".html") and os.path.splitext(f)[0] not in arts:
            warn("bundle", f, "bundle with no source artifact")


# ------------------------------------------------------------------- 7. hub reachability
def check_hub(arts: list[str]) -> None:
    """An artifact nobody can navigate to is invisible work. Caught `credit`.

    The hub is `index/` by default. A tree that deliberately has no in-repo hub — the
    public cut, where the org landing page plays that role — declares it with a
    `.nohub` file at the web root naming where the index lives, so the absence is a
    stated decision rather than a silent gap.
    """
    hub = os.path.join(WEB, "index")
    if not os.path.isdir(hub):
        marker = os.path.join(WEB, ".nohub")
        if os.path.isfile(marker) and read(marker).strip():
            return
        err("hub", "index",
            "no hub page — every artifact is unreachable. If the index lives elsewhere "
            "on purpose, add a .nohub file at the web root saying where.")
        return
    blob = ""
    for f in os.listdir(hub):
        if f.endswith((".js", ".html")):
            blob += read(hub, f)
    for a in arts:
        if a == "index":
            continue
        if not re.search(rf"['\"/]{re.escape(a)}['\"/]", blob):
            # An artifact may be deliberately unlisted (an internal working view kept out
            # of the published set). Declaring it costs a file that states WHY, so the
            # exemption is visible in review rather than silent in a gate.
            if os.path.exists(os.path.join(WEB, a, ".unlisted")):
                warn("hub", a, "unlisted on purpose — see " + a + "/.unlisted")
                continue
            err("hub", a, "not linked from the hub — builds and ships but is unreachable")


# ------------------------------------------------------------ 8. duplicate divergence
def check_duplicates(arts: list[str]) -> None:
    """Two files with one name and different bytes. Nothing declares which is right."""
    build_files = {f: os.path.join(BUILD, f)
                   for f in os.listdir(BUILD) if f.endswith(".json")}
    for a in arts:
        ddir = os.path.join(WEB, a, "data")
        if not os.path.isdir(ddir):
            continue
        for f in os.listdir(ddir):
            if f not in build_files:
                continue
            p1, p2 = os.path.join(ddir, f), build_files[f]
            h1 = hashlib.sha256(open(p1, "rb").read()).hexdigest()
            h2 = hashlib.sha256(open(p2, "rb").read()).hexdigest()
            if h1 != h2:
                s1, s2 = os.path.getsize(p1), os.path.getsize(p2)
                ratio = max(s1, s2) / max(1, min(s1, s2))
                warn("duplicate", f"{a}/data/{f}",
                     f"differs from _data/build/{f} ({s1:,} vs {s2:,} bytes, {ratio:.0f}x). "
                     "If one is derived from the other, rename it so the pair is not "
                     "mistaken for two copies of the same thing.")


# --------------------------------------------------------------- 9. empty published data
def check_empty_data(arts: list[str]) -> None:
    """A code filter that returns nothing publishes as a finding of zero.

    The highest-consequence latent defect in the 2026-08-17 audit: `credit` (CPC),
    `reach`/`collaboration` (OpenAlex subfields) and `federal-money` (NAICS) all filter on
    codes, and an empty return would render as a real zero rather than an error.
    """
    for a in arts:
        ddir = os.path.join(WEB, a, "data")
        if not os.path.isdir(ddir):
            continue
        for f in sorted(os.listdir(ddir)):
            if not f.endswith(".json"):
                continue
            try:
                obj = load_json(os.path.join(ddir, f))
            except Exception as e:
                err("empty-data", f"{a}/data/{f}", f"will not parse: {e}")
                continue
            if isinstance(obj, list) and not obj:
                err("empty-data", f"{a}/data/{f}", "top-level array is empty")
            elif isinstance(obj, dict):
                for k, v in obj.items():
                    if k == "meta":
                        continue
                    if isinstance(v, (list, dict)) and len(v) == 0:
                        err("empty-data", f"{a}/data/{f}",
                            f"key {k!r} is empty — a filter returning nothing reads as a "
                            "real zero on the page")


# ------------------------------------------------------------------------------- main


def check_catalog() -> None:
    """The generated catalog must know every script and every output in _data/build/.
    `build_catalog.py` writes _data/catalog.json; this compares it to the folder. A script
    or output the catalog does not list means the catalog is STALE — regenerate it. A
    catalog older than the newest script is stale by definition. ERROR, because a stale
    inventory is the one failure that reads as completeness."""
    import glob as _glob, time as _time
    build = os.path.join(WEB, "_data", "build")
    cat_path = os.path.join(WEB, "_data", "catalog.json")
    if not os.path.exists(cat_path):
        err("catalog", "_data/catalog.json", "missing — run python _data/build/build_catalog.py"); return
    cat = load_json(cat_path)
    if not cat:
        err("catalog", "_data/catalog.json", "unreadable"); return
    known_scripts = {r["script"] for r in cat.get("scripts", [])}
    known_outputs = set(cat.get("outputs", {}).keys())
    infra = {"build_catalog.py", "verify_claims.py", "verify_consistency.py", "contact.py",
             "footprints.py", "build_pic12_geo.py"}
    on_disk = {os.path.basename(p) for g in ("fetch_*.py", "extract_*.py", "derive_*.py", "build_*.py")
               for p in _glob.glob(os.path.join(build, g))} - infra
    for sc in sorted(on_disk - known_scripts):
        err("catalog", sc, "script exists but the catalog does not list it — regenerate build_catalog.py")
    for sc in sorted(known_scripts - on_disk):
        err("catalog", sc, "catalog lists a script that no longer exists — regenerate build_catalog.py")
    outs = {os.path.basename(p) for p in _glob.glob(os.path.join(build, "*.json"))} - {"catalog.json"}
    for o in sorted(outs - known_outputs):
        err("catalog", o, "output exists but the catalog does not list it — regenerate build_catalog.py")
    cat_m = os.path.getmtime(cat_path)
    newest = max((os.path.getmtime(os.path.join(build, f)) for f in on_disk), default=0)
    if newest > cat_m + 60:
        err("catalog", "_data/catalog.json",
            f"a script is newer than the catalog by {int((newest-cat_m)/60)} min — regenerate build_catalog.py")
    for r in cat.get("scripts", []):
        if "import_error" in r.get("flags", []) or "syntax_error" in r.get("flags", []):
            warn("catalog", r["script"], f"catalog says it does not import: {r.get('import_error') or 'syntax'}")
        if "writes_outside_build" in r.get("flags", []):
            warn("catalog", r["script"], f"writes outside the web tree: {r.get('writes_outside_build')}")
    n_orph = len(cat.get("orphan_outputs", []))
    if n_orph:
        warn("catalog", "_data/build", f"{n_orph} output file(s) no script claims — see CATALOG.md 'Orphan outputs'")

def main() -> int:
    arts = artifacts()
    reg_path = os.path.join(WEB, "_data", "SOURCES.json")
    reg = load_json(reg_path) if os.path.isfile(reg_path) else {}

    check_meta_classified(arts)
    check_registry_scripts(reg)
    check_registry_coverage(reg, arts)
    check_required_files(arts)
    check_methodology(arts)
    check_footprint_prose(arts)
    check_bundles(arts)
    check_hub(arts)
    check_duplicates(arts)
    check_empty_data(arts)
    check_catalog()

    errors = [f for f in findings if f[0] == "ERROR"]
    warns = [f for f in findings if f[0] == "WARN"]

    if "--json" in sys.argv:
        print(json.dumps({
            "artifacts": len(arts),
            "errors": len(errors),
            "warnings": len(warns),
            "findings": [dict(zip(("severity", "check", "subject", "message"), f))
                         for f in findings],
        }, indent=2))
        return 1 if errors else 0

    print(f"Consistency check over {len(arts)} artifacts\n")
    for severity in ("ERROR", "WARN"):
        rows = [f for f in findings if f[0] == severity]
        if not rows:
            continue
        print(f"{severity} ({len(rows)})")
        for _, check, subject, message in sorted(rows, key=lambda r: (r[1], r[2])):
            print(f"  [{check}] {subject}")
            print(f"      {message}")
        print()
    if not findings:
        print("No configured check matched. That is not the same as correct — this file\n"
              "compares records that should already agree, and cannot tell you whether a\n"
              "number is right.\n")
    print(f"{len(errors)} error(s), {len(warns)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
