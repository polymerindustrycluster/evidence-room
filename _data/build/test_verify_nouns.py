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
    because each would otherwise match almost anything.

Run: python3 -m unittest discover -s _data/build -p 'test_*.py'   (auto-discovered)
     python3 _data/build/test_verify_nouns.py
"""
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

import verify_nouns as vn


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

    def test_noun_in_the_next_sentence_does_not_count(self):
        tokens = vn.tokenize("The count fell to 41. Institutions elsewhere grew.")
        found, _ = vn.noun_nearby(tokens, 18, 20, ["institution"])
        self.assertFalse(found)


class CheckPageTest(unittest.TestCase):
    """End-to-end: a real claims.json plus a real index.html for one throwaway page."""

    def _make_page(self, page, html_body, claims):
        page_dir = Path(vn.WEB) / page
        page_dir.mkdir(parents=True)
        (page_dir / "index.html").write_text(
            f"<html><body>{html_body}</body></html>", encoding="utf-8")
        (page_dir / "claims.json").write_text(
            json.dumps({"data": "viz-data.json", "claims": claims}), encoding="utf-8")

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
        for page in sorted(p.name for p in Path(vn.WEB).iterdir()):
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
