"""Regressions for verify_nouns.py — the gate that binds a printed figure to its noun.

Each test is written against a way the gate could go quietly wrong and still look green:
  - a figure with its noun genuinely nearby must PASS (or the gate would cry wolf on
    every correct sentence on the site);
  - a figure whose only nearby noun is the WRONG one must FAIL (this is the atlas shape:
    a true number sitting in a false sentence — 2026-09-28);
  - a figure that never appears on the page at all must FAIL, not pass silently, because
    a check that stays quiet when it cannot see anything is worse than no check;
  - "41" must never match inside "1,410" or "41.5", nor "41%" inside "141%" — a naive
    substring search would count a bystander digit run as the figure itself;
  - an empty figure or noun, and a phrase found only inside a longer word, must FAIL,
    because each would otherwise match almost anything;
  - markup is read as Chromium reads it (tools/pagetext.mjs, scripting off), and a page
    whose rendered text is missing or stale against its bundle must FAIL, never fall back.

Page tests render their fixtures with node and Playwright's Chromium, as the gate does.

Run: python3 -m unittest discover -s _data/build -p 'test_*.py'   (auto-discovered)
     python3 _data/build/test_verify_nouns.py
"""
import json
import subprocess
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

import verify_nouns as vn

PAGETEXT = Path(__file__).resolve().parents[2] / "tools" / "pagetext.mjs"


def write_page(web, page, body):
    """The page's source and its bundle, both holding `body`: the gate reads the bundle's
    rendered text, and an older reader of the source can be run against the same fixture."""
    html = f"<html><body>{body}</body></html>"
    (Path(web) / page).mkdir(parents=True, exist_ok=True)
    (Path(web) / page / "index.html").write_text(html, encoding="utf-8")
    (Path(web) / "dist").mkdir(exist_ok=True)
    (Path(web) / "dist" / f"{page}.html").write_text(html, encoding="utf-8")


def render(web):
    """Dump the rendered text of every bundle under `web`/dist, one Chromium launch."""
    subprocess.run(["node", str(PAGETEXT), f"--dist={Path(web) / 'dist'}"],
                   check=True, capture_output=True, text=True)


class FindFigureBoundaryTest(unittest.TestCase):
    """The whole-token match itself, independent of any page or claim."""

    def test_matches_a_bare_figure(self):
        self.assertEqual(vn.find_figure("41 institutions closed", "41"), [(0, 2)])

    def test_does_not_match_41_inside_1410(self):
        self.assertEqual(vn.find_figure("a stock of 1,410 units", "41"), [])

    def test_does_not_match_41_inside_41_point_5(self):
        self.assertEqual(vn.find_figure("up 41.5 percent this year", "41"), [])

    def test_matches_despite_a_following_list_comma(self):
        # "54,846, then Texas" — the comma right after the number is sentence
        # punctuation, not a thousands separator, and must not swallow the match.
        text = "Ohio leads on 54,846, then Texas on 44,598."
        self.assertEqual(len(vn.find_figure(text, "54,846")), 1)

    def test_matches_despite_a_following_full_stop(self):
        text = "the headcount fell by 719, to 17,725."
        self.assertEqual(len(vn.find_figure(text, "17,725")), 1)

    def test_does_not_match_a_longer_number_sharing_a_prefix(self):
        self.assertEqual(vn.find_figure("a total of 417 units", "41"), [])

    def test_does_not_match_41_percent_inside_141_percent(self):
        # A figure carrying a unit takes the non-numeric path; its digit edge must still
        # refuse a longer number, or "41%" passes on a page that only prints "141%".
        self.assertEqual(vn.find_figure("up 141% since 2015", "41%"), [])
        self.assertEqual(vn.find_figure("up 1,41% since 2015", "41%"), [])

    def test_does_not_match_dollar_41_inside_a_longer_amount(self):
        self.assertEqual(vn.find_figure("paid $41.5 million", "$41"), [])
        self.assertEqual(vn.find_figure("paid $410 million", "$41"), [])

    def test_matches_a_unit_figure_before_punctuation(self):
        self.assertEqual(len(vn.find_figure("up 41%, then down", "41%")), 1)
        self.assertEqual(len(vn.find_figure("it cost $41. Then", "$41")), 1)


