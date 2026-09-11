"""Source-level guards: identifiers and geography precede joins and interpretation."""
import re
import hashlib
import json
import csv
import html
import io
from footprints import PIC12


def check_receipt_bytes(content, record, label):
    if record.get('sha256') != hashlib.sha256(content).hexdigest() or record.get('bytes') != len(content):
        raise ValueError(f'{label} bytes do not match the receipt')


def bea_boundary(footnotes):
    text = html.unescape(re.sub(r'<[^>]+>', ' ', footnotes.decode('utf-8-sig')))
    text = ' '.join(text.split())
    matches = re.findall(r'Metropolitan Areas are defined \(geographically delineated\) by the Office of Management and Budget \(OMB\) bulletin no\. (\d{2}-\d{2}) issued ([A-Za-z]+ \d{1,2}, \d{4})\.', text)
    if len(matches) != 1:
        raise ValueError('Unverified BEA defining statement: expected one metropolitan boundary declaration')
    bulletin, issued = matches[0]
    return {'vintage': 'OMB'+bulletin, 'issued': issued}


def pic12_cbsa_membership(county_bytes, receipt):
    """Read the held Census county rows for the CBSAs intersecting canonical PIC-12."""
    check_receipt_bytes(county_bytes, receipt, 'Census county delineation')
    rows = list(csv.DictReader(io.StringIO(county_bytes.decode('utf-8-sig'))))
    areas, counties = {}, set()
    for row in rows:
        county = row['FIPS State Code'] + row['FIPS County Code']
        area = row['CBSA Code']
        kind = row['Metropolitan/Micropolitan Statistical Area']
        if not re.fullmatch(r'\d{5}', county) or county in counties:
            raise ValueError('Invalid or duplicated Census county identity')
        if not re.fullmatch(r'\d{5}', area) or kind not in ('Metropolitan Statistical Area', 'Micropolitan Statistical Area'):
            raise ValueError('Invalid Census CBSA identity or type')
        counties.add(county)
        group = areas.setdefault(area, {'area': area, 'name': row['CBSA Title'], 'kind': kind,
                                        'counties': [], 'pic12_counties': []})
        if (group['name'], group['kind']) != (row['CBSA Title'], kind):
            raise ValueError('Contradictory Census CBSA description')
        group['counties'].append(county)
        if county in PIC12:
            group['pic12_counties'].append(county)
    if counties & set(PIC12) != set(PIC12) or any(not a['pic12_counties'] for a in areas.values()):
        raise ValueError('Census extract must cover every PIC-12 county and only intersecting CBSAs')
    actual = {area: sorted(group['counties']) for area, group in areas.items()}
    if actual != receipt.get('cbsa_counties'):
        raise ValueError('Census extract lacks complete CBSA membership from the source receipt')
    return areas

QCEW_ADOPTION_URL = 'https://www.bls.gov/cew/notices/2024/new-metropolitan-statistical-area-delineations-for-2024.htm'


def qcew_boundary_metadata(notice_bytes):
    """Document only the verified 2024 scope; other years need their own evidence."""
    text = notice_bytes.decode('utf-8-sig')
    if text.lstrip().startswith('{'):
        text = json.loads(text).get('result', '')
    anchors = (QCEW_ADOPTION_URL, 'announced in July 2023', 'first quarter 2024',
               'omb-bulletin-23-01-revised-delineations')
    if not isinstance(text, str) or not all(part in text for part in anchors):
        raise ValueError('Held BLS notice does not establish the 2024 adoption of OMB23-01')
    return {'2024': {'vintage': 'OMB23-01', 'notice_url': QCEW_ADOPTION_URL,
                     'notice_sha256': hashlib.sha256(notice_bytes).hexdigest()}}


def assert_boundary_match(wage_vintage, price_vintage):
    """A dataset-level mismatch aborts before row-level disclosure accounting."""
    if not wage_vintage or wage_vintage != price_vintage:
        raise ValueError('QCEW/BEA boundary_vintage_mismatch')

STATE_FIPS = set('01 02 04 05 06 08 09 10 12 13 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 44 45 46 47 48 49 50 51 53 54 55 56'.split())


def assert_state_universe(ids):
    expected = {f + '000' for f in STATE_FIPS | {'72'}}
    if len(ids) != len(set(ids)) or set(ids) != expected:
        raise ValueError(f'State universe mismatch: missing {sorted(expected-set(ids))}; unexpected {sorted(set(ids)-expected)}')


def to_cbsa(area):
    if not re.fullmatch(r'C\d{4}', area):
        raise ValueError(f'Invalid QCEW metro identifier: {area!r}')
    return area[1:] + '0'


def join_status(wage, prices):
    """An absent join is never evidence that BLS suppressed a wage."""
    if wage is None:
        return 'source_row_absent'
    if wage.get('suppressed'):
        return 'source_suppressed'
    if not wage.get('wage') or not wage.get('emp'):
        return 'source_value_missing'
    area = to_cbsa(wage['area'])
    if area not in prices or not prices[area]:
        return 'price_row_absent'
    return 'matched'
