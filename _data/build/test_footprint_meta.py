"""Every shipped footprint block carries the current footprints.META sentence.

Run: python -B _data/build/test_footprint_meta.py

The banner and the exports print a page's meta.footprint.differs as stored, so a data file
written from an older copy of META keeps publishing the older sentence after META is fixed.
footprint_meta_patch.py --check reads every */data/*.json and fails on a stale copy.
"""
import subprocess
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent


class FootprintMeta(unittest.TestCase):
    def test_no_stale_footprint_sentence(self):
        r = subprocess.run([sys.executable, "-B", str(HERE / "footprint_meta_patch.py"), "--check"],
                           cwd=HERE, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertRegex(r.stdout, r"[1-9]\d* footprint block\(s\) inspected; 0 stale")


if __name__ == "__main__":
    unittest.main()
