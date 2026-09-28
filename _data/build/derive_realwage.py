"""Compare 2024 wages and prices on OMB bulletin 23-01 metro boundaries.

Download https://apps.bea.gov/regional/zip/MARPP.zip into private custody and pass
--rpp-zip, --peers (held fetch_peers.py output), and its --qcew-receipt.
No live calls on derivation.
"""
import argparse
import collections
import csv
import hashlib
import io
import json
from pathlib import Path
import zipfile
from geography_checks import (assert_boundary_match, bea_boundary, check_receipt_bytes,
                              join_status, pic12_cbsa_membership, qcew_boundary_metadata, to_cbsa)

YEAR = 2024
ROOT = Path(__file__).resolve().parents[2]


def derive(peers, archive=None, price_csv=None, footnotes=None, qcew_receipt=None, peers_sha256=None,
           notice_bytes=None, rpp_receipt=None, county_bytes=None, county_receipt=None):
    if archive is not None:
        archive_bytes = Path(archive).read_bytes() if isinstance(archive, (str, Path)) else archive.getvalue()
        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as z:
            foot_bytes = z.read('MARPP__Footnotes.html')
            files = [n for n in z.namelist() if n.startswith('MARPP_MSA_') and n.endswith('.csv')]
            if len(files) != 1:
                raise ValueError('Expected one MARPP metro table')
            csv_bytes = z.read(files[0])
            csv_name = Path(files[0]).name
    else:
        if price_csv is None or footnotes is None:
            raise ValueError('Provide the BEA CSV together with its boundary footnotes')
        foot_bytes = Path(footnotes).read_bytes()
        csv_bytes = Path(price_csv).read_bytes()
        csv_name = Path(price_csv).name
    price_boundary = bea_boundary(foot_bytes)
    price_vintage = price_boundary['vintage']
    price_receipt = rpp_receipt or {}
    if price_receipt.get('source_url') != 'https://apps.bea.gov/regional/zip/MARPP.zip' or price_receipt.get('comparison_year') != YEAR:
        raise ValueError('BEA receipt lacks the official archive and comparison year')
    for name, content in ((csv_name, csv_bytes), ('MARPP__Footnotes.html', foot_bytes)):
        check_receipt_bytes(content, price_receipt.get('files', {}).get(name, {}), 'BEA '+name)
    if archive is not None:
        check_receipt_bytes(archive_bytes, {'sha256': price_receipt.get('archive_sha256'),
                                         'bytes': price_receipt.get('archive_bytes')}, 'BEA archive')
    assert_boundary_match(price_receipt.get('boundary_vintage'), price_vintage)
    if county_bytes is None or county_receipt is None:
        raise ValueError('Census county delineation and receipt are required')
    local_areas = pic12_cbsa_membership(county_bytes, county_receipt)
    assert_boundary_match(county_receipt.get('boundary_vintage'), price_vintage)
    home_ids = {a for a, row in local_areas.items() if row['kind'] == 'Metropolitan Statistical Area'}
    receipt = qcew_receipt or {}
    if not peers_sha256 or receipt.get('input_sha256') != peers_sha256:
        raise ValueError('QCEW receipt does not identify the supplied source bytes')
    if receipt.get('year') != YEAR or peers.get('meta', {}).get('cross_year') != YEAR:
        raise ValueError('QCEW source and receipt must identify the comparison year')
    notice = receipt.get('adoption_notice', {})
    if notice_bytes is None or notice.get('sha256') != hashlib.sha256(notice_bytes).hexdigest() or notice.get('bytes') != len(notice_bytes):
        raise ValueError('QCEW adoption-notice bytes do not match the receipt')
    verified = qcew_boundary_metadata(notice_bytes)[str(YEAR)]
    extracted = peers['meta'].get('metro_boundary_vintages', {}).get(str(YEAR), {})
    if extracted != verified or notice.get('url') != verified['notice_url']:
        raise ValueError('QCEW extract boundary provenance disagrees with held adoption notice')
    wage_vintage = extracted['vintage']
    if receipt.get('boundary_vintage') != wage_vintage:
        raise ValueError('QCEW receipt boundary_vintage_mismatch with extract')
    parent = peers['meta'].get('boundary_annotation_parent_sha256')
    if parent != receipt.get('annotation_parent_sha256'):
        raise ValueError('QCEW boundary annotation parent mismatch')
    assert_boundary_match(wage_vintage, price_vintage)
    price_rows = list(csv.DictReader(io.StringIO(csv_bytes.decode('utf-8-sig')), skipinitialspace=True))
    prices, names, rent = {}, {}, {}
    for r in price_rows:
        if 'Metropolitan Statistical Area' not in (r.get('GeoName') or ''):
            continue
        if str(YEAR) not in r:
            raise ValueError('BEA table lacks the wage year')
        if r['LineCode'] not in ('1', '3'):
            continue
        try:
            value = float(r[str(YEAR)].replace(',', ''))
        except ValueError:
            continue
        area = r['GeoFIPS'].strip()
        target = prices if r['LineCode'] == '1' else rent
        if area in target:
            raise ValueError(f'Duplicate price record: {area}')
        target[area] = value
        names[area] = r['GeoName']
    wages = [r for r in peers['rows'] if r['year'] == YEAR and r['naics'] == '326' and r['area'].startswith('C')]
    if not wages or len({r['area'] for r in wages}) != len(wages):
        raise ValueError('Absent or duplicated QCEW metro cross-section')
    rows, exclusions = [], []
    for w in wages:
        to_cbsa(w['area'])  # validate identifiers even when the source withholds values
        status = join_status(w, prices)
        if status != 'matched':
            exclusions.append({'area': w['area'], 'name': peers['titles'].get(w['area'], w['area']), 'reason': status})
            continue
        a = to_cbsa(w['area'])
        rows.append({'area': a, 'qcew': w['area'], 'name': names[a], 'emp': w['emp'],
                     'estabs': w['estabs'], 'nominal': w['wage'], 'rpp': prices[a],
                     'rent': rent.get(a), 'real': round(w['wage'] * 100 / prices[a], 1),
                     'home': a in home_ids})
    if not any(r['area'] == '10420' for r in rows):
        raise ValueError('Akron absent from justified comparison')
    big = sorted([r for r in rows if r['emp'] >= 2000], key=lambda r: -r['emp'])
    for group, prefix in ((rows, ''), (big, 'big_')):
        for value in ('nominal', 'real'):
            for r in group:
                r[prefix+'rank_'+value] = 1 + sum(x[value] > r[value] for x in group)
        for r in group:
            r[prefix+'climb'] = r[prefix+'rank_nominal'] - r[prefix+'rank_real']
    counts = dict(collections.Counter(x['reason'] for x in exclusions))
    matched = {r['area']: r for r in rows}
    excluded = {to_cbsa(r['area']): r['reason'] for r in exclusions}
    local_coverage = []
    for area, membership in sorted(local_areas.items()):
        if area not in home_ids:
            status = 'not_metropolitan'
        elif area in matched:
            status = 'matched_displayed' if matched[area]['emp'] >= 2000 else 'matched_below_display_floor'
        else:
            status = excluded.get(area, 'source_row_absent')
        local_coverage.append({**membership, 'status': status})
    return {'meta': {
        'source': 'BLS QCEW 2024 NAICS 326 private metro average weekly wage; BEA Regional Price Parities 2024 (MARPP, all items)',
        'row': 'One row is one disclosed metro average weekly wage divided by its all-items regional price parity / 100.',
        'geography': 'Metro, not county: both sources use OMB bulletin 23-01, July 21, 2023. QCEW adopted it in 2024; the BEA archive declares it in its footnotes. No PIC-12 county aggregation is used.',
        'not': 'These are industry-average wages, not matched occupations, individual offers, a cost-of-living budget or a quality-of-life ranking.',
        'suppression': f"{len(rows)} matched metros; {counts.get('source_suppressed',0)} QCEW rows explicitly suppressed; {sum(v for k,v in counts.items() if k != 'source_suppressed')} other exclusions. Absence of a matched row is never treated as suppression. Ranks apply only to this disclosed matched sample.",
        'caution': 'Historical 2024 comparison. Detailed-industry QCEW metro publication ended beginning Q3 2025; the source is not a current recruiting-offer feed.',
        'year': YEAR, 'n_metros': len(rows), 'n_big': len(big), 'big_floor': 2000},
        'metros': rows, 'big': big, 'home': [r for r in rows if r['home']],
        'coverage': {'qcew_rows': len(wages), 'matched': len(rows), 'excluded_by_reason': counts,
                     'exclusions': exclusions, 'boundary_vintage': price_vintage,
                     'pic12_cbsa_dispositions': local_coverage,
                     'price_year': YEAR, 'wage_year': YEAR},
        'source_receipts': {'qcew_sha256': peers_sha256, 'qcew_boundary_receipt': receipt,
                            'rpp_receipt': price_receipt, 'census_county_receipt': county_receipt,
                            'rpp_csv_sha256': hashlib.sha256(csv_bytes).hexdigest(),
                            'rpp_footnote_sha256': hashlib.sha256(foot_bytes).hexdigest(),
                            'rpp_url': 'https://apps.bea.gov/regional/zip/MARPP.zip'}}


