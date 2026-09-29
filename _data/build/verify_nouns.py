"""Bind a printed figure to the noun it counts — the check verify_claims.py cannot do.

WHY THIS EXISTS
  verify_claims.py guards a claim's ASSERTION against the data that produced it, and
  METHODS-SOP §8 names the blind spot in writing: "if the sentence and the assertion say
  different things, the gate reports the assertion, and green means nothing about the
  sentence." The defect that motivated this file is exactly that shape and it shipped:
  on 2026-09-28, atlas/index.html's headline read "147 teaching records since 1991; 41
  recorded polymer awards in 2023", guarded by atlas-counts, whose own assertion is
  D['totals']['active'] == 41 — a count of INSTITUTIONS with a programme still conferring
  in 2023, not of awards. The number was right; the sentence let a reader take it as a
  count of awards. 558 claims passed, because none of them reads English —
  verify_claims.py checks a number, never the word standing next to it.

WHAT THIS CHECKS
  A claim may carry an opt-in field: `"counts": [{"figure": "41", "noun": "institution"}]`
  (`noun` may also be a list of acceptable stems, or a short phrase). `figure` is the
  string exactly as printed on the page. For every claim that carries `counts`, this reads
  the claim's own page's STATIC index.html — the source file, not dist/, because
  claim-carrying text on this site is static HTML by convention (see the comment beside
  the hero in churn/index.html: "one copy of every sentence, checked by claims.json
  against the data"). It strips tags, scripts, styles and HTML comments, decodes entities
  (&nbsp; &rsquo; &times; ...), and collapses whitespace. It then finds every occurrence of
  `figure` as a WHOLE TOKEN — a bare "41" search will not match the "41" inside "1,410" or
  "41.5" — and requires one of the declared noun stems within 8 words on either side,
  case-insensitively, matched as a prefix so "institution" matches "institutions". The
  window stops at the figure's own clause (a word ending in ; . : ? or !), so a noun in
  the sentence before cannot vouch for the figure: the atlas relapse "147 institution
  records since 1991; 41 recorded polymer awards" fails, though "institution" is four
  words back. One crossing is allowed, for a back-reference: "41 of them" reaches into
  the clause before for its noun. Only "them": "those" and "these" can open a noun
  phrase of their own, and "41 of these awards" must not borrow "institution".

  A figure that does not appear on the page at all is a FAILURE, never a silent pass:
  "cannot inspect: figure not on page". A check that stays quiet when it cannot see
  anything is worse than no check — tools/furniture.mjs makes the identical declaration,
  for the identical reason. Every run also prints its own coverage: how many claims on the
  whole site carry `counts` against how many do not, because a gate covering five of a few
  hundred claims must say so rather than look like a clean bill.

WHAT THIS CANNOT CATCH
  It does not know whether the declared noun is the RIGHT noun for the number, only that
  it sits nearby. "41 institutions closed their doors in 2023" would pass this gate exactly
  as cleanly as a true sentence, because "institution" is right there — the surrounding
  verb, tense or comparison can still mislead. A noun that also doubles as a verb or
  appears for an unrelated reason nearby satisfies the gate too: the word "record" sitting
  near "41" (as in "41 recorded...") would pass a claim whose declared noun was "record",
  whether or not that is the noun the sentence actually needs. And it only covers what a
  claim opts into — a claims.json with no `counts` field anywhere is invisible to this
  gate, which is why coverage is printed rather than assumed. An abbreviation ending in a
  full stop ("U.S.") ends a clause early; that errs toward a failure, never a pass.

USAGE
  python3 verify_nouns.py            all pages that carry claims.json
  python3 verify_nouns.py atlas      one
"""
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.abspath(os.path.join(HERE, "..", ".."))

GREEN, RED, DIM, OFF = "\033[32m", "\033[31m", "\033[2m", "\033[0m"

