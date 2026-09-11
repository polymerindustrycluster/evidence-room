"""The dependency repair rejects stale CPI and preserves the nominal snapshot."""
import copy
import json
from pathlib import Path
import unittest

from sync_scissors_deflator import synchronized

ROOT = Path(__file__).resolve().parents[2]


class ScissorsDeflatorTest(unittest.TestCase):
    def setUp(self):
        self.current = json.loads((ROOT / 'cost-scissors/data/scissors.json').read_text(encoding='utf-8'))
        self.federal = json.loads((ROOT / 'federal-money/data/federal.json').read_text(encoding='utf-8'))

    def test_stale_copy_is_detected_and_only_dependency_changes(self):
        self.assertEqual(self.current, synchronized(self.current, self.federal))
        stale = copy.deepcopy(self.current)
        stale['deflator']['values']['2025'] = 322.132
        stale['meta']['nominal'] = 'Every real figure is an upper bound.'
        stale['meta']['sentinel'] = 'Preserve unrelated corrections'
        before = copy.deepcopy(stale)
        expected = synchronized(stale, self.federal)
        self.assertNotEqual(stale, expected)
        self.assertEqual(stale, before)
        self.assertEqual(expected['deflator']['values']['2025'], 321.943)
        self.assertEqual(expected['deflator']['observations'], self.federal['cpi_observations'])
        for key in stale:
            if key not in ('meta', 'deflator'):
                self.assertEqual(expected[key], stale[key])
        self.assertEqual({k: v for k, v in expected['meta'].items() if k != 'nominal'},
                         {k: v for k, v in stale['meta'].items() if k != 'nominal'})
        self.assertEqual(synchronized(expected, self.federal), expected)

    def test_inconsistent_source_and_missing_month_fail_closed(self):
        bad = copy.deepcopy(self.federal)
        bad['cpi']['2025'] = 322.132
        with self.assertRaises(ValueError):
            synchronized(self.current, bad)
        bad = copy.deepcopy(self.federal)
        bad['cpi_observations']['rows'][-1]['periods'].append('M10')
        with self.assertRaises(ValueError):
            synchronized(self.current, bad)


if __name__ == '__main__':
    unittest.main()
