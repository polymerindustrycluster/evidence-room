"""Regression for check_bundles(): freshness must be judged by content, not mtime.

Before 2026-09-28 a bundle was "stale" whenever any input's mtime was newer than the
bundle's own — which a `git pull`/`checkout` does to every file on a clean tree without
touching a single byte. Verified that day: 25 false ERRORs on a clean checkout with a
leftover gitignored dist/; rebuilding produced a byte-identical dist and the errors
vanished. These tests build a tiny fake web/ + dist/ in a temp dir and drive
check_bundles() directly (web/dist are now parameters, not only module globals), so they
never touch the real tree and need neither Node nor network.

Run: python3 -m unittest discover -s _data/build -p 'test_*.py'
     python3 -B _data/build/test_bundle_freshness.py
"""
import json
import os
import tempfile
import unittest

import verify_consistency as vc

PAGE = "pageA"


class BundleFreshnessTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="bundle-freshness-")
        self.addCleanup(self.tmp.cleanup)
        self.web = os.path.join(self.tmp.name, "web")
        self.dist = os.path.join(self.web, "dist")
        page_dir = os.path.join(self.web, PAGE)
        os.makedirs(page_dir)
        os.makedirs(os.path.join(page_dir, "data"))
        os.makedirs(os.path.join(self.web, "_shared"))
        os.makedirs(os.path.join(self.web, "_data"))
        os.makedirs(self.dist)

        self._write(page_dir, "index.html", "<html>references _shared/picviz.js</html>")
        self._write(page_dir, "app.js", "console.log('a');")
        self._write(page_dir, "styles.css", "body { color: black; }")
        self._write(page_dir, "claims.json", '{"claims": []}')
        self._write(os.path.join(page_dir, "data"), "x.json", '{"n": 1}')
        self._write(os.path.join(self.web, "_shared"), "picviz.js", "export const PV = {};")
        self._write(os.path.join(self.web, "_data"), "SOURCES.json", '{"sources": {}}')

        # dummy bundle output — its own content does not matter to check_bundles
        self._write(self.dist, f"{PAGE}.html", "<html>bundled</html>")

        # the manifest bundle.mjs would have written at build time: a snapshot of the
        # hashes of every input, taken via the same function check_bundles() will later
        # recompute the CURRENT hashes with — this is exactly what makes "identical
        # content, different mtime" distinguishable from "different content".
        self._write_manifest()

        vc.findings.clear()
        self.addCleanup(vc.findings.clear)

    def _write(self, directory, name, content):
        path = os.path.join(directory, name)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(content)
        return path

    def _write_manifest(self):
        recorded = vc._bundle_inputs(self.web, PAGE)
        with open(os.path.join(self.dist, ".inputs.json"), "w", encoding="utf-8") as fh:
            json.dump({PAGE: recorded}, fh)

    def _bundle_findings(self):
        return [f for f in vc.findings if f[0] == "ERROR" and f[1] == "bundle"]

    def test_newer_mtime_identical_content_passes(self):
        # A `git checkout`/`pull` bumps every mtime without touching a byte.
        future = os.path.getmtime(os.path.join(self.dist, f"{PAGE}.html")) + 3600
        for root, _dirs, files in os.walk(self.web):
            for f in files:
                os.utime(os.path.join(root, f), (future, future))
        vc.check_bundles([PAGE], web=self.web, dist=self.dist)
        self.assertEqual(self._bundle_findings(), [])

    def test_changed_input_byte_errors_naming_the_file(self):
        app_js = os.path.join(self.web, PAGE, "app.js")
        with open(app_js, "a", encoding="utf-8") as fh:
            fh.write("\n// changed after bundling\n")
        vc.check_bundles([PAGE], web=self.web, dist=self.dist)
        found = self._bundle_findings()
        self.assertEqual(len(found), 1, found)
        self.assertIn("app.js", found[0][3])
        self.assertIn("older", found[0][3])

    def test_missing_manifest_errors(self):
        os.remove(os.path.join(self.dist, ".inputs.json"))
        vc.check_bundles([PAGE], web=self.web, dist=self.dist)
        found = self._bundle_findings()
        self.assertEqual(len(found), 1, found)
        self.assertEqual(found[0][2], "dist/.inputs.json")
        self.assertEqual(found[0][3], "no input manifest — rebuild")

    def test_unreadable_manifest_errors_the_same_way_as_missing(self):
        with open(os.path.join(self.dist, ".inputs.json"), "w", encoding="utf-8") as fh:
            fh.write("{not valid json")
        vc.check_bundles([PAGE], web=self.web, dist=self.dist)
        found = self._bundle_findings()
        self.assertEqual(len(found), 1, found)
        self.assertEqual(found[0][3], "no input manifest — rebuild")

    def test_manifest_that_is_not_an_object_errors_the_same_way_as_missing(self):
        with open(os.path.join(self.dist, ".inputs.json"), "w", encoding="utf-8") as fh:
            fh.write("null")
        vc.check_bundles([PAGE], web=self.web, dist=self.dist)
        found = self._bundle_findings()
        self.assertEqual(len(found), 1, found)
        self.assertEqual(found[0][3], "no input manifest — rebuild")

    def test_input_added_after_bundling_errors(self):
        self._write(os.path.join(self.web, PAGE, "data"), "new.json", '{"n": 2}')
        vc.check_bundles([PAGE], web=self.web, dist=self.dist)
        found = self._bundle_findings()
        self.assertEqual(len(found), 1, found)
        self.assertIn("new.json", found[0][3])
        self.assertIn("before", found[0][3])

    def test_input_removed_after_bundling_errors(self):
        os.remove(os.path.join(self.web, PAGE, "claims.json"))
        vc.check_bundles([PAGE], web=self.web, dist=self.dist)
        found = self._bundle_findings()
        self.assertEqual(len(found), 1, found)
        self.assertIn("claims.json", found[0][3])
        self.assertIn("no longer exists", found[0][3])

    def test_no_bundle_still_errors_independent_of_manifest(self):
        os.remove(os.path.join(self.dist, f"{PAGE}.html"))
        vc.check_bundles([PAGE], web=self.web, dist=self.dist)
        found = self._bundle_findings()
        self.assertEqual(len(found), 1, found)
        self.assertEqual(found[0][2], PAGE)
        self.assertIn("never shipped", found[0][3])


if __name__ == "__main__":
    unittest.main()