SCRIPT_STYLE = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.I | re.S)
COMMENT = re.compile(r"<!--.*?-->", re.S)
TAG = re.compile(r"<[^>]+>")
WS = re.compile(r"[\s\xa0]+")
# A token ends after clause punctuation even when no space follows it, so "1991;41" is two
# tokens and the ";" still closes the clause. A full stop does the same when any letter or
# digit follows it, past any closing or opening quote or bracket: "records.41",
# "1991.Only", "1991.only", "U.S.Only" and "records.“41" all split. Two shapes stay whole:
# a decimal ("41.5", ".5") and the inner stops of a single-letter abbreviation ("U.S.",
# "e.g."). A domain ("us.edu"), a URL's "https:" or "?id=", or an abbreviation like
# "No.41" closing a clause early can only make a binding fail, never pass one.
# A dash between the stop and what follows does not hide the boundary: "1991.—Only",
# "1991.–Only", "1991.—“Only" and a trailing "1991.—", "1991.—“" or "1991.“" all split
# after the stop, so the token still ends in it. The trailing shapes are what markup leaves
# behind: "1991.—“<em>Only</em>" strips to "1991.—“ Only". A trailing straight quote is
# left alone, since "records."" already ends in a closing quote. A dash with no stop before it ("41—the most—") stays whole.
OPEN, CLOSE = "\"'\u2018\u201c(\\[", "\"'\u2019\u201d)\\]"
DASH = "\u2013\u2014\u2015"
CURLY_OPEN = "\u2018\u201c(\\["
CLAUSE_CUT = re.compile(rf"[;:?!]+[{CLOSE}]*(?=\S)")
STOP_CUT = re.compile(rf"\.+[{CLOSE}]*(?=[{DASH}]*[{OPEN}]*[^\W_]|(?:[{DASH}]+[{OPEN}]*|[{CURLY_OPEN}]+)$)")
STRIP_EDGES = re.compile(r"^\W+|\W+$", re.UNICODE)
NUMERIC_FIGURE = re.compile(r"^[\d,.]+$")
NUMCHARS = set("0123456789,.")
CLAUSE_END = re.compile(r"[;.:?!][\"'\u2019\u201d)\]]*$")
BACK_REFERENCE = {"them"}


def all_pages():
    """Every artifact folder carrying a claims.json, same discovery verify_claims.py uses."""
    return sorted(d for d in os.listdir(WEB) if os.path.exists(os.path.join(WEB, d, "claims.json")))


def page_text(page):
    """The page's rendered prose, as a reader would meet it: no tags, no script or style
    bodies, no HTML comments, entities decoded, whitespace collapsed to single spaces.
    Read from the page's own SOURCE index.html, never dist/ — see the module docstring."""
    path = os.path.join(WEB, page, "index.html")
    raw = open(path, encoding="utf-8").read()
    raw = SCRIPT_STYLE.sub(" ", raw)
    raw = COMMENT.sub(" ", raw)
    raw = TAG.sub(" ", raw)
    # Entities are decoded AFTER tags are stripped, so a numeric entity for '<' or '>' in
    # running prose can never be mistaken for a real tag by the regex above.
    raw = html.unescape(raw)
    return WS.sub(" ", raw).strip()


def _cuts(chunk):
    """Offsets inside one run of non-space characters where a clause ends unspaced."""
    cuts = {m.end() for m in CLAUSE_CUT.finditer(chunk)}
    for m in STOP_CUT.finditer(chunk):
        s = m.start()
        if s == 0:
            continue                                  # ".5"
        if chunk[s - 1].isdigit() and chunk[s + 1].isdigit():
            continue                                  # "41.5"
        e = m.end()
        if (chunk[s - 1].isalpha() and (s == 1 or not chunk[s - 2].isalpha())
                and chunk[e:e + 1].isalpha() and chunk[e + 1:e + 2] == "."):
            continue                                  # "U.S.", but not "U.S.Only"
        cuts.add(m.end())
    return sorted(cuts)


def tokenize(text):
    tokens = []
    for m in re.finditer(r"\S+", text):
        chunk, edges = m.group(), [0, *_cuts(m.group()), len(m.group())]
        tokens += [(m.start() + a, m.start() + b, chunk[a:b]) for a, b in zip(edges, edges[1:])]
    return tokens


def _numeric_span_ok(text, start, end, figure):
    """True if a purely-numeric `figure` (e.g. "41", "54,846") sits at this span as the
    WHOLE number, not embedded in a longer one.

    A single boundary character is not enough to decide this: "54,846, then Texas" ends
    the real number in a comma that is sentence punctuation, not a thousands separator,
    and "17,725." ends it in a full stop — both must still match. So instead of looking at
    one character, this expands to the MAXIMAL run of digit/comma/period characters
    touching the match, trims any leading or trailing comma/period that isn't itself
    wedged between digits (that is punctuation, not part of the number), and requires what
    is left to equal `figure` exactly. That correctly rejects "41" inside "1,410" (the
    maximal run is "1,410") and inside "41.5" (the maximal run is "41.5"), while still
    accepting "54,846" immediately followed by a list comma or "17,725" immediately
    followed by a full stop.
    """
    lo, hi = start, end
    while lo > 0 and text[lo - 1] in NUMCHARS:
        lo -= 1
    while hi < len(text) and text[hi] in NUMCHARS:
        hi += 1
    while hi > lo and text[hi - 1] in ",.":
        hi -= 1
    while lo < hi and text[lo] in ",.":
        lo += 1
    return text[lo:hi] == figure


