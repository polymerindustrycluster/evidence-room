"""Write the W4 reader furniture into each page's HTML as static markup.

    python3 _data/build/render_static.py           # write every marked region
    python3 _data/build/render_static.py --check   # list regions that differ; exit 1 if any

WHY STATIC (PR #54 review, 7 October 2026). The hub's job-count table and peers' "Words on
this page" block were first drawn by script into empty mounts. With scripting off the hub lost
all five job-count explanations it had carried as prose, and peers lost the glossary it had
carried as static text, while the hub still promised a table. Both are now written here, from
the same files the script reads, between marker comments in the page's own index.html:

    <!-- pv:static words -->  ...  <!-- /pv:static -->      any page whose claims.json
                                                           declares a glossary
    <!-- pv:static jobcounts -->  ...  <!-- /pv:static -->  index/index.html
    <!-- pv:static plant -->  ...  <!-- /pv:static -->      any page whose claims.json
                                                           declares plant (W4 content):
                                                           directly after the closer, the
                                                           box plus a <noscript> quote

The markup is exactly what PV.wordsOnPage and PV.jobCounts would render, so the script finds
it present and leaves it alone. verify_consistency.py [static] fails a page whose region is
missing, empty or differs from what this file would write now, so editing _data/glossary.json,
_data/jobcounts.json or a page's glossary declaration without re-running this fails the build.

    <!-- pv:static nojs -->  ...  <!-- /pv:static -->       every page with a claims.json:
                                                           directly after <main>
    <!-- pv:static nojs-byline -->  ...  <!-- /pv:static --> the same pages: directly after
                                                           the byline <p>

THE PAGE WITHOUT SCRIPTING (fresh-access review, 1 November 2026). With scripting off a story
lost its stat tiles, scope lines, "This finding breaks if", status sentence, revision date,
corrections count and citation, and nothing said anything was missing. The two nojs regions
are wholly inside <noscript>, so a scripted page never parses them: `nojs` says the charts
need JavaScript and, on a PROTOTYPE or INTERNAL page, prints the status sentence statusBanner
prints; `nojs-byline` prints the revision date, the corrections sentence, the headline
figures' scope lines, the hero's breaks_if and the cite line, in the words PV.madeAndChecked,
PV.correctionsSummary, PV.figures and PV.breaksIf use. The revision date is stamp_cite.py's
(git's), so a commit that touches a page folder on a new day leaves this region stale until
this file is re-run: [static] says so.

A NEW PAGE (the W4 content PR): declare `glossary` in claims.json, put the two marker lines
where the block belongs (empty between them), and run this file.
"""
from __future__ import annotations

import html
import json
import os
import re
import subprocess
import sys

import masthead
import stamp_cite

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
REGION = re.compile(r"([ \t]*)(<!-- pv:static ([\w-]+) -->)(.*?)<!-- /pv:static -->", re.S)


def _load(*parts):
    with open(os.path.join(WEB, *parts), encoding="utf-8") as fh:
        return json.load(fh)


def words_html(spec: dict, glossary: dict) -> str:
    """The "Words on this page" block, as PV.wordsOnPage renders it."""
    g = spec.get("glossary") or {}
    by = {t["term"]: t for t in glossary.get("terms", [])}
    items = []
    for term in g.get("terms") or []:
        t = by.get(term)
        if not t:
            raise ValueError(f"glossary term {term!r} is defined nowhere in _data/glossary.json")
        short = re.sub(rf"\b({re.escape(term)}\w*)", r"<b>\1</b>", t["short"], count=1, flags=re.I)
        text = " ".join(x for x in (short, t.get("long"), (g.get("notes") or {}).get(term)) if x)
        items.append(f'<li data-term="{html.escape(term)}">{text}</li>')
    return ('<details class="pv-words"><summary>Words on this page</summary><ul>\n'
            + "\n".join(items) + "\n</ul></details>")


