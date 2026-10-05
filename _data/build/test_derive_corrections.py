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
        log, _ = dc.parse(SRC, history=False)
        self.assertIn("index", kinds(log, "2026-10-04-1"))

    def test_unknown_italic_name_fails(self):
        """A heading name that resolves to no page fails rather than dropping the page."""
        bad = SRC.replace("timeline, sources, front page*", "timeline, sources, frontpage*", 1)
        self.assertNotEqual(bad, SRC)
        with self.assertRaises(SystemExit) as cm:
            dc.parse(bad)
        self.assertIn("frontpage", str(cm.exception))

    def test_front_page_in_prose_names_index(self):
        """'*revisions* and the front page' in roman: the front page is named, so index counts it."""
        log, _ = dc.parse(SRC, history=False)
        self.assertIn("index", next(e for e in log["entries"] if e["id"] == "2026-09-30-1")["pages"])


class Mentions(unittest.TestCase):
    def test_body_mention_attributes_the_page(self):
        """2026-09-28-8 corrects cluster-health's WPU06 label in its body; it counts there."""
        log, summ = dc.parse(SRC, history=False)
        e = next(e for e in log["entries"] if e["id"] == "2026-09-28-8")
        self.assertIn("cluster-health", e["pages"])
        self.assertIn("2026-09-28-8", [x["id"] for x in summ["pages"]["cluster-health"]])

    def test_stale_exclusion_fails(self):
        """An exclusion that matches no mention fails rather than lingering."""
        key = ("2026-09-28 — Churn said most hires", "patents")
        dc.MENTION_EXCLUDED[key] = "test"
        try:
            with self.assertRaises(SystemExit):
                dc.parse(SRC, history=False)
        finally:
            del dc.MENTION_EXCLUDED[key]


class HeadlineDates(unittest.TestCase):
    """Headline dates come from git: an H1 text change after first publication is dated,
    markup and whitespace alone are not, and the publishing commit is not."""

    def test_from_a_scratch_repository(self):
        import subprocess, tempfile
        with tempfile.TemporaryDirectory() as repo:
            run = lambda *a, date=None: subprocess.run(
                ["git", "-C", repo, *a], check=True, capture_output=True,
                env=dict(os.environ, GIT_AUTHOR_DATE=date or "2026-01-01T12:00:00",
                         GIT_COMMITTER_DATE=date or "2026-01-01T12:00:00",
                         GIT_AUTHOR_NAME="t", GIT_AUTHOR_EMAIL="t@t", GIT_COMMITTER_NAME="t",
                         GIT_COMMITTER_EMAIL="t@t"))
            run("init", "-q")
            os.makedirs(os.path.join(repo, "pg"))
            def commit(h1, date):
                with open(os.path.join(repo, "pg", "index.html"), "w") as fh:
                    fh.write(f"<html><h1>{h1}</h1></html>")
                run("add", "-A")
                run("commit", "-q", "-m", date, date=date + "T12:00:00")
            commit("Pay is level.", "2026-08-01")                         # publication
            commit("Pay is <em>level</em>.\n", "2026-08-05")              # markup only
            commit("Chemicals pay 'more'.", "2026-08-09")                # a change
            commit("Chemicals pay &lsquo;more&rsquo;.", "2026-08-12")     # quote style only
            self.assertEqual(dc.headline_dates("pg", repo), ["2026-08-09"])


if __name__ == "__main__":
    unittest.main()
