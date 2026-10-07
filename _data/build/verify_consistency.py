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
    "corrections": "renders CORRECTIONS.md as written; each figure an entry gives is checked "
                   "on the page it corrects, and check_corrections holds the rendering",
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
    import masthead
    for a in arts:
        if a not in by_art and a in masthead.UNCARDED:
            continue   # apparatus with no data source of its own (masthead.UNCARDED)
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


# ------------------------------------------ 2b. the published register vs its own source
def check_published_register(reg: dict, arts: list[str]) -> None:
    """Does the register the READER sees still match the register the site is built from?

    WHY. `check_registry_coverage` above guards _data/SOURCES.json against itself and
    against the artifact folders. Nothing guarded the copy a reader actually reads:
    sources/data/registry.json, which derive_sources.py writes and which the sources page
    renders. On 2026-09-01 that copy was found **nine sources and five pages behind** its
    own source file, while the page published a section headed "All fifteen datasets".
    The site drew on twenty-four. The provenance of atlas, chain, collaboration, programs
    and reach was absent from the page whose entire job is provenance.

    Not one of the twenty gates could see it, and the reason is worth stating because it
    generalises: every gate checked the PAGE against the REGISTER, and the register was
    the thing that had gone stale. A derived copy can drift arbitrarily far while
    everything downstream of it stays green. This is the same shape as the hub inventory,
    the catalog, and the chain county register.

    The stall was honest, which is why it lasted: derive_sources.py refuses to publish a
    source with no plain-language gloss of what it CANNOT tell you, none of the nine had
    one, so the build failed loudly and somebody stopped re-running it rather than writing
    nine paragraphs. The gate worked; the response to the gate is what failed. This check
    makes the drift itself the failure, so not-re-running is no longer a quiet option.
    """
    published = load_json(os.path.join("sources", "data", "registry.json"))
    if published is None:
        err("published-register", "sources/data/registry.json", "missing")
        return

    src_keys = set(reg.get("sources", {}))
    pub_keys = {s.get("key") for s in published.get("sources", []) if s.get("key")}
    for k in sorted(src_keys - pub_keys):
        err("published-register", k,
            "in _data/SOURCES.json but not on the sources page — a source the site draws "
            "on whose provenance no reader can see. Re-run derive_sources.py; if it "
            "refuses, this source is missing its 'what it cannot tell you' gloss.")
    for k in sorted(pub_keys - src_keys):
        err("published-register", k,
            "published on the sources page but absent from _data/SOURCES.json — the page "
            "credits a source the site no longer draws on")

    art_slugs = set(reg.get("by_artifact", {}))
    pub_slugs = {p.get("slug") for p in published.get("pages", []) if p.get("slug")}
    for a in sorted(art_slugs - pub_slugs):
        err("published-register", a,
            "has provenance in _data/SOURCES.json that the sources page does not show — "
            "a reader cannot find out where this page's data came from")
    for a in sorted(pub_slugs - art_slugs):
        err("published-register", a,
            "listed on the sources page with no by_artifact row behind it")

    # The register also states its own size in prose. A count that agrees with a stale
    # register is the failure this check exists to stop, so assert against the SOURCE.
    totals = published.get("totals") or {}
    if totals.get("n_sources") not in (None, len(src_keys)):
        err("published-register", "totals.n_sources",
            f"register says {totals.get('n_sources')} sources; _data/SOURCES.json has "
            f"{len(src_keys)}")
    if totals.get("n_pages") not in (None, len(art_slugs)):
        err("published-register", "totals.n_pages",
            f"register says {totals.get('n_pages')} pages; _data/SOURCES.json has "
            f"{len(art_slugs)}")

    # The sources page also publishes a copy of the claims census from
    # index/data/counts.json. Source and page coverage can both be current while this
    # separate block is stale: that is exactly how the page said "443 claims across
    # seventeen pages" after counts.json had moved on. Compare the two artifacts here,
    # where cross-artifact agreement belongs, rather than trusting either copy alone.
    counts_path = os.path.join(WEB, "index", "data", "counts.json")
    if not os.path.isfile(counts_path):
        err("published-register", "index/data/counts.json",
            "missing — cannot verify the claims census copied onto the sources page")
        return
    try:
        counts = load_json(counts_path)
    except (OSError, json.JSONDecodeError) as exc:
        err("published-register", "index/data/counts.json",
            f"cannot read the canonical claims census: {exc}")
        return
    if not isinstance(counts, dict):
        err("published-register", "index/data/counts.json",
            "root must be an object — cannot derive the claims census")
        return
    pages = counts.get("pages")
    if not isinstance(pages, dict) or not pages:
        err("published-register", "index/data/counts.json",
            "pages must be a non-empty object — cannot derive the claims census")
        return
    malformed = [slug for slug, row in pages.items()
                 if not isinstance(row, dict)
                 or type(row.get("claims")) is not int
                 or type(row.get("manual")) is not int]
    if malformed:
        err("published-register", "index/data/counts.json",
            "claim/manual counts must be integers for every page; malformed: "
            + ", ".join(sorted(malformed)))
        return

    # Recompute from the per-page rows, which is exactly what derive_sources.py does.
    # Trusting counts.json's top-level totals here would let two stale summaries agree.
    n_claims = sum(row["claims"] for row in pages.values())
    n_manual = sum(row["manual"] for row in pages.values())
    checks = published.get("checks")
    if not isinstance(checks, dict):
        err("published-register", "sources/data/registry.json",
            "checks must be an object — cannot verify the claims census")
        return
    expected = {
        "n_pages": len(pages),
        "n_claims": n_claims,
        "n_manual": n_manual,
        "this_page": pages.get("sources", {}).get("claims", 0),
        "n_auto": n_claims - n_manual,
    }
    # The hub's own claims are not in counts.json's pages, so they come from its claims file.
    # This block left them out until 2026-09-30, when a hub claim was added, the register
    # said 33 and 575 for the hub and the site, and this check still passed.
    try:
        n_hub = len(load_json(os.path.join(WEB, "index", "claims.json"))["claims"])
        expected["n_hub_claims"] = n_hub
        expected["n_site_claims"] = n_claims + n_hub
    except (OSError, KeyError, json.JSONDecodeError) as exc:
        err("published-register", "index/claims.json", f"cannot count the hub's claims: {exc}")
    for key, value in expected.items():
        if checks.get(key) != value:
            err("published-register", f"checks.{key}",
                f"sources page says {checks.get(key)!r}; index/data/counts.json requires "
                f"{value!r}. Run derive_index.py and then derive_sources.py.")

    # And the paragraph that PRINTS the census is typed in sources/index.html, so the
    # registry can be right while the page is not. Read the numbers off the sentence.
    html = read(WEB, "sources", "index.html")
    para = re.search(r'id="checkidea">(.*?)</p>', html, re.S)
    nums = re.search(
        r"<b>(\d+)</b>\s+claims\.\s+The hub adds (\d+), making (\d+) across all (\d+) site pages\.\s+"
        r"Of the (\d+) article claims, (\d+) are re-run.*?The other (\d+) rest on.*?"
        r"This page alone carries (\d+)\.", para.group(1), re.S) if para else None
    if not nums:
        err("published-register", "sources/index.html",
            "cannot read the claims census sentence in #checkidea; this check reads its numbers")
    else:
        printed = dict(zip(("n_claims", "n_hub_claims", "n_site_claims", "n_pages_all",
                            "n_claims_again", "n_auto", "n_manual", "this_page"),
                           map(int, nums.groups())))
        # every page on the site: the articles, the hub and any uncarded apparatus (the
        # corrections log), the same folders the bundler builds
        want = dict(expected, n_pages_all=len(arts), n_claims_again=n_claims)
        for key, value in printed.items():
            if want.get(key) != value:
                err("published-register", f"sources/index.html #checkidea {key}",
                    f"the page prints {value}; the claims census says {want.get(key)}")

