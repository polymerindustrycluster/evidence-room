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

The markup is exactly what PV.wordsOnPage and PV.jobCounts would render, so the script finds
it present and leaves it alone. verify_consistency.py [static] fails a page whose region is
missing, empty or differs from what this file would write now, so editing _data/glossary.json,
_data/jobcounts.json or a page's glossary declaration without re-running this fails the build.

A NEW PAGE (the W4 content PR): declare `glossary` in claims.json, put the two marker lines
where the block belongs (empty between them), and run this file.
"""
from __future__ import annotations

import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
REGION = re.compile(r"([ \t]*)(<!-- pv:static (\w+) -->)(.*?)<!-- /pv:static -->", re.S)


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
    rows = "\n".join(
        f'<tr><th scope="row">{r["total"]}</th><td>{r["industry"]}</td><td>{r["year"]}</td>'
        f'<td>{r["source"]}</td><td><a href="../{r["story"]}/">{r["label"]}</a></td></tr>'
        for r in jc["rows"])
    return (f'<div class="pv-jobcounts-mount" id="{jc["anchor"]}"><div class="pv-jobcounts-scroll">'
            '<table class="pv-jobcounts">\n'
            '<caption>Why the job counts differ: five totals for the same twelve counties</caption>\n'
            f"<thead><tr>{head}</tr></thead>\n<tbody>\n{rows}\n</tbody></table></div></div>")


def expected() -> dict[str, dict[str, str]]:
    """{page: {region: markup}} for every region the site must carry."""
    glossary = _load("_data", "glossary.json")
    out: dict[str, dict[str, str]] = {"index": {"jobcounts": jobcounts_html(_load("_data", "jobcounts.json"))}}
    for a in sorted(os.listdir(WEB)):
        cp = os.path.join(WEB, a, "claims.json")
        if a.startswith(("_", ".")) or not os.path.isfile(cp):
            continue
        spec = _load(a, "claims.json")
        if spec.get("glossary"):
            out.setdefault(a, {})["words"] = words_html(spec, glossary)
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
    probs = problems(write="--check" not in sys.argv)
    for page, msg in probs:
        print(f"{page}: {msg}")
    sys.exit(1 if probs else 0)
