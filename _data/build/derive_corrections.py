"""Build the rendered corrections log from CORRECTIONS.md, and each page's correction summary.

WHY IT EXISTS. CORRECTIONS.md is the site's append-only record of what it got wrong, and every
"corrections log" link pointed at the raw Markdown on GitHub: a reader left the site to read
it, could not filter it to the page they came from, and no page said at the top whether it
had ever been corrected (DECISIONS.md, 2026-10-04, D3). This reads the file and writes:

  corrections/data/corrections.json   every entry, rendered to HTML, newest first, with the
                                      pages it names; read by the corrections/ page.
  _data/corrections_by_page.json      per page, the entries that name it, each with a `kind`
                                      (wording or figure) and `headline_changed`; read by
                                      PV.correctionsSummary() on every page.

ENTRIES ARE NEVER ALTERED. The Markdown is rendered as written: no character of an entry is
changed, reordered or dropped. A heading is split into its date and its title for display,
and a relative link is pointed at the file on GitHub, because the page is not at the
repository root. verify_consistency.py re-runs parse() and fails if either output differs
from what this would write now, so a stale or hand-edited output cannot ship.

WHICH PAGES AN ENTRY NAMES. Most entries name their pages in italics (*wages*, *index, chain*),
in the heading or on a sub-heading, and those are read from the text. Older entries name
pages in prose ("the hub", "the price page"), so PAGES_BY_HEADING lists them by hand; an
entry that ends up naming no page FAILS the build rather than vanishing from every filter.

KIND. Per page, read from the entry's Was and Is (the sub-entry naming that page if there is
one, else the whole entry): `figure` if a number the page printed changed, else `wording`.
classify() decides from the text; KIND_OVERRIDE records, with a reason, each pair it gets
wrong. HEADLINE lists the pairs where the correction changed the page's headline (its H1),
read by hand from the entries; it is short on purpose.

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

# Entries that also correct the front page in prose, without italics. (heading prefix) -> pages.
PAGES_ADDED = {
    "2026-09-30 — More sentences that said more": ["index"],   # "revisions and the front page"
    "2026-09-28 — Ten sentences read firmer": ["index"],       # the front page's reach and collaboration cards
    "2026-09-01, tenth entry": ["index"],                      # "the hub's chain card said 785"
    "2026-09-01, second entry": ["index"],                     # "The hub inventory re-summed"
}
HUB_PROSE = re.compile(r"\bfront[- ]page\b|\bthe hub\b|\bhub(?:'s|’s)? ")
# Entries that mention the front page or the hub without changing its text, and why.
HUB_MENTION_ONLY = {
    "2026-10-04 — The corrections log is a page": "its correction-log link changed address; the words did not",
    "2026-09-29 — The scorecard and the accountability page": "\"the hub\" is the Ohio Innovation Hub",
    "2026-08-29 — a hierarchy ranked and a total flattened": "says the hub still carries $106.3M; unchanged",
}

# Corrections that changed a page's headline, its H1 (the hero claim's statement), read
# from the entries. (heading prefix, page). Everything else leaves the headline unchanged.
HEADLINE = [
    ("2026-10-04 — Evidence states, bases and labels", "federal-money"),   # "polymer" scope in the headline
    ("2026-09-28 — Ten sentences read firmer", "reach"),                   # "four of its papers in five"
    ("2026-09-28 — Ten sentences read firmer", "collaboration"),           # "have written 208 papers together"
    ("2026-09-28 — Wages said pay was level", "wages"),                    # "Against manufacturing, pay is level"
    ("2026-09-11 — Institution records are not distinct schools", "atlas"),  # 147 "places"
    ("2026-09-01 — nine corrections from the full-site first-read pass", "federal-money"),  # $35M to $37M
    ("2026-08-30 — four corrections", "revisions"),                        # "Every month moved"
    ("2026-08-29 — a hierarchy ranked and a total flattened", "funding-map"),  # $106 million to $85.3 million
    ("2026-08-29 — two right numbers and no way to tell them apart", "churn"),  # "168 more job starts"
    ("2026-08-29 — a hierarchy published as a flat list", "wages"),        # "The typical polymer job"
]

# Pairs classify() reads wrongly, each with the reason, checked by reading the entry on
# 2026-10-05. (heading prefix, page) -> kind.
KIND_OVERRIDE = {
    # Dates: a page that printed no data date gained one (wording); one that printed the
    # wrong date, or the sources page's wrong counts, printed a number that changed (figure).
    ("2026-09-30 — Mastheads", "churn"): "wording",
    ("2026-09-30 — Mastheads", "laborshed"): "wording",
    ("2026-09-30 — Mastheads", "realwage"): "wording",
    ("2026-09-30 — Mastheads", "revisions"): "wording",
    ("2026-09-30 — Mastheads", "wages"): "wording",
    ("2026-09-30 — Mastheads", "index"): "wording",
    ("2026-09-30 — Mastheads", "chain"): "wording",
    ("2026-09-29 — Labels and cards", "revisions"): "wording",       # "an input it is not": words only
    ("2026-09-28 — Seven more statements", "churn"): "wording",     # "every quarter" to "averaged over a year"
    ("2026-09-28 — Ten sentences", "realwage"): "wording",          # same rank, margin added
    ("2026-09-28 — Ten sentences", "programs"): "wording",
    ("2026-09-28 — Ten sentences", "occupations"): "wording",       # "nominal" added; 0.99 is a what-if          # "strong" dropped; $87k-$101k unrounded
    ("2026-09-28 — The funding map credited", "funding-map"): "wording",  # who promised the $21.0 million
    ("2026-09-28 — Churn said most hires", "churn"): "wording",     # where hires came from
    ("2026-09-28 — Churn said most hires", "index"): "wording",
    ("2026-09-11 — Narrative claims", "scorecard"): "wording",      # only the hub's 721 and revisions' 1.41 moved
    ("2026-09-11 — Narrative claims", "accountability"): "wording",
    ("2026-09-11 — Narrative claims", "churn"): "wording",
    ("2026-09-11 — Narrative claims", "programs"): "wording",
    ("2026-09-11 — Narrative claims", "reach"): "wording",
    ("2026-09-11 — Narrative claims", "location-quotient"): "wording",
    ("2026-09-11 — Institution records", "atlas"): "wording",       # "No rows, completion counts ... changed"
    ("2026-09-08 — Wage geography", "peers"): "wording",            # 51 rows described, Ohio still first
    ("2026-09-08 — Wage geography", "wages"): "wording",            # 1.26 described, not changed
    ("2026-09-01, twelfth entry", "accountability"): "figure",      # how many commitment dates had passed
    ("2026-09-01, ninth entry", "timeline"): "wording",             # a named row anonymised (the count is the eleventh entry)
    ("2026-09-01, ninth entry", "chain"): "wording",                # an unrendered field removed
    ("2026-09-01, ninth entry", "cluster-health"): "wording",       # named only in passing
    ("2026-09-01, seventh entry", "chain"): "figure",               # 785 companies to 721
    ("2026-09-01, sixth entry", "atlas"): "wording",                # "The encoding is unchanged"
    ("2026-09-01, fifth entry", "accountability"): "figure",        # "no public record" to $11,642,402 paid
    ("2026-09-01 — nine corrections", "scorecard"): "figure",       # "near 120 a year" to 118 to 179
    ("2026-08-31 — three corrections", "cluster-health"): "figure",  # "four of five" to all five
    ("2026-08-30 — four corrections", "federal-money"): "figure",   # "Two of the eight years" to one
    ("2026-08-29 — a hierarchy ranked", "funding-map"): "figure",   # the H1's $106 million to $85.3 million
    ("2026-08-17 — the pre-publication review", "index"): "figure",
    ("2026-09-30 — More sentences that said more", "index"): "wording",  # the card's words only
    ("2026-09-28 — Ten sentences read firmer", "index"): "wording",      # the cards' words only
    ("2026-09-01, tenth entry", "index"): "figure",                      # chain card 785 to 721
    ("2026-09-01, second entry", "index"): "figure",                     # inventory re-summed: 451 claims
    # "One count changed (timeline)": that count is also printed on the hub's timeline card,
    # 67 to 66 (index/index.html, commit baf0d41), so it is a figure there too.
    ("2026-10-04 — Evidence states, bases and labels", "index"): "figure",
    # Contested pairs (classify): the entry says no figure changed, the page's own Was/Is
    # swaps a number. Read 2026-10-05.
    ("2026-10-04 — The corrections log is a page", "sources"): "figure",   # 23 site pages to 24
    ("2026-10-04 — Evidence states, bases and labels", "federal-money"): "figure",  # dashed line $39.2M to $41.4M
    ("2026-10-04 — Evidence states, bases and labels", "funding-map"): "wording",  # the 27-to-31 is the sources page's
    ("2026-10-04 — Evidence states, bases and labels", "churn"): "wording",   # bases stated, numbers kept
    ("2026-10-04 — Evidence states, bases and labels", "chain"): "wording",
    ("2026-10-04 — Evidence states, bases and labels", "reach"): "wording",
    ("2026-10-04 — Footprint, concentration", "federal-money"): "wording",    # tense, dates only
    ("2026-10-04 — Footprint, concentration", "timeline"): "wording",
    ("2026-09-30 — A seat called the winner", "scorecard"): "wording",       # grantee named
    ("2026-09-30 — A seat called the winner", "timeline"): "wording",
    ("2026-08-29 — two right numbers", "churn"): "wording",                  # "no number moved"
    ("2026-09-08 — Jobs, workplaces", "cluster-health"): "wording",          # 361 to 364 describes data
    ("2026-09-01, twelfth entry", "index"): "wording",                       # award and designation told apart
    ("2026-09-01, seventh entry", "index"): "wording",                       # "Every sentence ... tied" withdrawn  # $34.9 million to $36.6 million a year
}

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


NUM = re.compile(r"(?<![\w.])\$?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?")


def numbers(text):
    """Numbers printed in a passage, years and list ordinals aside, normalised."""
    got = set()
    for m in NUM.finditer(re.sub(r"\d{4}-\d\d-\d\d|<[^>]+>", " ", text)):
        whole = m.group(1).replace(",", "")
        v = whole + ("." + m.group(2) if m.group(2) else "")
        if not m.group(2) and len(whole) == 4 and 1890 <= int(whole) <= 2099:
            continue
        got.add(v.rstrip("0").rstrip(".") if "." in v else v)
    return got


def was_is(raw):
    """The Was and Is passages of one stretch of an entry, each joined."""
    was, is_ = [], []
    for m in re.finditer(r"\*\*Was:\*\*(.*?)(?=\*\*Is:\*\*|$)", raw, re.S):
        was.append(m.group(1))
    for m in re.finditer(r"\*\*Is:\*\*(.*?)(?=\*\*Cause:\*\*|\*\*Was:\*\*|\*\*[A-Z][^*]{2,}\*\*|$)", raw, re.S):
        is_.append(m.group(1))
    return " ".join(was), " ".join(is_)


NONE_MOVED = re.compile(
    r"\b[Nn]o (?:published |printed |other )?(?:number|figure|count|rank|wage rank)s?(?:,? (?:program count|or ratio|chart))*"
    r"(?: or \w+)? (?:changed|changes|moved)"
    r"|\b(?:[Nn]umbers?|[Ff]igures?|[Cc]ounts?|[Vv]alues?|observations|[Rr]ows?)(?: and \w+)?"
    r" (?:is|are|were|was|remain|stay)(?:s)? (?:all )?unchanged"
    r"|every (?:figure|number)(?: on the page)? (?:is|was) unchanged"
    r"|changes the note, not")


CHANGED = re.compile(r"\b(?:rise|rises|rose|grow|grows|grew|move|moves|moved|change|changes|changed|"
                     r"go|goes|went|fall|falls|fell)\s+from\s+\$?\d[\d,.]*[^.;]{0,40}?\bto\s+\$?\d|"
                     r"(?<![\w-])\d[\d,.]*\*{0,2} to \*{0,2}\$?\d[\d,.]*(?: [a-z]+)?\*\*|, not \$?\d|"
                     r"\bpreviously \$?\d|\bchanges? from \$?\d[\d,.]* to \$?\d|\bbecomes? \$?\d")


def classify(raw, none_said=False):
    """(kind, contested). `figure` if a number the page printed changed, else `wording`.

    Signals, strongest first: a stated change ("rises from 532 to 534", "20,859 to 20,052",
    ", not 104") is a figure; a stated "No figure changed" in the page's own text, or in the
    entry's shared text (none_said), is wording; otherwise a number in Was that is not in Is
    is a figure. CONTESTED: the entry's shared text says no figure changed while this page's
    own Was and Is swap one number for another. The text cannot settle that, so the build
    fails until KIND_OVERRIDE records a reading (the sources page count, 23 to 24, was read
    as wording this way on 2026-10-05)."""
    was, is_ = was_is(raw)
    if CHANGED.search(raw):
        return "figure", False
    if NONE_MOVED.search(raw):
        return "wording", False
    swapped = bool(numbers(was) - numbers(is_)) and bool(numbers(is_) - numbers(was))
    if none_said:
        return "wording", swapped
    if not is_:
        return "wording", False
    return ("figure" if numbers(was) - numbers(is_) else "wording"), False


def stretches(body_blocks, pages):
    """Split an entry into the stretches that name pages. A stretch opens at a ### head, or
    at a paragraph whose bold lead names pages in italics, and runs to the next opening.
    Returns ({page: raw text of its stretches}, raw text of the whole entry, raw text that
    belongs to no sub-entry)."""
    per, cur, loose = {}, None, []
    for kind, raw, h in body_blocks:
        if kind in ("h", "p"):
            lead = re.match(r"\*\*(.+?)\*\*(?=\s|$)", raw) if kind == "p" else None
            if kind == "h" or (lead and lead.group(1) not in ("Was:", "Is:", "Cause:")):
                # a new sub-entry: it names its pages, or it names none and belongs to no page
                cur = named_pages(inline(raw if kind == "h" else lead.group(1)), pages) or None
        if cur:
            for p in cur:
                per[p] = per.get(p, "") + "\n\n" + raw
        else:
            loose.append(raw)
    return per, "\n\n".join(raw for _, raw, _ in body_blocks), "\n\n".join(loose)


def parse(text=None):
    text = text if text is not None else open(SRC, encoding="utf-8").read()
    pages = page_slugs()
    head, *chunks = re.split(r"(?m)^## ", text)
    if not head.startswith("# Corrections"):
        raise SystemExit("derive_corrections: CORRECTIONS.md does not open with '# Corrections'")
    preamble = blocks(head.split("\n", 1)[1])
    items, used_pbh, used_head = [], set(), set()
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
        for pre, extra in PAGES_ADDED.items():
            if heading.startswith(pre):
                named = named + [x for x in extra if x not in named]
                used_pbh.add(pre)
        # Every italic name in the heading, a ### head or a sub-entry's bold lead is a page.
        leads = [title_html] + [h for kind, raw, h in main if kind == "h"] + \
                [inline(lm.group(1)) for kind, raw, _ in main if kind == "p"
                 for lm in [re.match(r"\*\*(.+?)\*\*(?=\s|$)", raw)] if lm]
        lost = [n for h in leads for n in unresolved_names(h, pages)]
        if lost:
            raise SystemExit(f"derive_corrections: {heading!r} names {lost} in italics, which resolve to "
                             "no page; add an alias (ALIASES) or say why it is not one (NOT_PAGES_NAMED)")
        # Prose that says the front page changed must name the index page.
        text = re.sub(r"<[^>]+>", "", "".join(h for _, _, h in main))
        if HUB_PROSE.search(text) and "index" not in named and \
                not any(heading.startswith(pre) for pre in HUB_MENTION_ONLY):
            raise SystemExit(f"derive_corrections: {heading!r} mentions the front page or the hub "
                             f"({HUB_PROSE.search(text).group(0)!r}) and does not name index; add it "
                             "(PAGES_ADDED) or say why the hub's text did not change (HUB_MENTION_ONLY)")
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
        per, whole, loose = stretches(main, pages)
        none_said = bool(NONE_MOVED.search(loose))
        kinds = {}
        for p in named:
            # its own sub-entry; else the paragraphs naming it; else the whole entry
            own = per.get(p) or "\n\n".join(raw for _, raw, h in main if p in named_pages(h, pages))
            kind, contested = classify(own or whole, none_said)
            forced = [k for (pre, pg), k in KIND_OVERRIDE.items() if pg == p and heading.startswith(pre)]
            if forced:
                kind = forced[0]
            elif contested:
                raise SystemExit(f"derive_corrections: {heading[:70]!r} on {p}: the entry says no figure "
                                 "changed, and this page's own Was and Is swap a number. Read the entry "
                                 "and record the kind in KIND_OVERRIDE.")
            hl = any(pg == p and heading.startswith(pre) for pre, pg in HEADLINE)
            used_head.update((pre, pg) for pre, pg in HEADLINE if pg == p and heading.startswith(pre))
            kinds[p] = {"kind": kind, "headline_changed": hl}
            if any(pg == p and heading.startswith(pre) for pre, pg in BEFORE_PUBLICATION):
                kinds[p]["before_publication"] = True
        items.append({
            "id": slug, "date": date, "heading": heading,
            "label": ordinal.lstrip(", ").strip(),
            "title_html": title_html,
            "pages": named,
            "html": "".join(h for _, _, h in main),
            "kinds": kinds,
            "after_html": "".join(h for kind, _, h in notes if kind != "hr"),
        })
    for heading in sorted((set(PAGES_BY_HEADING) | SITE_WIDE | set(PAGES_ADDED)) - used_pbh):
        raise SystemExit(f"derive_corrections: PAGES_BY_HEADING names {heading!r}, which is not a heading")
    for pre, pg in HEADLINE:
        if (pre, pg) not in used_head:
            raise SystemExit(f"derive_corrections: HEADLINE pair ({pre!r}, {pg!r}) matches no entry naming that page")
    for (pre, pg) in list(KIND_OVERRIDE) + BEFORE_PUBLICATION:
        if not any(it["heading"].startswith(pre) and pg in it["pages"] for it in items):
            raise SystemExit(f"derive_corrections: KIND_OVERRIDE ({pre!r}, {pg!r}) matches no entry naming that page")
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
                      "where an older entry names them in prose. Each page’s summary line counts "
                      "the entries naming it and calls one a change to figures when a number the "
                      "page printed changed, and a change to wording otherwise.",
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
            by_page.setdefault(p, []).append({"id": it["id"], "date": it["date"], **it["kinds"][p]})
    summary = {
        "_about": "Generated by _data/build/derive_corrections.py from CORRECTIONS.md; never "
                  "hand-edit. Per page, the corrections log entries that name it, newest first, "
                  "each with its kind (wording or figure) and whether it changed the headline. "
                  "PV.correctionsSummary() prints the line at the top of each page from this.",
        "pages": {p: by_page[p] for p in sorted(by_page)},
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