# ------------------------------------------------------------------ 3. required files
def check_masthead_dates(arts: list[str]) -> None:
    """A page's masthead date is the newest date among the data files it reads.

    The rule is John's (2026-09-30) and masthead.py holds the page-to-file mapping. Two
    failures it stops: a page that reads a newer file than the one dated on its masthead
    (sources read wages 11 September and said 8 September; accountability read the
    location-quotient file, also 11 September, and said 13 August), and a page whose
    masthead file carries no date at all, which prints no dateline. The hub is the newest
    masthead date among the pages it links to.
    """
    import masthead
    for a in arts:
        if a == "index":
            continue
        if a not in masthead.MASTHEAD_FILE:
            err("masthead", a, "not in masthead.MASTHEAD_FILE: name the data file whose meta "
                "carries this page's masthead date")
            continue
        try:
            shown = masthead.masthead_date(WEB, a)
            newest = masthead.newest_input(WEB, a)
        except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
            err("masthead", a, f"cannot read the masthead date or its inputs: {exc}")
            continue
        if shown is None:
            err("masthead", a, f"{masthead.masthead_files(a)} meta has no as_of, fetched or asOf, so the "
                "masthead prints no date")
        elif newest and shown != newest[0]:
            err("masthead", a, f"masthead date is {shown} but the newest input is {newest[0]} "
                f"({newest[1]}). A page shows the newest date among the files it reads; set "
                "meta.as_of in the derive step.")
    try:
        counts = load_json(os.path.join(WEB, "index", "data", "counts.json"))
        linked = [a for a in arts if a != "index" and a not in masthead.UNCARDED
                  and not os.path.exists(os.path.join(WEB, a, ".unlisted"))]
        want = max(masthead.masthead_date(WEB, a) for a in linked).isoformat()
        if counts.get("as_of") != want:
            err("masthead", "index", f"hub masthead date is {counts.get('as_of')!r}; the newest "
                f"masthead date among the pages it links to is {want}. Run derive_index.py.")
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        err("masthead", "index", f"cannot check the hub's masthead date: {exc}")


STATUSES = ("PUBLISHED", "PROTOTYPE", "INTERNAL")


