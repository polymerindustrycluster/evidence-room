"""Run the real scoped producers in isolated copies; preserve nonfederal snapshots."""
import copy
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
INPUTS = ['accountability/data/accountability.json', 'accountability/data/promises.json',
          'accountability/data/recipient_types.json', 'scorecard/data/scorecard.json',
          'federal-money/data/federal.json', 'federal-money/data/techhub.json',
          'funding-map/data/funding.json', 'timeline/data/timeline.json',
          'location-quotient/data/lq.json', 'occupations/data/viz-data.json', 'peers/data/peers.json']


class ScopedFederalTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='federal-scoped-')
        self.root = Path(self.directory.name).resolve()
        assert self.root.parent == Path(tempfile.gettempdir()).resolve()
        assert self.root.name.startswith('federal-scoped-')
        self.addCleanup(self.directory.cleanup)
        for name in INPUTS + ['accountability/derive_accountability.py', 'scorecard/derive_scorecard.py']:
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, target)

    def read(self, name):
        return json.loads((self.root / name).read_text(encoding='utf-8'))

    def write(self, name, value):
        (self.root / name).write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')

    def run_scoped(self, page):
        return subprocess.run([sys.executable, '-B', str(self.root / page / f'derive_{page}.py'),
                               '--federal-only'], cwd=self.root, capture_output=True, text=True,
                              encoding='utf-8', timeout=30)

    def test_successful_scorecard_merge_preserves_snapshot(self):
        name = 'scorecard/data/scorecard.json'
        previous = self.read(name)
        previous['meta']['snapshot_marker'] = 'retain this nonfederal field'
        previous['talent']['source_correction']['snapshot_marker'] = ['historical', 'retained']
        row = next(r for r in previous['rows'] if r['id'] == 'd-federal')
        row.update(current='$1.0M a year', sub='stale period')
        self.write(name, previous)
        run = self.run_scoped('scorecard')
        self.assertEqual(run.returncode, 0, run.stderr)
        after = self.read(name)
        actual = next(r for r in after['rows'] if r['id'] == 'd-federal')
        federal = self.read('federal-money/data/federal.json')
        average = sum(r['real'] for r in federal['naics'] if 2019 <= r['fy'] <= 2025) / 7
        self.assertEqual(actual['current'], f'${average / 1e6:.1f}M a year')
        self.assertEqual(actual['sub'], 'FY2019-FY2025 average, seven completed years')
        actual.clear()
        actual.update(row)
        self.assertEqual(after, previous)

    def test_successful_accountability_merge_uses_source_identity(self):
        name = 'accountability/data/accountability.json'
        previous = self.read(name)
        previous['meta']['snapshot_marker'] = 'retain this nonfederal field'
        previous['context'].update(background_rate=1, background_years=[2000, 2001])
        previous['context']['defects'].reverse()  # Position must not determine identity.
        for defect in previous['context']['defects']:
            defect['text'] = 'stale federal text' if defect['from'].startswith('federal-money/') else 'preserved historical text'
        self.write(name, previous)
        run = self.run_scoped('accountability')
        self.assertEqual(run.returncode, 0, run.stderr)
        after = self.read(name)
        fed = self.read('federal-money/data/federal.json')
        hub = self.read('federal-money/data/techhub.json')
        self.assertEqual(after['context']['background_rate'], sum(r['real'] for r in fed['naics'] if 2019 <= r['fy'] <= 2025) / 7)
        self.assertEqual(after['context']['background_years'], [2019, 2025])
        source_text = {'federal-money/data/techhub.json meta.note': hub['meta']['note'],
                       'federal-money/data/techhub.json meta.caution': hub['meta']['caution'],
                       'federal-money/data/federal.json meta.caution': fed['meta']['caution']}
        restored = copy.deepcopy(after)
        for current, old in zip(after['context']['defects'], previous['context']['defects']):
            self.assertEqual(current['from'], old['from'])
            self.assertEqual(current['text'], source_text.get(current['from'], old['text']))
        restored['context'] = previous['context']
        self.assertEqual(restored, previous)
        # Within context, only the named fields and federal disclosures may change.
        expected = copy.deepcopy(previous['context'])
        for key in ('techhub_award', 'background_rate', 'background_years', 'background_counties'):
            expected[key] = after['context'][key]
        for defect in expected['defects']:
            if defect['from'] in source_text:
                defect['text'] = source_text[defect['from']]
        self.assertEqual(after['context'], expected)

    def test_scope_mismatches_fail_without_writing(self):
        cases = [('accountability', lambda d: d['context']['defects'].pop(), 'source-disclosure identities'),
                 ('accountability', lambda d: d['context']['defects'][0].update(**{'from': d['context']['defects'][1]['from']}), 'source-disclosure identities'),
                 ('scorecard', lambda d: d['counts'].update(rows=d['counts']['rows'] + 1), 'scorecard counts'),
                 ('scorecard', lambda d: next(r for r in d['rows'] if r['id'] == 'd-federal').update(group='B'), 'context classification')]
        for page, mutate, message in cases:
            with self.subTest(page=page, mismatch=message):
                name = f'{page}/data/{page}.json'
                original = (ROOT / name).read_bytes()
                doc = json.loads(original)
                mutate(doc)
                self.write(name, doc)
                before = (self.root / name).read_bytes()
                run = self.run_scoped(page)
                self.assertNotEqual(run.returncode, 0)
                self.assertIn(message, run.stderr)
                self.assertEqual((self.root / name).read_bytes(), before)
                (self.root / name).write_bytes(original)


if __name__ == '__main__':
    unittest.main()