class NounNearbyTest(unittest.TestCase):
    """The 8-word window, independent of any page or claim."""

    def test_finds_a_stem_immediately_after(self):
        tokens = vn.tokenize("There were 41 institutions still teaching it")
        found, _ = vn.noun_nearby(tokens, 11, 13, ["institution"])
        self.assertTrue(found)

    def test_stem_matches_as_a_prefix_of_a_plural(self):
        tokens = vn.tokenize("41 institutions remain")
        found, _ = vn.noun_nearby(tokens, 0, 2, ["institution"])
        self.assertTrue(found, "'institution' should prefix-match 'institutions'")

    def test_wrong_noun_nearby_does_not_satisfy_a_different_stem(self):
        tokens = vn.tokenize("41 recorded polymer awards in 2023")
        found, _ = vn.noun_nearby(tokens, 0, 2, ["institution"])
        self.assertFalse(found)

    def test_phrase_does_not_match_inside_a_longer_word(self):
        # "art job" as a raw substring sits inside "counterpart jobs"; it must not count.
        tokens = vn.tokenize("41 counterpart jobs elsewhere")
        found, _ = vn.noun_nearby(tokens, 0, 2, ["art job"])
        self.assertFalse(found)

    def test_phrase_matches_whole_words_with_a_plural_last_word(self):
        tokens = vn.tokenize("41 private plastics jobs remain")
        found, _ = vn.noun_nearby(tokens, 0, 2, ["plastics job"])
        self.assertTrue(found)

    def test_outside_the_window_does_not_count(self):
        words = ["41"] + ["filler"] * 8 + ["institutions"]
        tokens = vn.tokenize(" ".join(words))
        found, _ = vn.noun_nearby(tokens, 0, 2, ["institution"], window=8)
        self.assertFalse(found, "a stem 9 words away is outside an 8-word window")

    def test_noun_in_the_previous_clause_does_not_count(self):
        # The atlas relapse: "institution" is four words back, but in another clause.
        text = "147 institution records since 1991; 41 recorded polymer awards in 2023."
        tokens = vn.tokenize(text)
        s = text.index("41 ")
        found, _ = vn.noun_nearby(tokens, s, s + 2, ["institution"])
        self.assertFalse(found)

    def test_back_reference_reaches_the_previous_clause(self):
        text = "147 institution records since 1991; 41 of them recorded a polymer award in 2023."
        tokens = vn.tokenize(text)
        s = text.index("41 ")
        found, _ = vn.noun_nearby(tokens, s, s + 2, ["institution"])
        self.assertTrue(found)

    def test_determiner_with_its_own_noun_does_not_reach_back(self):
        text = "147 institution records since 1991; 41 of these awards were recorded in 2023."
        tokens = vn.tokenize(text)
        s = text.index("41 ")
        found, _ = vn.noun_nearby(tokens, s, s + 2, ["institution"])
        self.assertFalse(found)

    def test_clause_punctuation_without_a_space_still_ends_the_clause(self):
        text = "147 institution records since 1991;41 recorded polymer awards."
        tokens = vn.tokenize(text)
        s = text.index(";41") + 1
        found, _ = vn.noun_nearby(tokens, s, s + 2, ["institution"])
        self.assertFalse(found)

    def test_full_stop_without_a_space_still_ends_the_clause(self):
        for text in ("147 institution records.41 recorded polymer awards.",
                     "147 institution records.)41 recorded polymer awards."):
            tokens = vn.tokenize(text)
            s = text.index("41")
            found, _ = vn.noun_nearby(tokens, s, s + 2, ["institution"])
            self.assertFalse(found, text)

    def test_full_stop_before_a_capital_or_opening_quote_ends_the_clause(self):
        # Round 5: "1991.Only" stayed one token, so "institution" certified the award count.
        # Round 6: so did "U.S.Only", read as the inner stop of an abbreviation, and
        # "1991.only", because only a capital after the stop counted.
        for text in ("147 institution records since 1991.Only 41 recorded polymer awards.",
                     "147 institution records since 1991.only 41 recorded polymer awards.",
                     "147 institution records.\u201c41 recorded polymer awards.\u201d",
                     "147 institution records in the U.S.Only 41 recorded polymer awards."):
            tokens = vn.tokenize(text)
            s = text.index("41 ")
            found, _ = vn.noun_nearby(tokens, s, s + 2, ["institution"])
            self.assertFalse(found, text)

    def test_full_stop_before_a_dash_ends_the_clause(self):
        # "1991.\u2014Only" stayed one token because the stop was followed by a dash, not a
        # letter, so "institution" in the last sentence certified the award count in the next.
        # The dash may be an en dash, doubled, followed by an opening quote, or trailing.
        for text in ("147 institution records since 1991.\u2014Only 41 recorded polymer awards.",
                     "147 institution records since 1991.\u2013Only 41 recorded polymer awards.",
                     "147 institution records since 1991.\u2014\u2014Only 41 recorded polymer awards.",
                     "147 institution records since 1991.\u2014\u201cOnly 41 recorded polymer awards.",
                     "147 institution records since 1991.\u2014 Only 41 recorded polymer awards.",
                     "147 institution records.\u201441 recorded polymer awards.",
                     "147 institution records in the U.S.\u2014Only 41 recorded polymer awards."):
            with self.subTest(text=text):
                tokens = vn.tokenize(text)
                s = text.index("41")
                found, _ = vn.noun_nearby(tokens, s, s + 2, ["institution"])
                self.assertFalse(found, text)

    def test_full_stop_before_markup_ends_the_clause(self):
        # Codex, #25: emphasis after "1991.\u2014\u201c" leaves the stop, dash and quote as one
        # token once tags are stripped, so the previous sentence's noun certified the count.
        bodies = ("<h1><em>147 institution records</em> since 1991.\u2014\u201c<em>Only</em> 41 polymer awards were recorded.\u201d</h1>",
                     "<h1>147 institution records since 1991.\u2014<em>Only</em> 41 polymer awards were recorded.</h1>",
                     "<h1>147 institution records since 1991.\u201c<em>Only</em> 41 polymer awards were recorded.\u201d</h1>",
                     # Codex and Grok, #25 round 2: a stop outside the emphasis, and trailers
                     # outside any list of dashes and quotes.
                     "<h1><em>147 institution records since 1991</em>.\u2014\u201c<em>Only</em> 41 polymer awards were recorded.\u201d</h1>",
                     "<h1><em>147 institution records</em> since 1991.--<em>Only</em> 41 polymer awards were recorded.</h1>",
                     "<h1><em>147 institution records</em> since 1991.*<em>Only</em> 41 polymer awards were recorded.</h1>",
                     "<h1><em>147 institution records</em> since 1991.\u2014\u201d<em>Only</em> 41 polymer awards were recorded.</h1>",
                     "<h1>147 institution records since 1991.--Only 41 polymer awards were recorded.</h1>",
                     # Codex, #25 round 3: a quote after the stop is not a decimal, and a
                     # superscript footnote mark is not a decimal digit.
                     "<h1><em>147 institution records since 1991</em>.\"41 polymer awards were recorded.\"</h1>",
                     "<h1><em>147 institution records</em> since 1991.&sup1; <em>Only</em> 41 polymer awards were recorded.</h1>",
                     # Codex, #25 round 4: a literal "<" is text, not the start of a tag that
                     # runs to the next ">" and swallows the full stop on its way.
                     "<h1><em>147 institution records</em> since 1991 (<5% missing). <em>Only</em> 41 polymer awards were recorded.</h1>",
                     # Codex, #25 round 5: a comment that spells a script tag is only a comment,
                     # and a script ends at "</script >" too; neither may swallow the stop.
                     "<h1><em>147 institution records</em> since 1991<!-- <script> -->.<!-- </script> --> <em>Only</em> 41 polymer awards were recorded.</h1>",
                     "<h1><em>147 institution records</em> since 1991<script></script >.<script></script> <em>Only</em> 41 polymer awards were recorded.</h1>",
                     # Codex, #25 round 6: a custom element named "style-..." is not a style body.
                     "<h1><em>147 institution records</em> since <style-note>1991.</style-note><style></style> <em>Only</em> 41 polymer awards were recorded.</h1>",
                  # Round 7: states a regex takes for a comment or a script body, where a
                  # browser shows the stop. SVG content breaks out at <span>; RCDATA and
                  # RAWTEXT bodies hold "<!--" as text; <plaintext> holds everything after it.
                  "<h1><em>147 institution records</em> since 1991<svg><script><span>.</span></script></svg> <em>Only</em> 41 polymer awards were recorded.</h1>",
                  *(f"<h1><em>147 institution records</em> since 1991<{tag}><!--</{tag}>.<!-- --> <em>Only</em> 41 polymer awards were recorded.</h1>"
                    for tag in ("textarea", "title", "xmp", "iframe", "noembed", "noframes")),
                  "<h1><em>147 institution records</em> since 1991<plaintext><!--. --> Only 41 polymer awards were recorded.")
        with TemporaryDirectory() as tmp:
            web, vn.WEB = vn.WEB, tmp
            try:
                for i, body in enumerate(bodies):
                    write_page(tmp, f"markup{i}", body)
                render(tmp)
                texts = [vn.page_text(f"markup{i}") for i in range(len(bodies))]
            finally:
                vn.WEB = web
        for body, text in zip(bodies, texts):
            with self.subTest(body=body):
                tokens = vn.tokenize(text)
                s = text.index("41")
                found, _ = vn.noun_nearby(tokens, s, s + 2, ["institution"])
                self.assertFalse(found, text)

    def test_a_dash_inside_a_sentence_does_not_end_the_clause(self):
        # Positive control: only a stop before the dash is a boundary. Without it the gate
        # would cry wolf on every correct sentence with an aside.
        for text in ("41 institutions\u2014the most since 1991\u2014recorded a polymer award.",
                     "The count of institutions\u2014now 41\u2014held steady."):
            with self.subTest(text=text):
                tokens = vn.tokenize(text)
                s = text.index("41")
                found, _ = vn.noun_nearby(tokens, s, s + 2, ["institution"])
                self.assertTrue(found, text)

    def test_decimal_point_does_not_end_a_clause(self):
        tokens = vn.tokenize("Institutions rose 41.5 percent.")
        self.assertIn("41.5", [w for _, _, w in tokens])

    def test_abbreviation_stays_whole_and_a_domain_splits(self):
        # A split domain can only close a clause early, which fails a binding, never passes it.
        words = [w for _, _, w in vn.tokenize("U.S. schools, e.g. Akron, at us.edu")]
        self.assertEqual(words, ["U.S.", "schools,", "e.g.", "Akron,", "at", "us.", "edu"])

    def test_noun_in_the_next_sentence_does_not_count(self):
        tokens = vn.tokenize("The count fell to 41. Institutions elsewhere grew.")
        found, _ = vn.noun_nearby(tokens, 18, 20, ["institution"])
        self.assertFalse(found)


