"""tools/pagetext.mjs on a page with no bundle: still a failure, and the line tools/all.mjs
prints (the last one) names the page and says the suite must bundle first.

Run: python3 -B -m unittest _data/build/test_pagetext_missing.py
Reads and writes only a temporary --dist directory, never dist/.
"""
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class MissingBundle(unittest.TestCase):
    def test_names_the_page_and_the_bundle_step(self):
        with tempfile.TemporaryDirectory() as d:
            r = subprocess.run(["node", str(ROOT / "tools/pagetext.mjs"), f"--dist={d}", "no-such-page"],
                               capture_output=True, text=True, cwd=ROOT, timeout=120)
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        last = [l for l in (r.stdout + r.stderr).splitlines() if l.strip()][-1]
        self.assertIn("no-such-page", last)
        self.assertIn("node tools/bundle.mjs", last)


if __name__ == "__main__":
    unittest.main()