def _boundary_ok(text, start, end, figure):
    """True if a non-numeric `figure` sits at this span as a WHOLE token (letters only
    at whichever edge isn't a digit), not embedded in a longer word.
    """
    # "".isalpha() is False, so an edge at the start or end of the text needs no guard.
    before = text[start - 1] if start > 0 else ""
    after = text[end] if end < len(text) else ""
    if figure[-1].isalpha() and after.isalpha():
        return False
    if figure[0].isalpha() and before.isalpha():
        return False
    # A digit edge is part of a longer number when a digit touches it, directly or across
    # one separator: "41%" must not match inside "141%" or "1,41%", nor "$41" inside
    # "$41.5" or "$410". A separator followed by a non-digit is punctuation, as above.
    if figure[0].isdigit() and (before.isdigit() or
                                (before in ",." and start > 1 and text[start - 2].isdigit())):
        return False
    if figure[-1].isdigit() and (after.isdigit() or
                                 (after in ",." and end + 1 < len(text) and text[end + 1].isdigit())):
        return False
    return True


def find_figure(text, figure):
    """Every whole-token occurrence of `figure` in `text`, as (start, end) spans."""
    check = _numeric_span_ok if NUMERIC_FIGURE.match(figure) else _boundary_ok
    return [(m.start(), m.end()) for m in re.finditer(re.escape(figure), text)
            if check(text, m.start(), m.end(), figure)]


def noun_nearby(tokens, start, end, stems, window=8):
    """Is one of `stems` within `window` words of the token(s) spanning [start, end)?

    Returns (found, context) where context is ~12 words centred on the occurrence, for
    reporting a failure in place. The figure's own token(s) are excluded from the window.
    A stem is matched word by word, never as a raw substring, so "art job" cannot match
    inside "counterpart jobs". Every word of a stem must equal a window word except the
    last, which is a case-insensitive PREFIX, so "institution" matches "institutions" and
    "institution's" alike. A phrase must sit wholly on one side of the figure. The window
    is also cut at the figure's own clause; "41 of them" may reach one clause back.
    """
    hits = [i for i, (ts, te, _) in enumerate(tokens) if te > start and ts < end]
    if not hits:
        return False, "<figure matched no token — should not happen>"
    first_idx, last_idx = hits[0], hits[-1]

    def ends_clause(i):
        return bool(CLAUSE_END.search(tokens[i][2]))

    after = [STRIP_EDGES.sub("", w).lower() for _, _, w in tokens[last_idx + 1:last_idx + 3]]
    crossings = 1 if len(after) == 2 and after[0] == "of" and after[1] in BACK_REFERENCE else 0
    lo = max(0, first_idx - window)
    for i in range(first_idx - 1, lo - 1, -1):
        if ends_clause(i):
            if not crossings:
                lo = i + 1
                break
            crossings -= 1
    hi = min(len(tokens), last_idx + 1 + window)
    for i in range(last_idx, hi):
        if ends_clause(i):
            hi = i + 1
            break
    sides = [[STRIP_EDGES.sub("", w).lower() for _, _, w in part]
             for part in (tokens[lo:first_idx], tokens[last_idx + 1:hi])]

    def phrase_in(words, parts):
        n = len(parts)
        return any(words[i:i + n - 1] == parts[:-1] and words[i + n - 1].startswith(parts[-1])
                   for i in range(len(words) - n + 1))

    found = any(phrase_in(words, stem.lower().split()) for stem in stems for words in sides)

    ctx_lo = max(0, first_idx - 6)
    ctx_hi = min(len(tokens), last_idx + 1 + 6)
    context = " ".join(w for _, _, w in tokens[ctx_lo:ctx_hi])
    return found, context


def stems_of(noun):
    return [noun] if isinstance(noun, str) else list(noun)


def entry_problem(entry):
    """Why a `counts` entry cannot be checked, or None. An empty figure matches everywhere
    and an empty stem prefixes every word, so either would pass silently; both FAIL."""
    figure, noun = entry.get("figure"), entry.get("noun")
    if not isinstance(figure, str) or not figure.strip():
        return "invalid entry: figure must be a non-empty string"
    if not isinstance(noun, (str, list)) or not stems_of(noun):
        return "invalid entry: noun must be a stem or a non-empty list of stems"
    if not all(isinstance(n, str) and n.strip() for n in stems_of(noun)):
        return "invalid entry: every noun stem must be a non-empty string"
    return None


