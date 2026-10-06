"""Which date each page's masthead shows, and which files it has to be at least as new as.

THE RULE (John, 2026-09-30): a page's masthead date is the newest date among the data files
the page reads. _shared/picviz.js prints meta.as_of, else meta.fetched, of whatever meta the
page hands PV.methodology(); this module says which file that is (MASTHEAD_FILE) and which
files count as read (inputs()). derive_index.py uses it to date the hub, and
verify_consistency.py fails a page whose masthead date is not the newest input date, where
an input's date is the newest as_of, fetched or asOf anywhere in it (newest_date), nested
retrievals included.

A page "reads" a file when its claims.json loads it, its app.js loads it with PV.data(), or
it is listed in EXTRA_READS because a derive script reads it and the page restates it.
"""
import datetime
import json
import os
import re

# page -> data file (or list of files, newest wins) whose meta carries the masthead date. Unlinked pages are included:
# accountability is unlisted but still has a masthead.
MASTHEAD_FILE = {
    "accountability": "accountability.json", "atlas": "viz-data.json",
    "chain": "chain-data.json", "churn": "churn.json", "cluster-health": "health.json",
    "collaboration": "collaboration.json", "cost-scissors": "scissors.json",
    "federal-money": "federal.json", "funding-map": "funding.json",
    "laborshed": "laborshed.json", "location-quotient": "lq.json",
    "occupations": "viz-data.json", "patents": "patents.json", "peers": "peers.json",
    "programs": "viz-data.json", "reach": "reach.json", "realwage": "realwage.json",
    "revisions": "revisions.json", "scorecard": "scorecard.json",
    "sources": "registry.json", "wages": "wages.json",
    # timeline has no one file: its app.js prints the newer of its two files' asOf dates.
    "timeline": ["timeline.json", "heritage.json"],
}

# Files a derive script reads that neither the page's claims nor its app.js load.
# sources/derive_sources.py joins these five shipped page files, and more, into registry.json.
EXTRA_READS = {
    "sources": ["wages/data/wages.json", "laborshed/data/laborshed.json",
                "laborshed/data/bench.json", "timeline/data/timeline.json",
                "revisions/data/revisions.json", "peers/data/peers.json",
                "occupations/data/viz-data.json", "location-quotient/data/lq.json",
                "federal-money/data/techhub.json", "federal-money/data/federal.json",
                "cost-scissors/data/scissors.json", "chain/data/chain-data.json"],
}

DATE_KEYS = ("as_of", "fetched", "asOf")     # in the order picviz.js prefers them


def parse(v):
    """ISO or the prose form some pages use ("14 August 2026")."""
    try:
        return datetime.date.fromisoformat(v)
    except ValueError:
        return datetime.datetime.strptime(v, "%d %B %Y").date()


def meta_date(path):
    """The masthead-style date in a data file's meta, or None when it carries none."""
    m = json.load(open(path, encoding="utf-8")).get("meta")
    if not isinstance(m, dict):
        return None
    for k in DATE_KEYS:
        if isinstance(m.get(k), str):
            return parse(m[k])
    return None


def _loose(v):
    """A date from an ISO date, an ISO timestamp, or the prose form; None if it is none."""
    if not isinstance(v, str):
        return None
    if re.match(r"\d{4}-\d{2}-\d{2}", v):
        return datetime.date.fromisoformat(v[:10])
    try:
        return datetime.datetime.strptime(v, "%d %B %Y").date()
    except ValueError:
        return None


def newest_date(path):
    """The newest retrieval date ANYWHERE in a data file, not only in its top-level meta.

    Added 5 October 2026 (PR #46 review): funding map's masthead said "Newest data
    retrieved 13 August 2026", the register's date in meta.asOf, while the same file
    carried a USAspending check read on 1 September 2026 in meta.outlays.asOf and the page
    printed it; cost-scissors carried a CPI pull of 8 September 2026 under
    deflator.observations.meta.fetched. A nested retrieval is still a retrieval, so every
    as_of, fetched or asOf key at any depth counts."""
    found = []

    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in DATE_KEYS and isinstance(v, str):
                    d = _loose(v)
                    if d:
                        found.append(d)
                else:
                    walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(json.load(open(path, encoding="utf-8")))
    return max(found) if found else None


def masthead_files(page):
    f = MASTHEAD_FILE[page]
    return [os.path.join(page, "data", x) for x in ([f] if isinstance(f, str) else f)]


def masthead_date(web, page):
    dates = [meta_date(os.path.join(web, f)) for f in masthead_files(page)]
    return None if None in dates else max(dates)


def inputs(web, page):
    """Repo-relative paths of every data file the page reads, its own masthead file included."""
    files = set(masthead_files(page))
    spec = json.load(open(os.path.join(web, page, "claims.json"), encoding="utf-8")).get("data", {})
    for f in ([spec] if isinstance(spec, str) else spec.values()):
        if not f.endswith("claims.json"):
            files.add(os.path.normpath(os.path.join(page, "data", f)))
    app = open(os.path.join(web, page, "app.js"), encoding="utf-8").read()
    for f in re.findall(r"PV\.data\(\s*[\"']([^\"']+)", app):
        if f != "SOURCES.json":
            files.add(os.path.normpath(os.path.join(page, "data", f)))
    files.update(EXTRA_READS.get(page, []))
    return sorted(files)


def newest_input(web, page, own=True):
    """(date, path) of the newest dated input, or None when there is none. own=False leaves out the page's own masthead
    file, which is what a derive script needs: it is about to overwrite that file's date."""
    found = []
    for f in inputs(web, page):
        if not own and f in masthead_files(page):
            continue
        p = os.path.join(web, f)
        if os.path.exists(p):
            d = newest_date(p)
            if d:
                found.append((d, f))
    return max(found) if found else None
