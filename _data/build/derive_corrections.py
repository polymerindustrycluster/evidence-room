"""Build the rendered corrections log from CORRECTIONS.md, and each page's correction summary.

WHY IT EXISTS. CORRECTIONS.md is the site's append-only record of what it got wrong, and every
"corrections log" link pointed at the raw Markdown on GitHub: a reader left the site to read
it, could not filter it to the page they came from, and no page said at the top whether it
had ever been corrected (DECISIONS.md, 2026-10-04, D3). This reads the file and writes:

  corrections/data/corrections.json   every entry, rendered to HTML, newest first, with the
                                      pages it names; read by the corrections/ page.
  _data/corrections_by_page.json      per page, the entries that name it, each with
                                      `headline_changed`; read by PV.correctionsSummary()
                                      on every page.

ENTRIES ARE NEVER ALTERED. The Markdown is rendered as written: no character of an entry is
changed, reordered or dropped. A heading is split into its date and its title for display,
and a relative link is pointed at the file on GitHub, because the page is not at the
repository root. verify_consistency.py re-runs parse() and fails if either output differs
from what this would write now, so a stale or hand-edited output cannot ship.

WHICH PAGES AN ENTRY NAMES. Most entries name their pages in italics (*wages*, *index, chain*),
in the heading or on a sub-heading; an entry also belongs to every page its text names by
folder name, title or (for the hub) "front page", less MENTION_EXCLUDED, each with a reason.
Entries naming pages only in other prose ("the price page") are in PAGES_BY_HEADING; an entry
that ends up naming no page FAILS the build rather than vanishing from every filter.

NO KIND. Each page's summary counts the entries naming it and says whether its headline
changed. An automatic wording/figure split was tried and was wrong in both directions (John,
2026-10-05). Headline changes are read from git: the dates the page's <h1> text changed after
the commit that first published it (headline_dates()).

  python3 _data/build/derive_corrections.py           write both files
  python3 _data/build/derive_corrections.py --check   exit 1 if either is stale
"""
import datetime
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))
SRC = os.path.join(WEB, "CORRECTIONS.md")
OUT_LOG = os.path.join(WEB, "corrections", "data", "corrections.json")
OUT_PAGES = os.path.join(WEB, "_data", "corrections_by_page.json")
REPO = "https://github.com/polymerindustrycluster/evidence-room/blob/main/"
NOT_PAGES = {"_data", "_shared", "dist", "tools", "shots", "node_modules", "corrections"}

