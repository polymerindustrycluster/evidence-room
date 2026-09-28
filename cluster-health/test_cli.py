"""A malformed CLI must not fall through to a full health rebuild."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HealthCLI(unittest.TestCase):
    def test_malformed_arguments_never_write_and_default_still_builds(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            for name in ('cluster-health/derive_health.py', 'cluster-health/derive_workplaces.py',
                         'wages/data/wages.json', 'location-quotient/data/lq.json',
                         'occupations/data/viz-data.json', 'federal-money/data/federal.json',
                         'federal-money/data/techhub.json', 'funding-map/data/funding.json',
                         'revisions/data/revisions.json'):
                target = root/name
                target.parent.mkdir(parents=True,exist_ok=True)
                shutil.copyfile(ROOT/name,target)
            outputs = [root/'cluster-health/data'/name for name in ('health.json','workplaces.json')]
            outputs[0].parent.mkdir(parents=True)
            for output in outputs:
                output.write_bytes(b'no-write regression sentinel\n')
            malformed = [
                ['--workplace-only'], ['--workplaces-onyl'], ['--check'],
                ['--source-dir', str(root)], ['unexpected'],
                ['--workplaces-only'],
                ['--workplaces-only', '--source-dir', str(root), '--chec'],
                ['--workplaces-only', '--source-di', str(root)],
                ['--workplaces-only', '--source-dir', str(root), '--unknown'],
            ]
            for args in malformed:
                with self.subTest(args=args):
                    before = [(p.read_bytes(),p.stat().st_mtime_ns) for p in outputs]
                    result = subprocess.run([sys.executable,str(root/'cluster-health/derive_health.py'),*args],
                                            capture_output=True,text=True,timeout=30)
                    self.assertEqual(result.returncode,2,result.stdout+result.stderr)
                    self.assertIn('error:',result.stderr)
                    self.assertEqual(before,[(p.read_bytes(),p.stat().st_mtime_ns) for p in outputs])
            result = subprocess.run([sys.executable,str(root/'cluster-health/derive_health.py')],
                                    capture_output=True,text=True,timeout=30)
            self.assertEqual(result.returncode,0,result.stdout+result.stderr)
            self.assertEqual({t['id'] for t in json.loads(outputs[0].read_text(encoding='utf-8'))['tiles']},
                             {'scale','concentration','pay','talent','capital'})
            self.assertEqual(outputs[1].read_bytes(),b'no-write regression sentinel\n')


if __name__ == '__main__':
    unittest.main()
