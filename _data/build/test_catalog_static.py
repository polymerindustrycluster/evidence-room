"""A static inventory must not execute a fetcher's module-level code."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


class StaticCatalogueTest(unittest.TestCase):
    def test_module_with_a_write_is_inventory_only(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            build = root / '_data' / 'build'
            build.mkdir(parents=True)
            producer = build / 'build_catalog.py'
            shutil.copyfile(Path(__file__).with_name('build_catalog.py'), producer)
            (root / '_data' / 'SOURCES.json').write_text('{"sources": {}, "by_artifact": {}}')
            marker = build / 'imported.txt'
            (build / 'fetch_tripwire.py').write_text(
                '"""A known import-time side effect."""\n'
                'from pathlib import Path\n'
                'Path(__file__).with_name("imported.txt").write_text("executed")\n'
                'raise RuntimeError("This module must not execute during inventory")\n'
            )
            result = subprocess.run([sys.executable, str(producer), '--static-only'],
                                    capture_output=True, text=True, timeout=30)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertFalse(marker.exists(), 'Catalogue executed the import-time write')
            catalog = json.loads((root / '_data' / 'catalog.json').read_text(encoding='utf-8'))
            self.assertEqual(catalog['meta']['mode'], 'static-only')
            self.assertEqual(len(catalog['scripts']), 1)
            entry = catalog['scripts'][0]
            self.assertEqual(entry['observed_stop'], 'not_run_static_only')
            self.assertIn('observation_not_run', entry['flags'])
            self.assertNotIn('import_error', entry['flags'])
            self.assertEqual(entry['witnesses']['observed'], [])
            before = (root / '_data' / 'catalog.json').read_bytes()
            typo = subprocess.run([sys.executable, str(producer), '--static-onyl'],
                                  capture_output=True, text=True, timeout=30)
            self.assertEqual(typo.returncode, 2)
            self.assertFalse(marker.exists(), 'Invalid option fell through to module execution')
            self.assertEqual((root / '_data' / 'catalog.json').read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