# Entries that name their pages in prose rather than italics, read by hand. Keyed by the
# whole heading, so an entry that is not here and names no page in italics fails loudly.
PAGES_BY_HEADING = {
    "2026-09-30 — Mastheads that showed no data date, or the wrong one":
        ["churn", "laborshed", "realwage", "revisions", "wages", "index", "chain", "scorecard",
         "accountability", "sources", "patents", "timeline"],
    "2026-09-28 — Wages said pay was level with manufacturing, and it is two families that are not":
        ["wages", "index"],
    "2026-09-28 — The timeline printed seventeen times as a measured pace, from a before count that is a floor":
        ["timeline"],
    "2026-09-28 — The funding map credited the state with promises that came from partners":
        ["funding-map"],
    "2026-09-28 — Cost scissors claimed a gain its price data cannot show, and an order it held only lately":
        ["cost-scissors"],
    "2026-09-28 — Churn said most hires come from other plastics employers, which the series cannot show":
        ["churn", "index"],
    "2026-09-28 — The front page sent the state question to a county page": ["index"],
    "2026-09-12 — The bureau revised 2025 after first publication, and six pages had not followed":
        ["cluster-health", "location-quotient", "wages", "accountability", "index", "sources"],
    "2026-09-11 — Education scope, recruiting claims and chain captions": ["occupations", "chain"],
    "2026-09-11 — Chain geography and the invalid coverage comparison": ["chain"],
    "2026-09-11 — Historical contributions are not blanket scientific firsts": ["timeline"],
    "2026-09-11 — Narrative claims must match their denominators and limits":
        ["index", "scorecard", "accountability", "churn", "programs", "reach", "revisions",
         "location-quotient"],
    "2026-09-11 — Institution records are not distinct schools": ["atlas"],
    "2026-09-11 — Documentary descriptions and event-count fallbacks":
        ["atlas", "peers", "timeline", "funding-map"],
    "2026-09-10 — Publication controls and historical attribution": ["collaboration", "timeline"],
    "2026-09-10 — Residence records, price gaps and source limits":
        ["laborshed", "sources", "cost-scissors"],
    "2026-09-09 — Federal category-share check note": ["federal-money"],
    "2026-09-08 — The price page's second source": ["sources", "cost-scissors"],
    "2026-09-08 — Price-page inflation dependency": ["cost-scissors"],
    "2026-09-08 — Comparison units and the smaller regional metro": ["index", "programs", "realwage"],
    "2026-09-08 — Hub coverage and the headline threshold": ["index"],
    "2026-09-08 — Local metro membership": ["sources", "realwage"],
    "2026-09-08 — Program comparisons before rounding": ["programs"],
    "2026-09-08 — Comparator and chronology follow-up":
        ["federal-money", "accountability", "scorecard", "cluster-health", "programs", "realwage",
         "index"],
    "2026-09-08 — Federal categories and inflation": ["federal-money", "sources", "index", "cluster-health"],
    "2026-09-08 — Wage geography and the meaning of a wage statistic": ["realwage", "peers", "wages"],
    "2026-09-08 — Programs: definitions, continuity and grant timing": ["programs"],
    "2026-09-08 — Jobs, workplaces and the national comparison": ["cluster-health"],
    "2026-09-08 — Directory summaries and the scope of verification": ["index", "programs", "atlas"],
    "2026-09-01, eleventh entry — a removed row, and the count that moved with it": ["timeline"],
    "2026-09-01, eighth entry — the reader, who had no way in": ["atlas", "programs"],
    "2026-09-01, fourth entry — the atlas re-projection, and a page with no producer": ["atlas"],
}

# Entries about the site as a whole that correct no one page's statement. They are in the
# log, shown under "every page", and named by no page's filter or count.
SITE_WIDE = set()

