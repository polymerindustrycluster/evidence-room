"""Adversarial tests use isolated copies; the repository is never mutated."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

import audit


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="evidence-room-duckdb-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.documents = {}
        self.original_bytes = {}
        for relative in (audit.AUTHORITY, audit.PUBLISHED):
            raw = (audit.ROOT / relative).read_bytes()
            self.original_bytes[relative] = raw
            self.documents[relative] = json.loads(raw)
            (self.root / relative).parent.mkdir(parents=True, exist_ok=True)
            (self.root / relative).write_bytes(raw)
        # The existing consistency function also reads this independent census.
        counts = "index/data/counts.json"
        (self.root / counts).parent.mkdir(parents=True)
        (self.root / counts).write_bytes((audit.ROOT / counts).read_bytes())

    def tearDown(self):
        for relative, original in self.original_bytes.items():
            self.assertEqual((audit.ROOT / relative).read_bytes(), original)

    def save(self, relative):
        (self.root / relative).write_text(json.dumps(self.documents[relative]), encoding="utf-8")

    def run_cli(self, *args):
        output = io.StringIO()
        with redirect_stdout(output):
            status = audit.main(["--root", str(self.root), "--json", *args])
        return status, json.loads(output.getvalue())

    def test_real_clean_and_impact(self):
        status, report = self.run_cli("--source", "qcew")
        self.assertEqual(status, 0)
        expected = sorted(p for p, ss in self.documents[audit.AUTHORITY]["by_artifact"].items()
                          if "qcew" in ss)
        self.assertEqual(report["impact"]["declared_pages"], expected)
        self.assertEqual(report["impact"]["published_page_list"], expected)
        self.assertEqual(report["impact"]["published_source_list"], expected)
        self.assertEqual(report["findings"], [])

    def test_swap_preserves_totals_but_exposes_new_coverage(self):
        published = self.documents[audit.PUBLISHED]
        before_totals = copy.deepcopy(published["totals"])
        pages = {p["slug"]: p for p in published["pages"]}
        self.assertEqual(pages["laborshed"]["sources"], ["lodes"])
        self.assertEqual(pages["wages"]["sources"], ["qcew"])
        pages["laborshed"]["sources"], pages["wages"]["sources"] = ["qcew"], ["lodes"]
        self.save(audit.PUBLISHED)
        self.assertEqual(published["totals"], before_totals)
        self.assertTrue(all(len(p["sources"]) == p["n_sources"] for p in pages.values()))
        # This mutation really escapes the existing published-register check.
        spec = importlib.util.spec_from_file_location(
            "existing_consistency", audit.ROOT / "_data/build/verify_consistency.py")
        existing = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(existing)
        def fixture_load(path):
            return json.loads((self.root / path).read_text(encoding="utf-8"))
        with patch.object(existing, "WEB", str(self.root)), patch.object(existing, "load_json", fixture_load):
            existing.check_published_register(self.documents[audit.AUTHORITY], [])
        self.assertEqual(existing.findings, [])
        status, report = self.run_cli("--source", "qwi")
        self.assertEqual(status, 1)  # source filtering must not hide other discrepancies
        self.assertEqual({(f["check"], f["page"], f["source"], f["view"])
                          for f in report["findings"]}, {
            ("missing-edge", "laborshed", "lodes", "pages[].sources"),
            ("missing-edge", "wages", "qcew", "pages[].sources"),
            ("unexpected-edge", "laborshed", "qcew", "pages[].sources"),
            ("unexpected-edge", "wages", "lodes", "pages[].sources"),
        })

    def test_reverse_listing_and_count_drift(self):
        pub = self.documents[audit.PUBLISHED]
        next(s for s in pub["sources"] if s["key"] == "lodes")["pages"].remove("laborshed")
        next(p for p in pub["pages"] if p["slug"] == "wages")["n_sources"] += 1
        self.save(audit.PUBLISHED)
        report = audit.audit(self.root)
        self.assertEqual(report["findings"], [
            {"check": "missing-edge", "view": "sources[].pages", "page": "laborshed", "source": "lodes"},
            {"check": "source-count", "page": "wages", "published": 2, "expected": 1},
        ])

    def test_zero_edge_page_is_not_lost(self):
        self.documents[audit.AUTHORITY]["by_artifact"]["empty-page"] = []
        self.save(audit.AUTHORITY)
        self.assertIn({"check": "missing-page", "id": "empty-page"}, audit.audit(self.root)["findings"])

    def test_malformed_missing_and_duplicate_json(self):
        path = self.root / audit.AUTHORITY
        for raw in [b"[]", b"{}", b"{", b"\xff", b'{"sources":{},"sources":{}}']:
            with self.subTest(raw=raw):
                path.write_bytes(raw)
                status, report = self.run_cli()
                self.assertEqual(status, 2)
                self.assertIn(audit.AUTHORITY, report["error"])
        path.unlink()
        self.assertEqual(self.run_cli()[0], 2)

    def test_duplicates_and_unknown_authority_source(self):
        pub = self.documents[audit.PUBLISHED]
        pub["pages"][0]["sources"].append(pub["pages"][0]["sources"][0])
        self.save(audit.PUBLISHED)
        self.assertIn("duplicate identifier", self.run_cli()[1]["error"])
        (self.root / audit.PUBLISHED).write_bytes(self.original_bytes[audit.PUBLISHED])
        self.documents[audit.AUTHORITY]["by_artifact"]["wages"].append("not-registered")
        self.save(audit.AUTHORITY)
        self.assertIn("unknown source", self.run_cli()[1]["error"])

    def test_unknown_source_is_not_an_empty_success(self):
        status, report = self.run_cli("--source", "x' OR 1=1 --")
        self.assertEqual(status, 2)
        self.assertIn("unknown source", report["error"])

    def test_missing_published_links_and_boolean_count(self):
        pub = self.documents[audit.PUBLISHED]
        del pub["pages"][0]["sources"]
        self.save(audit.PUBLISHED)
        self.assertEqual(self.run_cli()[0], 2)
        for invalid in [True, -1, 2**63, 10**100, 1.5, "1"]:
            with self.subTest(n_sources=invalid):
                pub = json.loads(self.original_bytes[audit.PUBLISHED])
                pub["pages"][0]["n_sources"] = invalid
                self.documents[audit.PUBLISHED] = pub
                self.save(audit.PUBLISHED)
                status, report = self.run_cli()
                self.assertEqual(status, 2)
                self.assertIn("nonnegative 64-bit integer", report["error"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