def check_status(arts: list[str]) -> None:
    """Every page declares one status in its own masthead data (DECISIONS.md, 2026-10-04).

    PUBLISHED, PROTOTYPE or INTERNAL, as meta.status in the file(s) masthead.py names. The
    banner, the masthead flag and the hub card are checked against it in the rendered pages
    by tools/disclosure.mjs; this holds the declaration itself, and the two derived copies
    (index/data/counts.json, sources/data/registry.json) against it. An unlisted page has
    to be INTERNAL, and an INTERNAL page has to be unlisted: the status is the reason.
    """
    import masthead
    counts = load_json(os.path.join(WEB, "index", "data", "counts.json"))
    registry = load_json(os.path.join(WEB, "sources", "data", "registry.json"))
    if counts.get("status") not in STATUSES:
        err("status", "index", f"counts.json status is {counts.get('status')!r}; run derive_index.py")
    for a in arts:
        if a == "index":
            continue
        if a not in masthead.MASTHEAD_FILE:
            err("status", a, "not in masthead.MASTHEAD_FILE, so its status cannot be read")
            continue
        found = set()
        for f in masthead.masthead_files(a):
            try:
                found.add((load_json(os.path.join(WEB, f)).get("meta") or {}).get("status"))
            except (OSError, json.JSONDecodeError) as exc:
                err("status", a, f"cannot read {f}: {exc}")
        if len(found) != 1 or not found <= set(STATUSES):
            err("status", a, f"meta.status in {masthead.masthead_files(a)} is {sorted(map(str, found))}; "
                f"declare exactly one of {', '.join(STATUSES)}")
            continue
        st = found.pop()
        unlisted = os.path.exists(os.path.join(WEB, a, ".unlisted"))
        if unlisted != (st == "INTERNAL"):
            err("status", a, f"status is {st} but the page is {'unlisted' if unlisted else 'listed'}; "
                "an unlisted page is INTERNAL and an INTERNAL page is unlisted")
        if a in masthead.UNCARDED:
            pass   # no hub card and not in counts.json, on purpose (masthead.UNCARDED)
        elif (counts.get("pages", {}).get(a) or {}).get("status") != st:
            err("status", a, f"index/data/counts.json says {(counts.get('pages', {}).get(a) or {}).get('status')!r}, "
                f"the page declares {st}; run derive_index.py")
        if (registry.get("statuses") or {}).get(a) != st:
            err("status", a, f"sources/data/registry.json says {(registry.get('statuses') or {}).get(a)!r}, "
                f"the page declares {st}; run derive_sources.py")


# Reader-facing surfaces the NEO-14 rule reads: each page's markup, script, claims, README
# and data, plus the shared method notes and source register. Not CORRECTIONS.md or
# DECISIONS.md, which record the old name on purpose.
NEO14_SHARED = ("_data/METHODS-SOP.md", "_data/SOURCES.json")
NEO14 = re.compile(r"NEO-?14")


def check_neo14_name(arts: list[str]) -> None:
    """NEO-14 names one county set: the vault's (DECISIONS.md, 2026-10-04).

    Until 2026-10-04 the chain register's footprint, PIC-12 plus Columbiana and Tuscarawas,
    was also called NEO-14, while the vault's NEO-14 (pic-geo) adds Crawford, Huron,
    Richland and Tuscarawas to ten PIC-12 counties. The chain set is now PIC-12+2.
    Two rules. Anywhere: Columbiana is the tell, in PIC-12+2 and not in the vault set, so a
    sentence naming both NEO-14 and Columbiana describes the chain set by the wrong name,
    unless it names PIC-12+2 as well (a sentence contrasting the two). On chain's own
    surfaces, which describe only the chain set: NEO-14 may appear only within 300
    characters of PIC-12+2, that is, only where the two are being told apart.
    """
    files = list(NEO14_SHARED)
    for a in arts:
        root = os.path.join(WEB, a)
        for name in ("index.html", "app.js", "claims.json", "README.md"):
            if os.path.isfile(os.path.join(root, name)):
                files.append(os.path.join(a, name))
        d = os.path.join(root, "data")
        if os.path.isdir(d):
            files += [os.path.join(a, "data", x) for x in sorted(os.listdir(d)) if x.endswith(".json")]
    # The rendered corrections log is CORRECTIONS.md, which records the old name on purpose;
    # check_corrections holds it to that file word for word.
    files = [f for f in files if f != os.path.join("corrections", "data", "corrections.json")]
    for rel in files:
        path = os.path.join(WEB, rel)
        if not os.path.isfile(path):
            err("neo14-name", rel, "a surface this rule reads is missing, so it was not inspected")
            continue
        text = read(path)
        flat = " ".join(text.split())
        for sent in re.split(r"(?<=[.;!?])[\s\"”]+", flat):
            if NEO14.search(sent) and "Columbiana" in sent and "PIC-12+2" not in sent:
                err("neo14-name", rel, f"NEO-14 labels the chain register's PIC-12+2 set: "
                    f"\"{sent[:200]}\". NEO-14 is the vault's set only.")
                break
        if rel.startswith("chain" + os.sep):
            for m in NEO14.finditer(text):
                if "PIC-12+2" not in text[max(0, m.start() - 300): m.end() + 300]:
                    err("neo14-name", rel, "chain names NEO-14 without PIC-12+2 beside it: "
                        f"\"...{' '.join(text[max(0, m.start() - 80): m.end() + 80].split())}...\". "
                        "Chain's footprint is PIC-12+2; NEO-14 is the vault's set.")
                    break
    chain = load_json(os.path.join(WEB, "chain", "data", "chain-data.json"))
    rule = ((chain.get("meta") or {}).get("region") or {}).get("rule", "")
    if not rule.startswith("county in PIC-12+2 "):
        err("neo14-name", "chain", f"chain-data.json meta.region.rule is {rule!r}; it names PIC-12+2")


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
def _sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def _walk_files(root_dir: str) -> list[str]:
    """Every file under root_dir, recursively, skipping dotfiles and dot-directories."""
    out = []
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [x for x in dirs if not x.startswith(".")]
        out += [os.path.join(root, f) for f in files if not f.startswith(".")]
    return out