def check_page(page):
    """Every (claim, count-entry, occurrence) result for one page. [] if nothing to check."""
    cp = os.path.join(WEB, page, "claims.json")
    spec = json.load(open(cp, encoding="utf-8"))
    claims_with_counts = [c for c in spec.get("claims", []) if c.get("counts")]
    if not claims_with_counts:
        return []
    text = page_text(page)
    tokens = tokenize(text)
    out = []
    for c in claims_with_counts:
        for entry in c["counts"]:
            problem = entry_problem(entry)
            if problem:
                out.append({"claim": c["id"], "figure": str(entry.get("figure")),
                            "stems": [str(entry.get("noun"))], "ok": False,
                            "occurrences": [], "note": problem})
                continue
            figure = entry["figure"]
            stems = stems_of(entry["noun"])
            spans = find_figure(text, figure)
            occurrences = []
            for s, e in spans:
                found, context = noun_nearby(tokens, s, e, stems)
                occurrences.append({"ok": found, "context": context})
            out.append({
                "claim": c["id"], "figure": figure, "stems": stems,
                # A figure absent from the page FAILS: never let all([]) pass it vacuously.
                "ok": bool(spans) and all(o["ok"] for o in occurrences),
                "occurrences": occurrences,
                "note": None if spans else "cannot inspect: figure not on page",
            })
    return out


def coverage():
    """Site-wide count of claims that opt into `counts`, independent of what this run
    was actually asked to check — so a single-page run still reports the true site
    denominator rather than a locally flattering one."""
    per_page, total, with_counts = {}, 0, 0
    for p in all_pages():
        spec = json.load(open(os.path.join(WEB, p, "claims.json"), encoding="utf-8"))
        claims = spec.get("claims", [])
        n = len(claims)
        w = sum(1 for c in claims if c.get("counts"))
        per_page[p] = (w, n)
        total += n
        with_counts += w
    return with_counts, total, per_page


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    pages = args or all_pages()

    with_counts, total, per_page = coverage()
    print(f"{with_counts} claims carry counts; {total - with_counts} of {total} claims "
          f"on this site do not\n")
    for p, (w, n) in per_page.items():
        if w:
            print(f"  {GREEN}{p:<16}{OFF} {w} of {n} claims carry counts")
    print()

    entries = failed_entries = occ_total = occ_failed = not_found = 0
    for p in pages:
        cp = os.path.join(WEB, p, "claims.json")
        if not os.path.exists(cp):
            print(f"{p}: no claims.json")
            continue
        results = check_page(p)
        if not results:
            continue
        print(f"{p}  {DIM}({len(results)} figure/noun binding(s)){OFF}")
        for r in results:
            entries += 1
            if r["note"]:
                failed_entries += 1
                not_found += 1
                print(f"  {RED}FAIL{OFF} {r['claim']}  figure {r['figure']!r}")
                print(f"       {RED}{r['note']}{OFF} — declared noun(s): "
                      f"{', '.join(r['stems'])}")
                continue
            occ_total += len(r["occurrences"])
            bad = [o for o in r["occurrences"] if not o["ok"]]
            occ_failed += len(bad)
            if bad:
                failed_entries += 1
                print(f"  {RED}FAIL{OFF} {r['claim']}  figure {r['figure']!r}  "
                      f"({len(bad)} of {len(r['occurrences'])} occurrence(s) missing "
                      f"{'/'.join(r['stems'])})")
                for o in bad:
                    print(f"       {RED}context{OFF} …{o['context']}…")
            else:
                print(f"  {GREEN}PASS{OFF} {r['claim']}  figure {r['figure']!r}  "
                      f"({len(r['occurrences'])} occurrence(s), {'/'.join(r['stems'])} "
                      f"nearby every time)")
        print()

    print("-" * 60)
    print(f"{entries} figure/noun binding(s) checked over {len(pages)} page(s) · "
          f"{GREEN}{entries - failed_entries} pass{OFF} · "
          f"{RED if failed_entries else DIM}{failed_entries} fail{OFF} "
          f"{DIM}({not_found} could not be inspected, {occ_failed} of {occ_total} "
          f"occurrence(s) missing their noun){OFF}")
    if failed_entries:
        print(f"\n{RED}A failing binding means the page prints the right number next to "
              f"the wrong word.{OFF}")
        print("Fix the sentence, or the declared noun — never widen the window to make it pass.")
    sys.exit(1 if failed_entries else 0)


if __name__ == "__main__":
    main()
