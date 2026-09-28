import unittest
import io
import zipfile
import hashlib
import json
import tempfile
import subprocess
import sys
import csv
import importlib.util
from unittest.mock import patch
from footprints import PIC12
from pathlib import Path
from derive_realwage import derive, derive_from_files
from geography_checks import (QCEW_ADOPTION_URL, STATE_FIPS, assert_boundary_match,
                              assert_state_universe, join_status, qcew_boundary_metadata, to_cbsa)


class GeographySourceChecks(unittest.TestCase):
    def test_fetcher_import_has_no_acquisition_or_cli_side_effect(self):
        spec = importlib.util.spec_from_file_location('fetch_peers_import_check', Path(__file__).with_name('fetch_peers.py'))
        module = importlib.util.module_from_spec(spec)
        with patch('urllib.request.urlopen', side_effect=AssertionError('Import attempted acquisition')):
            spec.loader.exec_module(module)
        self.assertTrue(callable(module.main))

    def test_annotation_cli_preserves_parent_rows_and_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = {'meta': {'cross_year': 2024}, 'titles': {'C1042': 'Akron'},
                      'rows': [{'area': 'C1042', 'year': 2024, 'wage': 1291}]}
            raw = json.dumps(source).encode()
            (root/'parent.json').write_bytes(raw)
            notice = (QCEW_ADOPTION_URL + ' announced in July 2023 first quarter 2024 '
                      'omb-bulletin-23-01-revised-delineations').encode()
            (root/'notice.txt').write_bytes(notice)
            command = [sys.executable, '-B', str(Path(__file__).with_name('fetch_peers.py')),
                       '--boundary-notice', str(root/'notice.txt'), '--annotate-existing',
                       str(root/'parent.json'), '--output', str(root/'annotated.json')]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            output = json.loads((root/'annotated.json').read_bytes())
            self.assertEqual(output['rows'], source['rows'])
            self.assertEqual(output['titles'], source['titles'])
            self.assertEqual(output['meta']['metro_boundary_vintages'], qcew_boundary_metadata(notice))
            self.assertEqual(output['meta']['boundary_annotation_parent_sha256'], hashlib.sha256(raw).hexdigest())
            self.assertEqual((root/'parent.json').read_bytes(), raw)
            before = (root/'annotated.json').read_bytes()
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual((root/'annotated.json').read_bytes(), before)

    def test_producer_rejects_wrong_year_boundary_and_source_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            notice = (QCEW_ADOPTION_URL + '\nNew definitions announced in July 2023; '
                      'begin tabulating first quarter 2024. omb-bulletin-23-01-revised-delineations').encode()
            (root/'notice.txt').write_bytes(notice)
            source = {'meta': {'cross_year': 2024, 'metro_boundary_vintages': qcew_boundary_metadata(notice)},
                      'titles': {'C1042': 'Akron'},
                      'rows': [{'year': 2024, 'naics': '326', 'area': 'C1042',
                                'wage': 1291, 'emp': 6910, 'estabs': 117, 'suppressed': False}]}
            raw = json.dumps(source).encode()
            (root/'peers.json').write_bytes(raw)
            (root/'rpp.csv').write_text('GeoFIPS,GeoName,LineCode,2024\n10420,Akron Metropolitan Statistical Area,1,93.370\n')
            (root/'foot.html').write_text('Metropolitan Areas are defined (geographically delineated) by the Office of Management and Budget (OMB) bulletin no. 23-01 issued July 21, 2023.')
            def file_record(path):
                content = path.read_bytes()
                return {'sha256': hashlib.sha256(content).hexdigest(), 'bytes': len(content)}
            price_receipt = {'source_url': 'https://apps.bea.gov/regional/zip/MARPP.zip',
                             'comparison_year': 2024, 'boundary_vintage': 'OMB23-01',
                             'files': {'rpp.csv': file_record(root/'rpp.csv'),
                                       'MARPP__Footnotes.html': file_record(root/'foot.html')}}
            (root/'rpp-receipt.json').write_text(json.dumps(price_receipt))
            with (root/'counties.csv').open('w', newline='') as stream:
                writer = csv.writer(stream)
                writer.writerow(['CBSA Code', 'CBSA Title', 'Metropolitan/Micropolitan Statistical Area', 'FIPS State Code', 'FIPS County Code'])
                for county in PIC12:
                    if county in ('39133', '39153'): area, name = '10420', 'Akron'
                    elif county == '39151': area, name = '15940', 'Canton-Massillon'
                    elif county in ('39099', '39155'): area, name = '49660', 'Youngstown-Warren'
                    elif county == '39169': area, name = '49300', 'Wooster'
                    else: area, name = '17410', 'Cleveland'
                    kind = 'Micropolitan Statistical Area' if area == '49300' else 'Metropolitan Statistical Area'
                    writer.writerow([area, name, kind, county[:2], county[2:]])
                writer.writerow(['15940', 'Canton-Massillon', 'Metropolitan Statistical Area', '39', '019'])
            complete = {'10420': ['39133', '39153'], '15940': ['39019', '39151'],
                        '17410': ['39007', '39035', '39055', '39085', '39093', '39103'],
                        '49300': ['39169'], '49660': ['39099', '39155']}
            county_receipt = dict(file_record(root/'counties.csv'), boundary_vintage='OMB23-01', cbsa_counties=complete)
            (root/'counties-receipt.json').write_text(json.dumps(county_receipt))
            receipt = {'input_sha256': hashlib.sha256(raw).hexdigest(), 'year': 2024,
                       'boundary_vintage': 'OMB23-01', 'adoption_notice': {
                           'url': 'https://www.bls.gov/cew/notices/2024/new-metropolitan-statistical-area-delineations-for-2024.htm',
                           'sha256': hashlib.sha256(notice).hexdigest(), 'bytes': len(notice)}}
            def produce(current):
                (root/'receipt.json').write_text(json.dumps(current))
                return derive_from_files(root/'peers.json', root/'receipt.json',
                                         price_csv=root/'rpp.csv', footnotes=root/'foot.html',
                                         notice_path=root/'notice.txt', rpp_receipt_path=root/'rpp-receipt.json',
                                         county_path=root/'counties.csv', county_receipt_path=root/'counties-receipt.json')
            self.assertEqual(produce(receipt)['coverage']['matched'], 1)
            original_counties = (root/'counties.csv').read_bytes()
            reader = csv.DictReader(io.StringIO(original_counties.decode()))
            buffer = io.StringIO()
            writer = csv.DictWriter(buffer, fieldnames=reader.fieldnames)
            writer.writeheader()
            writer.writerows(row for row in reader if row['FIPS State Code'] + row['FIPS County Code'] != '39019')
            (root/'counties.csv').write_bytes(buffer.getvalue().encode())
            # Refreshing a truncated file's byte receipt must not bless incomplete
            # membership: the independent source roster still includes Carroll.
            truncated_receipt = dict(county_receipt, **file_record(root/'counties.csv'))
            (root/'counties-receipt.json').write_text(json.dumps(truncated_receipt))
            with self.subTest(omitted_external_county='39019'), self.assertRaisesRegex(ValueError, 'complete CBSA membership'):
                produce(receipt)
            (root/'counties.csv').write_bytes(original_counties)
            (root/'counties-receipt.json').write_text(json.dumps(county_receipt))
            for path in (root/'rpp.csv', root/'foot.html', root/'counties.csv'):
                content = path.read_bytes()
                path.write_bytes(content + b'\n')
                with self.subTest(path=path.name), self.assertRaisesRegex(ValueError, 'bytes do not match'):
                    produce(receipt)
                path.write_bytes(content)
            original_foot = (root/'foot.html').read_text()
            (root/'foot.html').write_text(original_foot.replace('23-01', '18-04').replace('July 21, 2023', 'September 14, 2018'))
            old_prices = dict(price_receipt, boundary_vintage='OMB18-04', files={
                **price_receipt['files'], 'MARPP__Footnotes.html': file_record(root/'foot.html')})
            (root/'rpp-receipt.json').write_text(json.dumps(old_prices))
            with self.assertRaisesRegex(ValueError, 'boundary_vintage_mismatch'):
                produce(receipt)
            (root/'foot.html').write_text(original_foot)
            (root/'rpp-receipt.json').write_text(json.dumps(price_receipt))
            for changes, message in (({'boundary_vintage': 'OMB18-04'}, 'boundary_vintage_mismatch'),
                                     ({'year': 2023}, 'comparison year'),
                                     ({'input_sha256': 'wrong-cache'}, 'source bytes')):
                with self.subTest(changes=changes), self.assertRaisesRegex(ValueError, message):
                    produce(dict(receipt, **changes))
            with self.assertRaisesRegex(ValueError, 'notice bytes'):
                produce(dict(receipt, adoption_notice=dict(receipt['adoption_notice'], sha256='fixture-notice')))
            (root/'notice.txt').write_bytes(notice + b' changed')
            with self.assertRaisesRegex(ValueError, 'notice bytes'):
                produce(receipt)
            (root/'notice.txt').write_bytes(notice)
            source['meta']['metro_boundary_vintages']['2024']['vintage'] = 'OMB18-04'
            raw = json.dumps(source).encode()
            (root/'peers.json').write_bytes(raw)
            with self.assertRaisesRegex(ValueError, 'boundary provenance'):
                produce(dict(receipt, input_sha256=hashlib.sha256(raw).hexdigest(), boundary_vintage='OMB18-04'))
            source['meta']['metro_boundary_vintages'] = qcew_boundary_metadata(notice)
            source['meta']['cross_year'] = 2023
            raw = json.dumps(source).encode()
            (root/'peers.json').write_bytes(raw)
            with self.assertRaisesRegex(ValueError, 'comparison year'):
                produce(dict(receipt, input_sha256=hashlib.sha256(raw).hexdigest()))

    def test_notice_hash_cannot_establish_adoption_from_unrelated_text(self):
        with self.assertRaisesRegex(ValueError, 'does not establish'):
            qcew_boundary_metadata(b'Unrelated BLS page, even if its real hash is recorded')
        notice = (QCEW_ADOPTION_URL + ' announced in July 2023 first quarter 2024 '
                  'omb-bulletin-23-01-revised-delineations').encode()
        self.assertEqual(set(qcew_boundary_metadata(notice)), {'2024'})

    def test_unverified_price_archive_fails_before_a_join(self):
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, 'w') as z:
            z.writestr('MARPP__Footnotes.html', 'Metropolitan boundaries not recorded')
            z.writestr('MARPP_MSA_2024.csv', 'placeholder')
        archive.seek(0)
        with self.assertRaisesRegex(ValueError, 'Unverified BEA'):
            derive({'rows': []}, archive)

    def test_cleveland_disclosed_but_old_code_is_not_suppression(self):
        wage = {'area': 'C1746', 'wage': 1149, 'emp': 7550, 'suppressed': False}
        with self.assertRaisesRegex(ValueError, 'boundary_vintage_mismatch'):
            assert_boundary_match('OMB2018', 'OMB2023')
        self.assertEqual(join_status(wage, {'17410': 95}), 'price_row_absent')
        self.assertEqual(join_status(None, {}), 'source_row_absent')
        self.assertEqual(join_status(dict(wage, suppressed=True), {}), 'source_suppressed')

    def test_same_code_does_not_prove_same_boundaries(self):
        wage = {'area': 'C1042', 'wage': 1238, 'emp': 6930, 'suppressed': False}
        with self.assertRaisesRegex(ValueError, 'boundary_vintage_mismatch'):
            assert_boundary_match(None, None)
        assert_boundary_match('OMB2023', 'OMB2023')
        self.assertEqual(join_status(wage, {'10420': 92.924}), 'matched')
        with self.assertRaises(ValueError):
            to_cbsa('C10420')

    def test_51_rows_cannot_identify_the_51st_geography(self):
        states = [f + '000' for f in STATE_FIPS]
        assert_state_universe(states + ['72000'])
        with self.assertRaises(ValueError):
            assert_state_universe(states + ['11000'])
        with self.assertRaises(ValueError):
            assert_state_universe(states + ['39000'])


if __name__ == '__main__':
    unittest.main()