def _bundle_inputs(web: str, name: str) -> dict[str, str]:
    """The exact set of files tools/bundle.mjs hashes into dist/.inputs.json for one
    page — index.html, app.js, styles.css, claims.json, everything under data/, img/ and
    assets/, everything under _shared/ (recursively: its fonts/ are base64-inlined, not
    merely linked), and _data/SOURCES.json, _data/cite.json, _data/corrections_by_page.json,
    _data/glossary.json and _data/jobcounts.json — mapped to a sha256 of each file's current
    bytes. Must stay in lockstep with tools/bundle.mjs's inputManifest(); a mismatch
    between what the bundler hashes and what this checks makes the manifest meaningless."""
    d = os.path.join(web, name)
    paths = []
    for f in ("index.html", "app.js", "styles.css", "claims.json"):
        p = os.path.join(d, f)
        if os.path.isfile(p):
            paths.append(p)
    for sub in ("data", "img", "assets"):
        sd = os.path.join(d, sub)
        if os.path.isdir(sd):
            paths += _walk_files(sd)
    shared = os.path.join(web, "_shared")
    if os.path.isdir(shared):
        paths += _walk_files(shared)
    for f in ("SOURCES.json", "cite.json", "corrections_by_page.json", "glossary.json", "jobcounts.json"):
        reg = os.path.join(web, "_data", f)
        if os.path.isfile(reg):
            paths.append(reg)
    return {os.path.relpath(p, web).replace(os.sep, "/"): _sha256_file(p) for p in paths}


def check_bundles(arts: list[str], web: str = WEB, dist: str = DIST) -> None:
    """A bundle whose source has changed since it was built ships superseded content,
    silently. Until 2026-09-28 "changed since" meant "any input's mtime is newer than the
    bundle's" — and mtime says WHEN a file was last written, never WHETHER its bytes
    differ. A clean `git checkout`/`pull` sets every input's mtime to the checkout time
    without touching a single byte, so a leftover gitignored dist/ read as 25 stale
    bundles on a tree where rebuilding produced byte-identical output. tools/bundle.mjs
    now writes dist/.inputs.json, a sha256 of every input it hashed at build time, keyed
    by page; this compares that recorded manifest against the CURRENT hash of the same
    files, so a mtime bump with identical content passes and a single changed byte is
    named. This still cannot see a bundle built from the right bytes but the wrong
    reasoning (a bug in bundle.mjs itself, or a manifest hand-edited to match), and it
    trusts dist/.inputs.json completely — there is no independent second source for what
    the bundler actually inlined.
    """
    if not os.path.isdir(dist):
        # ERROR, not WARN: losing every bundle must not be easier to pass than losing one.
        err("bundle", "dist", "no dist/ folder — nothing is shipped")
        return
    manifest_path = os.path.join(dist, ".inputs.json")
    manifest = None
    manifest_bad = not os.path.isfile(manifest_path)
    if not manifest_bad:
        try:
            manifest = load_json(manifest_path)
            manifest_bad = not isinstance(manifest, dict)
        except Exception:
            manifest_bad = True
    if manifest_bad:
        # Never fall back to "pass" and never fall back to mtimes — an unreadable or
        # absent manifest means freshness is simply unknown, which is an ERROR.
        err("bundle", "dist/.inputs.json", "no input manifest — rebuild")
    for a in arts:
        b = os.path.join(dist, f"{a}.html")
        if not os.path.isfile(b):
            err("bundle", a, "no bundle in dist/ — never shipped")
            continue
        if manifest_bad:
            continue  # already reported once, globally — no point repeating per page
        recorded = manifest.get(a)
        if recorded is None:
            err("bundle", a, "no input manifest entry for this page — rebuild")
            continue
        current = _bundle_inputs(web, a)
        added = sorted(set(current) - set(recorded))
        if added:
            err("bundle", a, f"bundle for {a} was built before {added[0]} existed — rebuild")
            continue
        missing = sorted(set(recorded) - set(current))
        if missing:
            err("bundle", a,
                f"bundle for {a} was built from {missing[0]}, which no longer exists — rebuild")
            continue
        changed = sorted(p for p in current if current[p] != recorded[p])
        if changed:
            err("bundle", a, f"bundle for {a} was built from an older {changed[0]} — rebuild")
    for f in sorted(os.listdir(dist)):
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

    # A card in the HTML is not a card on screen: the hub's app.js removes any card whose
    # slug is missing from index/data/counts.json (a card for a withheld page must not
    # ship a dead link). That guard failed OPEN for five freshly promoted pages — each
    # was live, carded in the HTML, and silently invisible, because nobody re-ran
    # derive_index.py. A static-text check cannot see a runtime removal, so assert the
    # inventory directly: every non-unlisted artifact must be in counts.json.
    counts_path = os.path.join(hub, "data", "counts.json")
    if os.path.isfile(counts_path):
        try:
            counted = set((load_json(counts_path).get("pages") or {}).keys())
        except Exception as e:
            err("hub", "index/data/counts.json", f"unreadable: {e}")
            counted = None
        if counted is not None:
            import masthead
            for a in arts:
                if a == "index" or a in counted or a in masthead.UNCARDED:
                    continue
                if os.path.exists(os.path.join(WEB, a, ".unlisted")):
                    continue
                err("hub", a,
                    "missing from index/data/counts.json, so the hub's app.js removes "
                    "its card at runtime — the page is live but unreachable from the "
                    "front door. Re-run _data/build/derive_index.py.")


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