def jobcounts_html(jc: dict) -> str:
    """The hub's job-count table, as PV.jobCounts renders it."""
    head = "".join(f'<th scope="col">{h}</th>' for h in ("Total", "Industry", "Year", "Source", "Story"))
    n = NUMBER.get(len(jc["rows"]), str(len(jc["rows"])))
    rows = "\n".join(
        f'<tr><th scope="row">{r["total"]}</th><td>{r["industry"]}</td><td>{r["year"]}</td>'
        f'<td>{r["source"]}</td><td><a href="../{r["story"]}/">{r["label"]}</a></td></tr>'
        for r in jc["rows"])
    return (f'<div class="pv-jobcounts-mount" id="{jc["anchor"]}"><div class="pv-jobcounts-scroll">'
            '<table class="pv-jobcounts">\n'
            f'<caption>Why the job counts differ: {n} totals for the same twelve counties</caption>\n'
            f"<thead><tr>{head}</tr></thead>\n<tbody>\n{rows}\n</tbody></table></div></div>")


def plant_html(spec: dict) -> str:
    """The "If you run a plant here" box, as PV.plantBox renders it, followed by the page's
    "Quote this" sentence for readers without scripting (the how-we-checked box that carries
    it is written by script; with scripting on, <noscript> renders nothing)."""
    items = "".join(f'<li data-claims="{html.escape(" ".join(i.get("claims") or []))}">{i["text"]}</li>'
                    for i in spec.get("plant") or [])
    q = (spec.get("quote") or {}).get("text")
    quote = (f'\n<noscript><p class="pv-quote"><b>Quote this:</b> \u201c<span class="pv-quote-text">'
             f'{q}</span>\u201d</p></noscript>') if q else ""
    return ('<section class="pv-plant-band"><div class="wrap"><aside class="pv-plant" aria-labelledby="pv-plant-h">\n'
            f'<h2 id="pv-plant-h">If you run a plant here</h2>\n<ul>{items}</ul>\n</aside>{quote}</div></section>')


NUMBER = {2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten"}
# The same words as STATUS in _shared/picviz.js (statusBanner) and BANNER in tools/disclosure.mjs.
STATUS = {"PROTOTYPE": ("Prototype:", "a public draft. Figures may change; check with PIC before citing."),
          "INTERNAL": ("Internal working view:", "deliberately unlisted and not for citation.")}
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]


def long_date(iso: str) -> str:
    y, m, d = iso.split("-")
    return f"{int(d)} {MONTHS[int(m) - 1]} {y}"


def status_of(page: str) -> str | None:
    """The page's declared meta.status, read as tools/disclosure.mjs reads it."""
    if page == "index":
        return _load("index", "data", "counts.json").get("status")
    found = {_load(f)["meta"].get("status") for f in masthead.masthead_files(page)}
    return found.pop() if len(found) == 1 else None


def revised(page: str) -> str:
    """stamp_cite's date, as a ValueError (which [static] reports) rather than its sys.exit."""
    try:
        return stamp_cite.revised(page)
    except (SystemExit, OSError, subprocess.CalledProcessError) as exc:
        raise ValueError(f"{page}: no revision date from git ({exc})") from None


def nojs_html(page: str) -> str:
    """At the top of <main>: what is missing without scripting, then the status sentence."""
    word = status_of(page)
    st = STATUS.get(word or "")
    status = f'\n<p class="pv-status" data-status="{word}"><b>{st[0]}</b> {st[1]}</p>' if st else ""
    return ('<noscript><div class="wrap pv-nojs">'
            "<p>This page\u2019s charts and tables need JavaScript; the figures below are the text version.</p>"
            f"{status}</div></noscript>")


