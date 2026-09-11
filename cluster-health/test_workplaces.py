"""Known-case guards for the annual employment comparison's completeness contract."""
import unittest
from pathlib import Path
from unittest.mock import patch
import derive_workplaces as dw
from derive_workplaces import YEARS, cells_by_key, change


class AnnualCells(unittest.TestCase):
    def setUp(self):
        self.rows = [{'area': '39035', 'year': y, 'naics': '326', 'own': '5',
                      'emp': 100, 'estabs': 10, 'disclosure': ''} for y in YEARS]

    def test_complete_annual_panel(self):
        self.assertEqual(len(cells_by_key(self.rows, ['39035'], '326')), 11)

    def test_missing_last_year_fails_instead_of_partial_sum(self):
        with self.assertRaisesRegex(ValueError, 'Missing annual'):
            cells_by_key(self.rows[:-1], ['39035'], '326')

    def test_withheld_zero_fails_instead_of_job_loss(self):
        self.rows[-1].update(emp=0, disclosure='N')
        with self.assertRaisesRegex(ValueError, 'Undisclosed'):
            cells_by_key(self.rows, ['39035'], '326')

    def test_duplicate_cannot_double_count(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            cells_by_key(self.rows + [self.rows[-1]], ['39035'], '326')

    def test_other_ownership_not_added(self):
        extra = dict(self.rows[-1], own='0', emp=10000)
        self.assertEqual(cells_by_key(self.rows + [extra], ['39035'], '326')['39035', 2025]['jobs'], 100)

    def test_ratio_is_not_job_change(self):
        result = change([{'year': 2022, 'jobs': 100, 'establishments': 10},
                         {'year': 2025, 'jobs': 90, 'establishments': 12}], 2022, 2025)
        self.assertEqual(result['jobs_pct'], -10)
        self.assertEqual(result['jobs_per_establishment_pct'], -25)

    def test_peer_nonprivate_ownership_cannot_replace_private_cell(self):
        self.rows[-1]['own'] = '0'
        with self.assertRaisesRegex(ValueError, 'ownership'):
            cells_by_key(self.rows, ['39035'], '326', peer=True)

    def test_peer_raw_ownership_code_is_also_checked(self):
        self.rows[-1]['own_code'] = '0'
        with self.assertRaisesRegex(ValueError, 'ownership'):
            cells_by_key(self.rows, ['39035'], '326', peer=True)


class ExtractAgreement(unittest.TestCase):
    def setUp(self):
        names = [f'County {i}' for i in range(12)]
        areas = [f'39{i:03}' for i in range(1,13)]
        self.raw = [dict(area=a, area_name=n, year=y, naics=industry, own='5',
                         emp=100, estabs=10, disclosure='')
                    for a,n in zip(areas,names) for y in YEARS for industry in ('326','31-33')]
        self.raw += [dict(area=a,area_name=a,year=y,naics='326',own='5',emp=100,estabs=10,disclosure='')
                     for a in ('39000','US000') for y in YEARS]
        self.peers = {'meta': {'row':'one (year, area, NAICS) annual-average cell, private ownership. `emp` counts JOBS covered by unemployment insurance.',
                              'fetched':'fixture'},
                      'rows':[dict(area=r['area'],year=r['year'],naics='326',emp=100,estabs=10,suppressed=False)
                              for r in self.raw if r['naics']=='326']}
        self.peers['rows'] += [dict(area=a,year=y,naics='326',emp=100,estabs=10,suppressed=False)
                               for a in dw.NEIGHBORS for y in YEARS]
        self.wages = {'meta':{'footprint':{'counties':names}}, 'trend':self.raw}

    def build_fixture(self):
        with patch.object(Path,'read_text',return_value=''), patch.object(Path,'read_bytes',return_value=b'fixture'), \
             patch.object(dw.json,'loads',side_effect=[self.raw,self.peers,self.wages]):
            return dw.build(Path('.'))

    def test_legacy_private_scope_without_row_ownership_is_supported(self):
        self.assertEqual(self.build_fixture()['vintage_check']['differences'], [])

    def test_both_measures_must_agree_before_output_is_returned(self):
        for measure in ('emp','estabs'):
            with self.subTest(measure=measure):
                self.peers['rows'][0][measure] += 1
                with self.assertRaisesRegex(ValueError, 'extracts disagree'):
                    self.build_fixture()
                self.peers['rows'][0][measure] -= 1

    def test_missing_or_nonprivate_scope_is_rejected(self):
        for scope in ('', 'one (year, area, NAICS) annual-average cell, all ownership.'):
            with self.subTest(scope=scope):
                self.peers['meta']['row'] = scope
                with self.assertRaisesRegex(ValueError, 'private ownership'):
                    self.build_fixture()


if __name__ == '__main__':
    unittest.main()