# ----------------------------------------------------------- 10. the rendered corrections log
def check_corrections(web: str = WEB) -> None:
    """The rendered log holds every CORRECTIONS.md entry, and each page's summary counts match.

    DECISIONS.md, 2026-10-04, D3. The corrections/ page renders corrections/data/corrections.json
    and every page's summary line reads _data/corrections_by_page.json; both are written by
    derive_corrections.py. Three failures this stops: an entry appended to CORRECTIONS.md and
    never re-derived, so the log a reader is sent to is missing it; an output edited by hand,
    so the rendered log no longer says what the file says; and a page whose summary counts
    entries the log does not attribute to it. The entry count is taken twice, once by the
    derive script's parser and once by counting '## ' headings directly, so a parser that
    silently skips an entry fails here instead of shrinking the log."""
    import derive_corrections as dc
    log_path = os.path.join(web, "corrections", "data", "corrections.json")
    sum_path = os.path.join(web, "_data", "corrections_by_page.json")
    src = read(web, "CORRECTIONS.md")
    # Headline dates are read from git history; a shallow clone holds none, so the check says
    # it could not inspect them rather than passing (CI checks out full history for this).
    full = dc.history_is_complete(web)
    if not full:
        err("corrections", "_data/corrections_by_page.json",
            "cannot inspect headline dates: the git history is shallow; fetch it in full "
            "(actions/checkout fetch-depth: 0)")
    try:
        fresh_log, fresh_sum = dc.parse(src, history=full)
    except SystemExit as exc:
        err("corrections", "CORRECTIONS.md", f"derive_corrections.py cannot read it: {exc}")
        return
    try:
        log, summ = load_json(log_path), load_json(sum_path)
    except (OSError, json.JSONDecodeError) as exc:
        err("corrections", "corrections/data/corrections.json", f"unreadable: {exc}; run derive_corrections.py")
        return
    headings = [h.strip() for h in re.findall(r"(?m)^## (.+)$", src)]
    shipped = [e.get("heading") for e in log.get("entries", [])]
    if len(shipped) != len(headings) or log.get("meta", {}).get("n_entries") != len(headings):
        err("corrections", "corrections/data/corrections.json",
            f"the rendered log holds {len(shipped)} entries (meta says {log.get('meta', {}).get('n_entries')}); "
            f"CORRECTIONS.md has {len(headings)} '## ' headings. Run derive_corrections.py.")
    missing = [h for h in headings if h not in shipped]
    for h in missing[:5]:
        err("corrections", "corrections/data/corrections.json", f"entry not in the rendered log: {h[:90]!r}")
    if not missing and shipped != headings:
        err("corrections", "corrections/data/corrections.json", "entries are not in CORRECTIONS.md's order")
    if log != fresh_log:
        err("corrections", "corrections/data/corrections.json",
            "differs from what derive_corrections.py renders from CORRECTIONS.md now: an entry was "
            "changed, or the file was edited by hand. Run derive_corrections.py.")
    # Word for word, independently of the renderer: each entry's letters and digits, read
    # from the Markdown with its markup removed, must be exactly those of the rendered entry
    # (heading plus body). A renderer that drops a word, a number or a line passes every
    # other test here when its own output is the reference; this one reads the source.
    import html as _html
    alnum = lambda t: re.sub(r"[^A-Za-z0-9]", "", t)
    for e, chunk in zip(log.get("entries", []), re.split(r"(?m)^## ", src)[1:]):
        want = alnum(re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", chunk))
        got = alnum(e.get("heading", "") + _html.unescape(
            re.sub(r"<[^>]+>", "", e.get("html", "") + e.get("after_html", ""))))
        if want != got:
            i = next((k for k, (x, y) in enumerate(zip(want, got)) if x != y), min(len(want), len(got)))
            err("corrections", "corrections/data/corrections.json",
                f"entry {e.get('id')} does not render the Markdown word for word: source "
                f"...{want[max(0, i - 30): i + 20]}... rendered ...{got[max(0, i - 30): i + 20]}...")
    if not full:
        summ = dict(summ, headlines=None)
    if summ != fresh_sum:
        err("corrections", "_data/corrections_by_page.json",
            "differs from what derive_corrections.py writes now. Run derive_corrections.py.")
    # Each page's summary is exactly the log's entries naming that page, in order.
    naming = {}
    for e in log.get("entries", []):
        for p in e.get("pages", []):
            naming.setdefault(p, []).append(e["id"])
    pages = summ.get("pages", {})
    for p in sorted(set(naming) | set(pages)):
        got = pages.get(p, [])
        if [x.get("id") for x in got] != naming.get(p, []):
            err("corrections", p, f"summary lists {len(got)} entries; the log has {len(naming.get(p, []))} "
                "naming this page")



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
            warn("catalog", r["script"], f"catalogued external target (inferred unless observed): {r.get('writes_outside_build')}")
    n_orph = len(cat.get("orphan_outputs", []))
    if n_orph:
        warn("catalog", "_data/build", f"{n_orph} output file(s) no script claims — see CATALOG.md 'Orphan outputs'")

# ------------------------------------------------------ 13. reader furniture (W4)
NUM = re.compile(r"\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?")
YEAR = re.compile(r"\b(19|20)\d{2}\b")


def _flat(html_text: str) -> str:
    import html as _html
    return " ".join(_html.unescape(re.sub(r"<[^>]+>", "", html_text)).split())


KICKER_MAX = 40


def hub_questions() -> dict[str, str]:
    """The hub's short question (kicker) for each story, read from index/index.html: the
    `<p class="kick">` each card leads with, above its full question in the <h4> (John,
    7 October 2026). The card is the one source; a story's eyebrow and the hub's "Start
    with a question" links must read the same words, checked in [kicker]."""
    src = read(WEB, "index", "index.html")
    out = {}
    for m in re.finditer(r'<a class="card"[^>]*data-slug="([^"]+)"[^>]*>\s*<p class="kick">(.*?)</p>\s*<h4>', src, re.S):
        out[m.group(1)] = _flat(m.group(2))
    return out


def hub_nav() -> dict[str, str]:
    """The hub's "Start with a question" links: slug -> link text."""
    src = read(WEB, "index", "index.html")
    nav = re.search(r'<nav class="first-reads"[^>]*>(.*?)</nav>', src, re.S)
    return {m.group(1): _flat(m.group(2)) for m in
            re.finditer(r'<a href="\.\./([a-z0-9-]+)/">(.*?)</a>', nav.group(1) if nav else "", re.S)}


def check_reader_furniture(arts: list[str]) -> None:
    """The W4 reader furniture agrees with what it is rendered from (DECISIONS.md, W4,
    7 October 2026). Each piece is opt-in per page; once a page opts in, a missing or
    inconsistent piece is an ERROR here (data) or in tools/disclosure.mjs (rendered).

      [scope]     a claim's scope has industry, place, period and source; every year in the
                  period is in the claim's own sentence or its `source` field, and the
                  industry and source are in its `source` field, so a chip cannot name a
                  scope its claim does not.
      [quote]     claims.json `quote` is one sentence; it names auto-checked claims; every
                  number in it is in one of those claims' sentences or scope; and it
                  carries the scope (place, industry, year, source) of a scoped claim it
                  names. A changed figure in the quote fails here; a changed figure in the
                  data fails the claim.
      [kicker]    `kicker: true` in claims.json: the page's eyebrow carries data-kicker
                  and reads exactly its hub card's kicker (hub_questions above); each card
                  kicker is a question of at most 40 characters, and each "Start with a
                  question" link reads its card's kicker.
      [plant]     claims.json `plant`, "If you run a plant here": one to three items, each
                  one sentence naming at least one existing claim on the page; every number
                  in it is stated by an automatically checked claim it names.
      [glossary]  every declared term is defined in _data/glossary.json, once; every
                  definition names its term; notes belong to declared terms; and every
                  number in a page's notes is in one of that page's checked claims.
      [jobcounts] each row of _data/jobcounts.json names a story and one of its checked
                  claims whose sentence prints the total; the hub's index-headcount-key
                  prints the total with the row's year and story in the same clause.
    Pages that have not opted in are listed as WARN, so coverage is visible, not assumed.
    """
    glossary = load_json(os.path.join(WEB, "_data", "glossary.json"))
    gdef: dict[str, dict] = {}
    for t in glossary.get("terms", []):
        term = t.get("term")
        if not term or not t.get("short"):
            err("glossary", "_data/glossary.json", f"entry {t!r} lacks a term or a short definition")
            continue
        if term in gdef:
            err("glossary", "_data/glossary.json", f"{term!r} is defined twice")
        if not re.search(rf"\b{re.escape(term)}", t["short"], re.I):
            err("glossary", "_data/glossary.json", f"the definition of {term!r} never names it, "
                "so the block cannot mark which word it defines")
        gdef[term] = t
    hub = hub_questions()
    pending = {"kicker": [], "quote": [], "glossary": [], "scope": [], "plant": []}
    for a in arts:
        cp = os.path.join(WEB, a, "claims.json")
        if not os.path.isfile(cp):
            continue
        spec = load_json(cp)
        claims = {c.get("id"): c for c in spec.get("claims", [])}
        checked = {i: c for i, c in claims.items() if c.get("verify") != "manual"}

        # [scope]
        scoped = [c for c in claims.values() if c.get("scope")]
        if not scoped and a in hub:
            pending["scope"].append(a)
        for c in scoped:
            sc = c["scope"]
            missing = [k for k in ("industry", "place", "period", "source")
                       if not isinstance(sc.get(k), str) or not sc[k].strip() or "\u00b7" in sc[k]]
            if missing:
                err("scope", f"{a}:{c['id']}", f"scope lacks {', '.join(missing)} (each a plain string, no middot)")
                continue
            if c.get("verify") == "manual":
                err("scope", f"{a}:{c['id']}", "a scope chip may only sit on an automatically checked claim")
            # every year the chip prints is one the claim's sentence states or its source
            # field names (the vintage of the file it re-reads), so a chip cannot date a
            # figure its claim does not
            years = [m.group(0) for m in YEAR.finditer(sc["period"])]
            said = c.get("text", "") + " " + c.get("source", "")
            if not years or any(y not in said for y in years):
                err("scope", f"{a}:{c['id']}", f"scope period {sc['period']!r} names a year neither the claim's "
                    "sentence nor its source field states")
            for k in ("industry", "source"):
                if sc[k].lower() not in c.get("source", "").lower():
                    err("scope", f"{a}:{c['id']}", f"scope {k} {sc[k]!r} is not in the claim's source field")

        # [quote]
        q = spec.get("quote")
        if not q:
            if a in hub:
                pending["quote"].append(a)
        else:
            text, ids = q.get("text", ""), q.get("claims") or []
            if not text.strip():
                err("quote", a, "claims.json quote has no text")
            elif not text.rstrip().endswith(".") or re.search(r"[.!?]\s+[A-Z]", text):
                err("quote", a, "the quote is not one sentence ending in a full stop")
            bad = [i for i in ids if i not in checked]
            if not ids or bad:
                err("quote", a, f"the quote must name automatically checked claims; "
                    f"{', '.join(bad) or 'it names none'}")
            bound = [checked[i] for i in ids if i in checked]
            pool = " ".join(c.get("text", "") + " " + " ".join((c.get("scope") or {}).values())
                            for c in bound)
            have = set(NUM.findall(pool))
            for n in NUM.findall(text):
                if n not in have:
                    err("quote", a, f"the quote prints {n}, which none of its claims "
                        f"({', '.join(ids)}) states")
            scopes = [c["scope"] for c in bound if c.get("scope")]
            if not scopes:
                err("quote", a, "the quote names no claim that carries a scope, so its scope cannot be checked")
            for sc in scopes[:1]:
                want = [sc["place"], sc["industry"], YEAR.search(sc["period"]).group(0) if YEAR.search(sc["period"]) else sc["period"],
                        sc["source"].split()[-1]]
                lost = [w for w in want if w not in text]
                if lost:
                    err("quote", a, f"the quote leaves out its scope: {', '.join(lost)}")

        # [kicker]
        if spec.get("kicker"):
            page = read(WEB, a, "index.html")
            m = re.search(r'<p class="eyebrow"[^>]*\bdata-kicker\b[^>]*>(.*?)</p>', page, re.S)
            want = hub.get(a)
            if not want:
                err("kicker", a, "cannot inspect: the hub has no card kicker for this page")
            elif not m:
                err("kicker", a, "claims.json opts into a kicker, and index.html has no eyebrow with data-kicker")
            elif _flat(m.group(1)) != want:
                err("kicker", a, f"kicker reads {_flat(m.group(1))!r}; the hub asks {want!r}")
        elif a in hub:
            pending["kicker"].append(a)

        # [plant]
        pl = spec.get("plant")
        if pl is None:
            if a in hub:
                pending["plant"].append(a)
        elif not isinstance(pl, list) or not 1 <= len(pl) <= 3:
            err("plant", a, "claims.json plant must list one to three sentences")
        else:
            for k, item in enumerate(pl, 1):
                text, ids = item.get("text", ""), item.get("claims") or []
                if not text.strip() or not text.rstrip().endswith(".") or re.search(r"[.!?]\s+[A-Z]", text):
                    err("plant", f"{a}#{k}", "each If you run a plant here item is one sentence ending in a full stop")
                if not ids or any(i not in claims for i in ids):
                    err("plant", f"{a}#{k}", "must name at least one claim on the page, and only claims that exist; "
                        f"{', '.join(i for i in ids if i not in claims) or 'it names none'}")
                pool = " ".join(c.get("text", "") + " " + " ".join((c.get("scope") or {}).values())
                                for i, c in checked.items() if i in ids)
                have = set(NUM.findall(pool))
                for n in NUM.findall(text):
                    if n not in have:
                        err("plant", f"{a}#{k}", f"prints {n}, which none of its automatically checked "
                            f"claims ({', '.join(ids) or 'none named'}) states")

        # [glossary]
        g = spec.get("glossary")
        if not g:
            if a in hub:
                pending["glossary"].append(a)
        else:
            terms = g.get("terms") or []
            if not terms:
                err("glossary", a, "claims.json glossary declares no terms")
            for t in terms:
                if t not in gdef:
                    err("glossary", a, f"the page uses {t!r}, which _data/glossary.json does not define")
            if len(set(terms)) != len(terms):
                err("glossary", a, "a term is declared twice")
            have = set(NUM.findall(" ".join(c.get("text", "") for c in checked.values())))
            for t, note in (g.get("notes") or {}).items():
                if t not in terms:
                    err("glossary", a, f"a note for {t!r}, which the page does not declare")
                for n in NUM.findall(note):
                    if n not in have:
                        err("glossary", a, f"the note for {t!r} prints {n}, which no checked claim on the page states")

    # [kicker] the hub's own side: each card kicker is short, and each "Start with a
    # question" link reads its card's kicker
    for slug, k in hub.items():
        if len(k) > KICKER_MAX:
            err("kicker", f"index:{slug}", f"card kicker {k!r} is {len(k)} characters, over {KICKER_MAX}")
        if not k.endswith("?"):
            err("kicker", f"index:{slug}", f"card kicker {k!r} is not a question")
    for slug, text in hub_nav().items():
        if slug not in hub:
            err("kicker", f"index:{slug}", "a Start with a question link to a story whose card has no kicker")
        elif text != hub[slug]:
            err("kicker", f"index:{slug}", f"Start with a question link reads {text!r}; its card kicker is {hub[slug]!r}")

    for k, pages in pending.items():
        if pages:
            warn(k, "W4", f"{len(pages)} carded page(s) not yet opted in: {', '.join(sorted(pages))}")

    # [jobcounts]
    jc = load_json(os.path.join(WEB, "_data", "jobcounts.json"))
    shared = read(WEB, "_shared", "picviz.js")
    if f'const JOBCOUNTS = "{jc.get("anchor")}"' not in shared:
        err("jobcounts", "_data/jobcounts.json", f"anchor {jc.get('anchor')!r} is not the one picviz.js links to")
    hubkey = next((c for c in load_json(os.path.join(WEB, "index", "claims.json"))["claims"]
                   if c["id"] == "index-headcount-key"), None)
    rows = jc.get("rows") or []
    if len(rows) != 5:
        err("jobcounts", "_data/jobcounts.json", f"{len(rows)} rows; the table is the five totals (DECISIONS.md W4)")
    unlinked = sorted(r.get("story", "?") for r in rows if not r.get("linked"))
    if unlinked:
        warn("jobcounts", "W4", f"{len(unlinked)} row(s) whose story does not link to the table yet: {', '.join(unlinked)}")
    for r in rows:
        who = f"{r.get('story')}:{r.get('total')}"
        if r.get("story") not in arts:
            err("jobcounts", who, "names a story that is not a page")
            continue
        spec = load_json(os.path.join(WEB, r["story"], "claims.json"))
        c = next((x for x in spec["claims"] if x["id"] == r.get("claim")), None)
        if not c or c.get("verify") == "manual":
            err("jobcounts", who, f"claim {r.get('claim')!r} is not an automatically checked claim on {r['story']}")
        elif r["total"] not in NUM.findall(c.get("text", "")):
            err("jobcounts", who, f"the table prints {r['total']}; {r['story']}'s claim {c['id']} does not")
        if not hubkey:
            err("jobcounts", who, "cannot inspect: index/claims.json has no index-headcount-key")
            continue
        t = hubkey["text"]
        i = t.find(r["total"])
        clause = t[i: t.find(")", i) + 1] if i >= 0 else ""
        y = YEAR.search(r.get("year", ""))
        if not clause:
            err("jobcounts", who, "the table prints a total index-headcount-key does not check")
        elif not y or y.group(0) not in clause or r.get("label", "").lower() not in clause.lower():
            err("jobcounts", who, f"row says {r.get('year')!r} on {r.get('label')!r}; index-headcount-key says {clause!r}")


def main() -> int:
    arts = artifacts()
    reg_path = os.path.join(WEB, "_data", "SOURCES.json")
    reg = load_json(reg_path) if os.path.isfile(reg_path) else {}

    check_meta_classified(arts)
    check_registry_scripts(reg)
    check_registry_coverage(reg, arts)
    check_published_register(reg, arts)
    check_masthead_dates(arts)
    check_status(arts)
    check_neo14_name(arts)
    check_required_files(arts)
    check_methodology(arts)
    check_footprint_prose(arts)
    check_bundles(arts)
    check_hub(arts)
    check_duplicates(arts)
    check_empty_data(arts)
    check_corrections()
    check_catalog()
    check_reader_furniture(arts)

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
