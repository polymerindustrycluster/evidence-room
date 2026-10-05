"""Regressions for derive_corrections.py's page and kind readings (PR #49 review, 2026-10-05).

Each test edits the real CORRECTIONS.md text in memory and parses it, so the fixtures are the
entries that went wrong.

Run: python3 -m unittest discover -s _data/build -p 'test_*.py'
"""
import os
import unittest

import derive_corrections as dc

SRC = open(dc.SRC, encoding="utf-8").read()


def kinds(log, entry_id):
    return next(e for e in log["entries"] if e["id"] == entry_id)["kinds"]


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


class Kinds(unittest.TestCase):
    def test_page_count_is_a_figure(self):
        """The sources page count, 23 to 24, under an entry that says no figure changed."""
        log, _ = dc.parse(SRC)
        self.assertEqual(kinds(log, "2026-10-04-5")["sources"]["kind"], "figure")

    def test_contested_pair_fails_until_read(self):
        """'No figure changed' in shared text against a page's own swapped number fails."""
        key = ("2026-10-04 — The corrections log is a page", "sources")
        old = dc.KIND_OVERRIDE.pop(key)
        try:
            with self.assertRaises(SystemExit) as cm:
                dc.parse(SRC)
            self.assertIn("KIND_OVERRIDE", str(cm.exception))
        finally:
            dc.KIND_OVERRIDE[key] = old

    def test_one_count_changed_reaches_only_the_pages_printing_it(self):
        """'One count changed (timeline)': timeline and the hub card that prints it are figures,
        every other page in the entry is wording."""
        log, _ = dc.parse(SRC)
        k = kinds(log, "2026-10-04-2")
        figs = sorted(p for p, v in k.items() if v["kind"] == "figure")
        self.assertEqual(figs, ["federal-money", "index", "sources", "timeline"])


if __name__ == "__main__":
    unittest.main()