def nojs_byline_html(page: str, spec: dict, corr: dict, title: str, url: str) -> str:
    """After the byline: what the scripted byline, figures and how-we-checked box carry."""
    when = revised(page)
    out = [f'<p>Revised <time datetime="{when}">{long_date(when)}</time>.']
    pub = [e for e in corr.get("pages", {}).get(page, []) if not e.get("before_publication")]
    if pub:
        moved = sorted(set(corr.get("headlines", {}).get(page) or []))
        n = len(pub)
        out[0] += (f" {n} correction{'' if n == 1 else 's'} since publication. " + (
            f"Headline wording last changed {long_date(moved[-1])} (<a href=\"https://github.com/"
            f"polymerindustrycluster/evidence-room/commits/main/{page}/index.html\">repository history</a>)."
            if moved else "Headline unchanged.") +
            f' See them in the <a href="../corrections/?page={page}">corrections log</a>.')
    out[0] += "</p>"
    scopes = list(dict.fromkeys(" \u00b7 ".join(c["scope"][k] for k in ("industry", "place", "period", "source"))
                                for c in spec.get("claims") or [] if c.get("scope")))
    if scopes:
        out.append("<p>What the headline figures cover:</p><ul>" +
                   "".join(f"<li>{x}</li>" for x in scopes) + "</ul>")
    hero = next((c for c in spec.get("claims") or [] if c["id"] == spec.get("hero")), None)
    if hero and hero.get("breaks_if") and hero.get("guards"):
        out.append(f'<p><b>This finding breaks if:</b> {hero["breaks_if"]}</p>')
    pub_as = "Polymer Industry Cluster (PIC). Version" if page == "index" \
        else "Polymer Industry Cluster (PIC) Evidence Room, version"
    stop = "" if re.search(r"[?!.]$", title) else "."
    out.append(f'<p><b>Cite as:</b> Swanson, J., Polymer Industry Cluster ({when[:4]}). <cite>{title}</cite>{stop} '
               f'{pub_as} <time datetime="{when}">{long_date(when)}</time>. <a href="{url}">{url}</a>. '
               "Creative Commons Attribution 4.0 (CC BY 4.0).</p>")
    return '<noscript><div class="pv-nojs">\n' + "\n".join(out) + "\n</div></noscript>"


def expected() -> dict[str, dict[str, str]]:
    """{page: {region: markup}} for every region the site must carry."""
    glossary = _load("_data", "glossary.json")
    corr = _load("_data", "corrections_by_page.json")
    root = stamp_cite.base()
    out: dict[str, dict[str, str]] = {"index": {"jobcounts": jobcounts_html(_load("_data", "jobcounts.json"))}}
    for a in sorted(os.listdir(WEB)):
        cp = os.path.join(WEB, a, "claims.json")
        if a.startswith(("_", ".")) or not os.path.isfile(cp):
            continue
        spec = _load(a, "claims.json")
        if spec.get("glossary"):
            out.setdefault(a, {})["words"] = words_html(spec, glossary)
        if spec.get("plant"):
            out.setdefault(a, {})["plant"] = plant_html(spec)
        url = root if a == "index" else f"{root}{a}/"
        out.setdefault(a, {}).update(nojs=nojs_html(a),
                                     **{"nojs-byline": nojs_byline_html(a, spec, corr, stamp_cite.title(a), url)})
    return out


def problems(write: bool = False) -> list[tuple[str, str]]:
    """(page, message) for every region that is missing, empty or stale. With write=True,
    stale regions are rewritten first and only the unfixable (missing markers) remain."""
    out = []
    for page, regions in expected().items():
        path = os.path.join(WEB, page, "index.html")
        with open(path, encoding="utf-8") as fh:
            src = fh.read()
        found = {m.group(3): m for m in REGION.finditer(src)}
        new = src
        for name, markup in regions.items():
            m = found.get(name)
            if not m:
                out.append((page, f"no <!-- pv:static {name} --> region in index.html; add the two marker lines"))
                continue
            if m.group(4).strip() == markup:
                continue
            if write:
                ind = m.group(1)
                new = new.replace(m.group(0), f"{ind}{m.group(2)}\n{markup}\n{ind}<!-- /pv:static -->", 1)
            else:
                out.append((page, f"the static {name} region is "
                            f"{'empty' if not m.group(4).strip() else 'stale'}; run _data/build/render_static.py"))
        for name in found:
            if name not in regions:
                out.append((page, f"a pv:static {name} region the page's data does not declare"))
        if write and new != src:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(new)
            print(f"wrote {page}/index.html")
    return out


if __name__ == "__main__":
    write = "--check" not in sys.argv
    probs = problems(write=write)
    if write:   # a page this run made dirty is dated today by stamp_cite, so settle its nojs-byline
        probs = problems(write=True)
    for page, msg in probs:
        print(f"{page}: {msg}")
    sys.exit(1 if probs else 0)
