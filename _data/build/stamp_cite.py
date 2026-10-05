"""Stamp each page's citation record: title, canonical URL and revision date.

    python3 _data/build/stamp_cite.py           # write _data/cite.json
    python3 _data/build/stamp_cite.py --print   # print what it would write; write nothing

THE REVISION DATE IS GIT'S, NOT TYPED (DECISIONS.md, 5 October 2026). A page's "Page revised"
byline date and the version in its "Cite as" line are the author date of the newest
non-merge commit that touched the page's folder. A folder with uncommitted changes is dated
today, because that is the date the commit carrying them will have; so run this after the
last edit and commit the result with it. Merge commits are skipped so a merge does not
re-date every page it brings in; author dates survive rebase and cherry-pick.

The site is served as raw folders on GitHub Pages, with no build step at serve time, so the
dates are stamped into a file the pages read (_shared/picviz.js, madeAndChecked) rather than
asked of git by a visitor. tools/disclosure.mjs re-runs this with --print and fails a page
whose recorded date differs from git's, so a page edited without re-stamping cannot ship a
stale "Page revised". A shallow clone cannot answer the question, so this exits non-zero
rather than dating every page to the one commit it can see.

The canonical URL is CITATION.cff's url plus the page folder; the hub cites the room at the
root. The title is the page's own <title>, less any " — Polymer Industry Cluster" suffix.
"""
import datetime
import html
import json
import os
import re
import subprocess
import sys

WEB = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(WEB, "_data", "cite.json")
SKIP = {"dist", "tools", "node_modules"}


def git(*args):
    return subprocess.run(["git", *args], cwd=WEB, capture_output=True, text=True,
                          check=True).stdout.strip()


def pages():
    return sorted(d for d in os.listdir(WEB)
                  if not d.startswith((".", "_")) and d not in SKIP
                  and os.path.isfile(os.path.join(WEB, d, "index.html"))
                  and os.path.isfile(os.path.join(WEB, d, "app.js")))


def base():
    m = re.search(r'^url:\s*"([^"]+)"', open(os.path.join(WEB, "CITATION.cff"), encoding="utf-8").read(), re.M)
    if not m:
        sys.exit("stamp_cite: CITATION.cff carries no url")
    return m.group(1).rstrip("/") + "/"


def title(page):
    src = open(os.path.join(WEB, page, "index.html"), encoding="utf-8").read()
    m = re.search(r"<title>(.*?)</title>", src, re.S)
    if not m:
        sys.exit(f"stamp_cite: {page}/index.html has no <title>")
    t = re.sub(r"\s+", " ", html.unescape(m.group(1))).strip()
    return re.sub(r"\s+[—-]\s+Polymer Industry Cluster$", "", t)


def revised(page):
    if git("status", "--porcelain", "--untracked-files=no", "--", f"{page}/"):
        return datetime.date.today().isoformat()
    d = git("log", "-1", "--no-merges", "--format=%as", "--", f"{page}/")
    if not d:
        sys.exit(f"stamp_cite: git has no commit touching {page}/")
    return d


def build():
    if git("rev-parse", "--is-shallow-repository") == "true":
        sys.exit("stamp_cite: shallow clone, so git cannot say when each page last changed; "
                 "fetch the full history (actions/checkout fetch-depth: 0)")
    root = base()
    return {
        "_note": "Written by _data/build/stamp_cite.py from git and CITATION.cff; do not edit by hand. "
                 "revised is the author date of the newest non-merge commit touching the page folder.",
        "base": root,
        "pages": {p: {"title": title(p), "url": root if p == "index" else f"{root}{p}/",
                      "revised": revised(p)} for p in pages()},
    }


if __name__ == "__main__":
    data = build()
    text = json.dumps(data, indent=1, ensure_ascii=False) + "\n"
    if "--print" in sys.argv:
        sys.stdout.write(text)
    else:
        with open(OUT, "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"stamp_cite: {len(data['pages'])} pages -> {os.path.relpath(OUT, WEB)}")