# AN ENTRY BELONGS TO EVERY PAGE IT NAMES: in its italics, or in its text by the page's
# folder name, that name with spaces, its <title>, or (for the hub) "front page" / "the hub".
# A body mention that does not mean the page's own text changed is excluded here, by hand,
# with the reason; every entry was read against this rule on 2026-10-05 (PR #49 review,
# which found cluster-health's WPU06 label correction counted only on two other pages).
# An exclusion that no longer matches a mention fails the build.
MENTION_EXCLUDED = {
    ("2026-10-04 — The corrections log is a page", "chain"): "its corrections-log link changed address, not its words",
    ("2026-10-04 — The corrections log is a page", "index"): "its corrections-log link changed address, not its words",
    ("2026-10-04 — The corrections log is a page", "collaboration"): "a dated note moved below the headline, unaltered",
    ("2026-10-04 — The corrections log is a page", "cost-scissors"): "dated notes moved below the headline, unaltered",
    ("2026-10-04 — The corrections log is a page", "funding-map"): "a dated note moved below the headline, unaltered",
    ("2026-10-04 — The corrections log is a page", "wages"): "dated notes moved below the headline, unaltered",
    ("2026-10-04 — One name per county set", "programs"): "\"PIC's main site and programs\": PIC's programs, not the page",
    ("2026-09-30 — Two replication recipes", "laborshed"): "the sources page's labour shed recipe; laborshed unchanged",
    ("2026-09-30 — Two replication recipes", "location-quotient"): "the concept, in the sources page's recipe",
    ("2026-09-30 — A seat called the winner", "funding-map"): "cited as already stating the basis",
    ("2026-09-30 — Mastheads that showed no data date", "occupations"): "patents restates occupations' data; occupations unchanged",
    ("2026-09-29 — Federal money does reach PIC", "federal-money"): "the words \"federal money\" in the title",
    ("2026-09-29 — Federal money does reach PIC", "reach"): "the verb",
    ("2026-09-29 — The scorecard and the accountability page", "chain"): "the scorecard quoted chain's count; chain unchanged",
    ("2026-09-29 — The scorecard and the accountability page", "funding-map"): "the scorecard's copy of the funding map's note",
    ("2026-09-29 — The scorecard and the accountability page", "index"): "\"the hub\" is the Ohio Innovation Hub",
    ("2026-09-29 — The scorecard and the accountability page", "occupations"): "the scorecard uses occupations' code list",
    ("2026-09-29 — The scorecard and the accountability page", "programs"): "\"workforce programs\", not the page",
    ("2026-09-29 — The scorecard and the accountability page", "timeline"): "the accountability page's own timeline band",
    ("2026-09-29 — Labels and cards that said more", "chain"): "chain's card on the front page (index carries it)",
    ("2026-09-29 — Labels and cards that said more", "reach"): "reach's card on the front page (index carries it)",
    ("2026-09-29 — Labels and cards that said more", "federal-money"): "the federal-money card on the front page",
    ("2026-09-29 — Labels and cards that said more", "funding-map"): "the funding-map card on the front page",
    ("2026-09-28 — Seven more statements", "funding-map"): "the funding-map card on the front page",
    ("2026-09-28 — Seven more statements", "timeline"): "cited for its date of record, already right",
    ("2026-09-28 — Cost scissors claimed a gain", "chain"): "\"in this chain\", not the page",
    ("2026-09-28 — Churn said most hires", "reach"): "the verb",
    ("2026-09-12 — The bureau revised 2025", "federal-money"): "the sources page's claim tally counts its guards",
    ("2026-09-11 — Education scope", "reach"): "\"recruiting reach\", not the page",
    ("2026-09-11 — Historical contributions", "sources"): "\"sources that did not establish\", not the page",
    ("2026-09-11 — Narrative claims", "atlas"): "an Atlas threshold on a front-page card (index carries it)",
    ("2026-09-11 — Documentary descriptions", "sources"): "\"direct sources\", not the page",
    ("2026-09-10 — Residence records", "revisions"): "\"size of revisions\", not the page",
    ("2026-09-08 — Price-page inflation dependency", "federal-money"): "the source of a copied index; federal-money unchanged",
    ("2026-09-08 — Comparator and chronology", "wages"): "\"individual wages\", not the page",
    ("2026-09-08 — Wage geography", "sources"): "\"price sources\", not the page",
    ("2026-09-08 — Directory summaries", "reach"): "the verb",
    ("2026-09-08 — Directory summaries", "revisions"): "\"upstream revisions\", not the page",
    ("2026-09-01, tenth entry", "chain"): "\"the hub's chain card\" (index carries it)",
    ("2026-09-01, tenth entry", "reach"): "the verb",
    ("2026-09-01, tenth entry", "timeline"): "the right-of-reply block names it; the block is every page's",
    ("2026-09-01, ninth entry", "accountability"): "named in the front page's corrected universals",
    ("2026-09-01, fourth entry", "location-quotient"): "the sources page's worked arithmetic",
    ("2026-09-01, fourth entry", "programs"): "cited for the quarantine it already had",
    ("2026-09-01, fourth entry", "sources"): "\"with no reader-facing change\"",
    ("2026-09-01, second entry", "wages"): "\"real wages\", the realwage page's figure",
    ("2026-09-01 — nine corrections", "laborshed"): "the sources page's not-yet note named it",
    ("2026-08-31 — three corrections", "revisions"): "cited as where the measured noise floor lives",
    ("2026-08-30 — four corrections", "wages"): "\"Employment and Wages\", the census's name",
    ("2026-08-29 — a hierarchy ranked", "accountability"): "said still to carry $106.3M; unchanged",
    ("2026-08-29 — a hierarchy ranked", "index"): "said still to carry $106.3M; unchanged",
    ("2026-08-29 — a hierarchy ranked", "scorecard"): "said still to carry $106.3M; unchanged",
    ("2026-08-17 — the pre-publication review", "cluster-health"): "cited as already on the finished-years basis",
    ("2026-08-17 — the pre-publication review", "federal-money"): "its card on the front page (index carries it)",
    ("2026-08-17 — the pre-publication review", "funding-map"): "its card on the front page (index carries it)",
}


