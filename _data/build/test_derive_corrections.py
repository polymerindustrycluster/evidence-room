"""Regressions for derive_corrections.py's page readings (PR #49 review, 2026-10-05).

Each test edits the real CORRECTIONS.md text in memory and parses it, so the fixtures are the
entries that went wrong.

Run: python3 -m unittest discover -s _data/build -p 'test_*.py'
"""
import os
import unittest

import derive_corrections as dc

SRC = open(dc.SRC, encoding="utf-8").read()


def kinds(log, entry_id):
    return next(e for e in log["entries"] if e["id"] == entry_id)["flags"]


class PagesNamed(unittest.TestCase):
    def test_front_page_in_italics_is_index(self):
        """'*... sources, front page*' in a heading names the index page."""
        log, _ = dc.parse(SRC)
        self.assertIn("index", kinds(log, "2026-10-04-1"))

    def test_unknown_italic_name_fails(self):
        """A heading name that resolves to no page fails rather than dropping the page."""
        bad = SRC.replace("timeline, sources, front page*", "timeline, sources, frontpage*", 1)
        self.assertNotEqual(bad, SRC)
        with self.assertRaises(SystemExit) as cm:
            dc.parse(bad)
        self.assertIn("frontpage", str(cm.exception))

    def test_hub_in_prose_must_name_index(self):
        """An entry that says the front page changed, in roman, must name index."""
        old = dc.PAGES_ADDED.pop("2026-09-30 — More sentences that said more")
        try:
            with self.assertRaises(SystemExit) as cm:
                dc.parse(SRC)
            self.assertIn("does not name index", str(cm.exception))
        finally:
            dc.PAGES_ADDED["2026-09-30 — More sentences that said more"] = old


class Headlines(unittest.TestCase):
    def test_headline_pairs_hold(self):
        """The ten hand-listed headline changes each land on an entry naming that page."""
        log, _ = dc.parse(SRC)
        flagged = sorted((e["id"], p) for e in log["entries"]
                         for p, f in e["flags"].items() if f["headline_changed"])
        self.assertEqual(len(flagged), len(dc.HEADLINE))
        self.assertTrue(all("kind" not in f for e in log["entries"] for f in e["flags"].values()))


if __name__ == "__main__":
    unittest.main()