class CheckPageTest(unittest.TestCase):
    """End-to-end: a real claims.json plus a real index.html for one throwaway page."""

    def _make_page(self, page, html_body, claims, rendered=True):
        write_page(vn.WEB, page, html_body)
        (Path(vn.WEB) / page / "claims.json").write_text(
            json.dumps({"data": "viz-data.json", "claims": claims}), encoding="utf-8")
        if rendered:
            render(vn.WEB)

    def setUp(self):
        tmp = TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.addCleanup(setattr, vn, "WEB", vn.WEB)
        vn.WEB = tmp.name

    def test_figure_with_correct_noun_nearby_passes(self):
        self._make_page(
            "goodpage",
            "<h1>41 institutions had a program still conferring in 2023.</h1>",
            [{"id": "c1", "counts": [{"figure": "41", "noun": ["institution"]}]}],
        )
        results = vn.check_page("goodpage")
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]["ok"], results[0])

    def test_figure_with_wrong_noun_nearby_fails(self):
        # The atlas shape: the right number, the wrong word beside it.
        self._make_page(
            "badpage",
            "<h1>41 recorded polymer awards in 2023.</h1>",
            [{"id": "c1", "counts": [{"figure": "41", "noun": ["institution"]}]}],
        )
        results = vn.check_page("badpage")
        self.assertEqual(len(results), 1)
        self.assertFalse(results[0]["ok"], results[0])
        self.assertIsNone(results[0]["note"])
        self.assertTrue(any(not o["ok"] for o in results[0]["occurrences"]))

    def test_script_and_comment_bodies_stay_out_of_the_prose(self):
        # Positive control for the one-pass reader: a script closed by "</script >" and a
        # comment still hide their text, so neither can supply the noun.
        self._make_page(
            "hiddenpage",
            "<script>var institution = 1;</script ><!-- institution -->"
            "<h1>41 recorded polymer awards in 2023.</h1>",
            [{"id": "c1", "counts": [{"figure": "41", "noun": ["institution"]}]}],
        )
        results = vn.check_page("hiddenpage")
        self.assertFalse(results[0]["ok"], results[0])
        self.assertIsNone(results[0]["note"])

    def test_markup_a_regex_could_not_follow_reads_as_a_browser_reads_it(self):
        # Codex and Grok, #25 rounds 5-6: the regex reader refused these pages, because each
        # form reads one way in a browser and another to a regex. Chromium now reads them, and
        # each shows the stop: CDATA renders inside SVG, "--!>" and "<!-->" end a comment,
        # "<script/>" is empty inside SVG, and text before an unclosed script is still text.
        bodies = (
            "<svg><text>147 institution records<tspan><![CDATA[ since 1991 (<5% missing).]]>"
            "</tspan> Only 41 polymer awards were recorded.</text></svg>",
            "<h1><em>147 institution records</em> since 1991<!-- note --!>.<!-- note --> "
            "<em>Only</em> 41 polymer awards were recorded.</h1>",
            "<h1>147 institution records since 1991<!-->. Only 41 polymer awards.</h1>",
            "<h1><svg><text>147 institution records since 1991<script/>.<script></script> "
            "Only 41 polymer awards were recorded.</text></svg></h1>",
            "<h1>147 institution records since 1991. Only 41 polymer awards.</h1><script>var x")
        for i, body in enumerate(bodies):
            self._make_page(f"browser{i}", body,
                            [{"id": "c1", "counts": [{"figure": "41", "noun": ["institution"]}]}],
                            rendered=False)
        render(vn.WEB)
        for i, body in enumerate(bodies):
            with self.subTest(body=body):
                results = vn.check_page(f"browser{i}")
                self.assertEqual(len(results), 1)
                self.assertFalse(results[0]["ok"], results[0])
                self.assertIsNone(results[0]["note"], results[0])

    def test_markup_that_hides_the_noun_from_a_browser_hides_it_from_the_gate(self):
        # Round 7, the other direction: a regex showed a noun the browser hides. An unclosed
        # "<!--" runs to the end of the document, and a script start tag ends at the ">"
        # outside its quoted attribute, so its body is the "institution" after it.
        bodies = ("<h1>41 polymer awards were recorded<!-- > for each institution</h1>",
                  "<h1>41 polymer awards were recorded<script data-x=\"></script>\" />"
                  "for each institution</script></h1>")
        for i, body in enumerate(bodies):
            self._make_page(f"hidden{i}", body,
                            [{"id": "c1", "counts": [{"figure": "41", "noun": ["institution"]}]}],
                            rendered=False)
        render(vn.WEB)
        for i, body in enumerate(bodies):
            with self.subTest(body=body):
                results = vn.check_page(f"hidden{i}")
                self.assertFalse(results[0]["ok"], results[0])
                self.assertIsNone(results[0]["note"], results[0])

    def test_noscript_reads_as_a_browser_without_scripting_reads_it(self):
        # The gate renders with scripting off, so a <noscript> body is markup, as the reader
        # it exists for meets it: its comment hides the stop and its text is prose.
        self._make_page(
            "noscriptpage",
            "<h1><em>147 institution records</em> since 1991<noscript><!--</noscript>.<!-- -->"
            " <em>Only</em> 41 polymer awards were recorded.</h1>",
            [{"id": "c1", "counts": [{"figure": "41", "noun": ["institution"]}]}])
        results = vn.check_page("noscriptpage")
        self.assertTrue(results[0]["ok"], results[0])

    def test_missing_or_stale_rendered_text_fails_as_uninspectable(self):
        # The gate never falls back to reading HTML itself. With no dump, with a bundle
        # changed since its dump, or with no bundle at all, every binding on the page FAILS.
        claims = [{"id": "c1", "counts": [{"figure": "41", "noun": ["institution"]}]}]
        self._make_page("undumped", "<h1>41 institutions had a program.</h1>", claims,
                        rendered=False)
        results = vn.check_page("undumped")
        self.assertFalse(results[0]["ok"])
        self.assertIn("no rendered text", results[0]["note"])

        self._make_page("stalepage", "<h1>41 institutions had a program.</h1>", claims)
        self.assertTrue(vn.check_page("stalepage")[0]["ok"])
        bundle = Path(vn.WEB) / "dist" / "stalepage.html"
        bundle.write_text(bundle.read_text(encoding="utf-8").replace(
            "41 institutions", "41 awards"), encoding="utf-8")
        results = vn.check_page("stalepage")
        self.assertFalse(results[0]["ok"])
        self.assertIn("stale", results[0]["note"])

        bundle.unlink()
        results = vn.check_page("stalepage")
        self.assertFalse(results[0]["ok"])
        self.assertIn("no dist/stalepage.html", results[0]["note"])

    def test_figure_absent_from_page_fails_not_silently(self):
        self._make_page(
            "missingpage",
            "<h1>Nothing numeric here at all.</h1>",
            [{"id": "c1", "counts": [{"figure": "41", "noun": ["institution"]}]}],
        )
        results = vn.check_page("missingpage")
        self.assertEqual(len(results), 1)
        self.assertFalse(results[0]["ok"])
        self.assertEqual(results[0]["note"], "cannot inspect: figure not on page")

    def test_empty_noun_fails_instead_of_matching_every_word(self):
        # An empty stem is a prefix of every word, so it would pass any page.
        for noun in ("", [], [""], ["  "]):
            self._make_page(
                f"emptynoun{len(str(noun))}{noun!r}".replace(" ", "_").replace("'", ""),
                "<h1>41 institutions had a program.</h1>",
                [{"id": "c1", "counts": [{"figure": "41", "noun": noun}]}],
            )
        for page in sorted(p.name for p in Path(vn.WEB).iterdir() if p.name != "dist"):
            results = vn.check_page(page)
            self.assertEqual(len(results), 1, page)
            self.assertFalse(results[0]["ok"], page)
            self.assertTrue(results[0]["note"].startswith("invalid entry"), page)

    def test_empty_figure_fails_instead_of_matching_everywhere(self):
        self._make_page(
            "emptyfigure",
            "<h1>41 institutions had a program.</h1>",
            [{"id": "c1", "counts": [{"figure": "", "noun": "institution"}]}],
        )
        results = vn.check_page("emptyfigure")
        self.assertFalse(results[0]["ok"])
        self.assertTrue(results[0]["note"].startswith("invalid entry"))

    def test_page_with_no_counts_field_is_skipped_not_passed(self):
        self._make_page(
            "uncoveredpage",
            "<h1>41 institutions had a program.</h1>",
            [{"id": "c1"}],
        )
        self.assertEqual(vn.check_page("uncoveredpage"), [])


if __name__ == "__main__":
    unittest.main()