def page_title(page):
    m = re.search(r"<title>(.*?)</title>", open(os.path.join(WEB, page, "index.html"), encoding="utf-8").read(), re.S)
    return html.unescape(m.group(1).strip()) if m else ""


def mention_patterns(pages):
    pats = {}
    for p in pages:
        alts = [re.escape(p), re.escape(p.replace("-", " ")), re.escape(page_title(p))]
        if p == "index":
            alts = [r"front[- ]page", r"the hub\b", r"hub(?:'s|’s)? ", re.escape(page_title(p))]
        if p == "laborshed":
            alts.append(r"labou?r[- ]shed")
        if p == "realwage":
            alts.append(r"real[- ]wage")
        pats[p] = re.compile(r"(?<![\w/-])(?:" + "|".join(a for a in alts if a) + r")(?![\w-])", re.I)
    return pats


# HEADLINE CHANGES ARE READ FROM GIT, NOT LISTED (PR #49 review, 2026-10-05: a hand list
# missed realwage, programs and cluster-health). For each page, the author dates of the non-merge
# commits after the one that first published it in which the text of its <h1> in
# index.html changed (tags stripped, entities decoded, whitespace collapsed, so markup alone
# is no change). chain's script-rendered H1 is held to the static one by its own claim.
def h1_text(src):
    """The H1's words: tags, whitespace and quote style aside, so markup, a line break or a
    typographic quote is not a change and a word or a number is."""
    m = re.search(r"<h1\b[^>]*>(.*?)</h1>", src or "", re.S | re.I)
    if not m:
        return None
    t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1)))
    return re.sub(r"\s+", "", t.translate(str.maketrans("‘’“”", "''\"\"")))


def _git(repo, *args):
    import subprocess
    r = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def headline_dates(page, repo=WEB):
    """Sorted unique dates on which the page's H1 text changed after first publication."""
    path = f"{page}/index.html"
    log = _git(repo, "log", "--no-merges", "--reverse", "--format=%H %as", "--", path) or ""
    dates = []
    for line in log.split("\n"):
        if not line.strip():
            continue
        sha, day = line.split()
        before = _git(repo, "show", f"{sha}^:{path}")
        if before is None:
            continue          # the commit that published the page
        if h1_text(before) != h1_text(_git(repo, "show", f"{sha}:{path}")):
            dates.append(day)
    return sorted(set(dates))


def history_is_complete(repo=WEB):
    return (_git(repo, "rev-parse", "--is-shallow-repository") or "").strip() == "false"


# Pages an entry corrected before the page was first published. They stay in the log and in
# its filter, and are left out of "N corrections since publication". (heading prefix, page).
BEFORE_PUBLICATION = [
    ("2026-09-29 — The scorecard and the accountability page before their first publication", "scorecard"),
    ("2026-09-29 — The scorecard and the accountability page before their first publication", "accountability"),
    ("2026-08-17 — the pre-publication review", "collaboration"),    # each sub-entry: "not published"
    ("2026-08-17 — the pre-publication review", "reach"),
]


# ------------------------------------------------------------------------- markdown
def _flank(prev, nxt):
    """CommonMark's left- and right-flanking test for a run of asterisks."""
    ws = lambda c: c is None or c.isspace()
    pu = lambda c: c is not None and not c.isalnum() and not c.isspace()
    left = not ws(nxt) and (not pu(nxt) or ws(prev) or pu(prev))
    right = not ws(prev) and (not pu(prev) or ws(nxt) or pu(nxt))
    return left, right