def derive_from_files(peers_path, receipt_path, archive=None, price_csv=None, footnotes=None, notice_path=None,
                      rpp_receipt_path=None, county_path=None, county_receipt_path=None):
    raw = Path(peers_path).read_bytes()
    return derive(json.loads(raw), archive, price_csv, footnotes,
                  json.loads(Path(receipt_path).read_text(encoding='utf-8')),
                  hashlib.sha256(raw).hexdigest(),
                  Path(notice_path).read_bytes() if notice_path is not None else None,
                  json.loads(Path(rpp_receipt_path).read_bytes()) if rpp_receipt_path else None,
                  Path(county_path).read_bytes() if county_path else None,
                  json.loads(Path(county_receipt_path).read_bytes()) if county_receipt_path else None)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--peers', required=True, type=Path)
    p.add_argument('--qcew-receipt', required=True, type=Path,
                   help='Hash-bound source-year and metro-boundary receipt with official BLS adoption evidence')
    p.add_argument('--qcew-adoption-notice', required=True, type=Path,
                   help='Retained notice bytes whose SHA-256 and adoption statement are verified')
    rpp = p.add_mutually_exclusive_group(required=True)
    rpp.add_argument('--rpp-zip', type=Path)
    rpp.add_argument('--rpp-csv', type=Path)
    p.add_argument('--rpp-footnotes', type=Path)
    p.add_argument('--rpp-receipt', required=True, type=Path)
    p.add_argument('--metro-counties', required=True, type=Path)
    p.add_argument('--metro-counties-receipt', required=True, type=Path)
    p.add_argument('--output', type=Path, default=ROOT/'realwage/data/realwage.json')
    args = p.parse_args()
    result = derive_from_files(args.peers, args.qcew_receipt, args.rpp_zip,
                               args.rpp_csv, args.rpp_footnotes, args.qcew_adoption_notice,
                               args.rpp_receipt, args.metro_counties, args.metro_counties_receipt)
    args.output.write_text(json.dumps(result, separators=(',', ':')), encoding='utf-8')
    print(json.dumps({'coverage': {k:v for k,v in result['coverage'].items() if k != 'exclusions'}, 'home': result['home']}, indent=2))