def _emphasis(s):
    """*italic* and **bold**, nested either way, by a delimiter stack. Text is pre-escaped."""
    out, stack, i = [], [], 0
    while i < len(s):
        if s[i] != "*":
            j = s.find("*", i)
            j = len(s) if j < 0 else j
            out.append(s[i:j])
            i = j
            continue
        j = i
        while j < len(s) and s[j] == "*":
            j += 1
        n = j - i
        prev = s[i - 1] if i else None
        nxt = s[j] if j < len(s) else None
        can_open, can_close = _flank(prev, nxt)
        while n and can_close and stack and n >= len(stack[-1][0]):
            mark, at = stack.pop()
            out[at] = "<b>" if mark == "**" else "<em>"
            out.append("</b>" if mark == "**" else "</em>")
            n -= len(mark)
        while n and can_open:
            mark = "**" if n == 2 else "*"
            stack.append((mark, len(out)))
            out.append(mark)
            n -= len(mark)
        if n:
            out.append("*" * n)
        i = j
    return "".join(out)


def inline(text):
    """One paragraph's inline Markdown to HTML: code, links, emphasis. Nothing reworded."""
    keep = []

    def hold(h):
        keep.append(h)
        return f"\x00{len(keep) - 1}\x00"

    s = re.sub(r"`([^`]+)`", lambda m: hold(f"<code>{html.escape(m.group(1), quote=False)}</code>"), text)

    def link(m):
        url = m.group(2)
        if not re.match(r"^[a-z]+:", url):
            url = REPO + url
        return hold(f'<a href="{html.escape(url)}">') + m.group(1) + hold("</a>")

    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, s)
    s = html.escape(s, quote=False)
    s = _emphasis(s)
    return re.sub(r"\x00(\d+)\x00", lambda m: keep[int(m.group(1))], s)


def blocks(md):
    """Markdown body to a list of (kind, raw, html): paragraphs, ### heads, lists, rules."""
    out, para, items = [], [], []

    def flush():
        if para:
            raw = " ".join(x.strip() for x in para)
            out.append(("p", raw, f"<p>{inline(raw)}</p>"))
            para.clear()
        if items:
            out.append(("ol", " ".join(items), "<ol>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ol>"))
            items.clear()

    for line in md.split("\n"):
        if not line.strip():
            flush()
        elif line.startswith("### "):
            flush()
            out.append(("h", line[4:].strip(), f"<h4>{inline(line[4:].strip())}</h4>"))
        elif line.strip() == "---":
            flush()
            out.append(("hr", "---", "<hr>"))
        elif re.match(r"^\d+\. ", line) and (items or not para or line.startswith("1. ")):
            # a list starts on a fresh block, or at "1." (CommonMark): "2020. The page" inside
            # a paragraph is the year ending a wrapped sentence, not a list item
            if para:
                flush()
            items.append(re.sub(r"^\d+\. ", "", line).strip())
        elif items and line.startswith(" "):
            items[-1] += " " + line.strip()
        else:
            if items:
                flush()
            para.append(line)
    flush()
    return out


# ------------------------------------------------------------------------- reading
def page_slugs():
    return sorted(d for d in os.listdir(WEB)
                  if d not in NOT_PAGES and not d.startswith((".", "_"))
                  and os.path.isfile(os.path.join(WEB, d, "index.html")))


# Names an entry uses in italics for a page that are not its folder name.
ALIASES = {"front page": "index", "the front page": "index", "front-page": "index",
           "hub": "index", "the hub": "index"}
# Italic items in headings and sub-entry leads that are not pages, and why. Anything else in
# those places must resolve to a page, or the build fails (a name the filter cannot see is a
# page that silently loses an entry from its count).
NOT_PAGES_NAMED = {
    "five more": "a count of further pages, each named in its own sub-entry",
    "every page": "a change to every page's status banner; no one page's statement",
    "talent": "a withheld page, never published (2026-08-17 review)",
    "credit": "a withheld page, never published (2026-08-17 review)",
}


def italic_items(html_text):
    """Each item of each italic list: '*index, chain and front page*' gives three."""
    for m in re.finditer(r"<em>(.*?)</em>", html_text):
        for item in re.split(r",\s*|\s+and\s+", re.sub(r"<[^>]+>", "", m.group(1)).strip()):
            if item.strip():
                yield item.strip()


def resolve(item, pages):
    """The page an italic item names, or None. Whole item first (a slug or an alias), then
    its words, so '*location-quotient* and *funding-map*' and prose italics both read."""
    if item in pages:
        return [item]
    if item.lower() in ALIASES:
        return [ALIASES[item.lower()]]
    return [w for w in re.split(r"\s+", item) if w in pages]


def named_pages(html_text, pages):
    """Page slugs named in italics, in order of first appearance."""
    found = []
    for item in italic_items(html_text):
        for p in resolve(item, pages):
            if p not in found:
                found.append(p)
    return found


def unresolved_names(html_text, pages):
    """Italic items in a heading or sub-entry lead that name no page and are not known."""
    return [i for i in italic_items(html_text)
            if not resolve(i, pages) and i.lower() not in NOT_PAGES_NAMED]


def parse(text=None, history=True):
    """history=False skips reading headline dates from git (a shallow clone cannot)."""
    text = text if text is not None else open(SRC, encoding="utf-8").read()
    pages = page_slugs()
    head, *chunks = re.split(r"(?m)^## ", text)
    if not head.startswith("# Corrections"):
        raise SystemExit("derive_corrections: CORRECTIONS.md does not open with '# Corrections'")
    preamble = blocks(head.split("\n", 1)[1])
    items, used_pbh, used_excl = [], set(), set()
    mentions = mention_patterns(pages)
    for chunk in chunks:
        heading, body = chunk.split("\n", 1)
        heading = heading.strip()
        m = re.match(r"^(\d{4}-\d{2}-\d{2})(.*?) — (.+)$", heading)
        if not m:
            raise SystemExit(f"derive_corrections: heading not '<date> — <title>': {heading!r}")
        date, ordinal, title = m.group(1), m.group(2), m.group(3)
        datetime.date.fromisoformat(date)
        parts = re.split(r"(?m)^---[ \t]*$", body)
        main = blocks(parts[0])
        notes = [b for part in parts[1:] for b in blocks(part)]
        title_html = inline(title)
        named = named_pages(title_html + "".join(h for _, _, h in main), pages)
        if heading in PAGES_BY_HEADING:
            named = PAGES_BY_HEADING[heading]
            used_pbh.add(heading)
        # Every italic name in the heading, a ### head or a sub-entry's bold lead is a page.
        leads = [title_html] + [h for kind, raw, h in main if kind == "h"] + \
                [inline(lm.group(1)) for kind, raw, _ in main if kind == "p"
                 for lm in [re.match(r"\*\*(.+?)\*\*(?=\s|$)", raw)] if lm]
        lost = [n for h in leads for n in unresolved_names(h, pages)]
        if lost:
            raise SystemExit(f"derive_corrections: {heading!r} names {lost} in italics, which resolve to "
                             "no page; add an alias (ALIASES) or say why it is not one (NOT_PAGES_NAMED)")
        # Every page the entry's text names, unless excluded with a reason.
        text = html.unescape(re.sub(r"<[^>]+>", " ", title_html + " " + "".join(h for _, _, h in main)))
        for p, pat in mentions.items():
            if p in named or not pat.search(text):
                continue
            if any(heading.startswith(pre) and pg == p for pre, pg in MENTION_EXCLUDED):
                used_excl.update((pre, pg) for pre, pg in MENTION_EXCLUDED if heading.startswith(pre) and pg == p)
                continue
            named = named + [p]
        if heading in SITE_WIDE:
            named = []
            used_pbh.add(heading)
        elif not named:
            raise SystemExit(f"derive_corrections: {heading!r} names no page in italics and is not in "
                             "PAGES_BY_HEADING; say which pages it corrects")
        bad = [p for p in named if p not in pages]
        if bad:
            raise SystemExit(f"derive_corrections: {heading!r} names {bad}, which are not pages")
        slug = None   # set below, once the date's entries are counted
        flags = {}
        for p in named:
            flags[p] = {}
            if any(pg == p and heading.startswith(pre) for pre, pg in BEFORE_PUBLICATION):
                flags[p]["before_publication"] = True
        items.append({
            "id": slug, "date": date, "heading": heading,
            "label": ordinal.lstrip(", ").strip(),
            "title_html": title_html,
            "pages": named,
            "html": "".join(h for _, _, h in main),
            "flags": flags,
            "after_html": "".join(h for kind, _, h in notes if kind != "hr"),
        })
    for heading in sorted((set(PAGES_BY_HEADING) | SITE_WIDE) - used_pbh):
        raise SystemExit(f"derive_corrections: PAGES_BY_HEADING names {heading!r}, which is not a heading")
    for key in sorted(set(MENTION_EXCLUDED) - used_excl):
        raise SystemExit(f"derive_corrections: MENTION_EXCLUDED {key} matches no mention; remove it")
    for (pre, pg) in BEFORE_PUBLICATION:
        if not any(it["heading"].startswith(pre) and pg in it["pages"] for it in items):
            raise SystemExit(f"derive_corrections: BEFORE_PUBLICATION ({pre!r}, {pg!r}) matches no entry naming that page")
    # An entry's address is its date and its place among that date's entries counted from the
    # oldest, so an entry appended later never moves an earlier one's address: 2026-09-08-3.
    seen = {}
    for it in reversed(items):
        seen[it["date"]] = seen.get(it["date"], 0) + 1
        it["id"] = f"{it['date']}-{seen[it['date']]}"
    dates = [it["date"] for it in items]
    if dates != sorted(dates, reverse=True):
        raise SystemExit("derive_corrections: CORRECTIONS.md is not newest first")

    log = {
        "meta": {
            "status": "PUBLISHED",
            "as_of": dates[0],
            "source": "CORRECTIONS.md, rendered as written by _data/build/derive_corrections.py",
            "method": "Each entry in CORRECTIONS.md is rendered from its Markdown without changing a "
                      "word. The pages an entry names are read from its italics, or listed by hand "
                      "where an older entry names them in prose. Each page’s byline link counts "
                      "the entries naming it and says whether one changed the page’s headline.",
            "scope": "A log of corrections shows the errors someone found, not the ones still on "
                     "the site. A page with more entries has been checked harder, not necessarily "
                     "been wrong more often, and corrections made before a page was first "
                     "published are listed but left out of its count.",
            "n_entries": len(items),
        },
        "preamble_html": "".join(h for _, _, h in preamble),
        "entries": items,
    }
    by_page = {}
    for it in items:
        for p in it["pages"]:
            by_page.setdefault(p, []).append({"id": it["id"], "date": it["date"], **it["flags"][p]})
    summary = {
        "_about": "Generated by _data/build/derive_corrections.py from CORRECTIONS.md; never "
                  "hand-edit. Per page, the corrections log entries that name it, newest first, "
                  "and, per page, the dates its headline (H1) changed after first publication, "
                  "read from git. PV.correctionsSummary() prints the byline link from this.",
        "pages": {p: by_page[p] for p in sorted(by_page)},
        "headlines": {p: headline_dates(p) for p in pages} if history else None,
    }
    return log, summary


def dump(obj):
    return json.dumps(obj, indent=1, ensure_ascii=False) + "\n"


def main():
    log, summary = parse()
    outs = [(OUT_LOG, dump(log)), (OUT_PAGES, dump(summary))]
    if "--check" in sys.argv:
        stale = [p for p, s in outs if not os.path.exists(p) or open(p, encoding="utf-8").read() != s]
        for p in stale:
            print(f"stale: {os.path.relpath(p, WEB)}")
        return 1 if stale else 0
    for p, s in outs:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(s)
    n = sum(len(v) for v in summary["pages"].values())
    print(f"wrote {os.path.relpath(OUT_LOG, WEB)}: {len(log['entries'])} entries; "
          f"{os.path.relpath(OUT_PAGES, WEB)}: {len(summary['pages'])} pages, {n} page-entries")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
