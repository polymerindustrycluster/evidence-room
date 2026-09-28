"""Derive the health story's annual jobs/workplaces comparison from held QCEW files.

No network calls. Invoked by derive_health.py --workplaces-only --source-dir PATH.
Writes only data/workplaces.json; the full health rebuild remains separate.
"""
import argparse
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
YEARS = list(range(2015, 2026))
NEIGHBORS = {'18000': 'Indiana', '21000': 'Kentucky', '26000': 'Michigan',
             '42000': 'Pennsylvania', '54000': 'West Virginia'}


def cells_by_key(rows, areas, industry, peer=False):
    found = {}
    for r in rows:
        if r['area'] not in areas or r['naics'] != industry or r['year'] not in YEARS:
            continue
        # Legacy peer rows omit ownership after fetch_peers.py filters own_code=5.
        # If a later extract carries a code, it must not contradict that scope.
        if peer and any(str(r[k]) != '5' for k in ('own', 'own_code', 'ownership') if k in r):
            raise ValueError(f'Peer ownership is not private: {r["area"]} {r["year"]}')
        if not peer and r['own'] != '5':
            continue
        key = (r['area'], r['year'])
        if key in found:
            raise ValueError(f'Duplicate annual cell: {key} {industry}')
        if (r.get('suppressed') if peer else r['disclosure']) or r['emp'] is None or r['estabs'] is None:
            raise ValueError(f'Undisclosed annual cell: {key} {industry}')
        if r['emp'] <= 0 or r['estabs'] <= 0:
            raise ValueError(f'Nonpositive value requires adjudication: {key}')
        found[key] = {'area': r['area'], 'year': r['year'],
                      'jobs': r['emp'], 'establishments': r['estabs']}
    expected = {(a, y) for a in areas for y in YEARS}
    if set(found) != expected:
        raise ValueError(f'Missing annual cells: {sorted(expected - set(found))}')
    return found


def series(cells):
    return [{'year': y, **{k: sum(r[k] for r in cells.values() if r['year'] == y)
                           for k in ('jobs', 'establishments')}} for y in YEARS]


def change(rows, start, end):
    a, b = (next(r for r in rows if r['year'] == y) for y in (start, end))
    return {'start': start, 'end': end,
            **{k + '_pct': round((b[k] / a[k] - 1) * 100, 6)
               for k in ('jobs', 'establishments')},
            'jobs_per_establishment_pct': round((b['jobs'] / b['establishments']) /
                                                (a['jobs'] / a['establishments']) * 100 - 100, 6)}


def build(source_dir):
    raw = json.loads((source_dir / 'qcew.json').read_text(encoding='utf-8'))
    peers = json.loads((source_dir / 'peers.json').read_text(encoding='utf-8'))
    if not peers.get('meta', {}).get('row', '').startswith(
            'one (year, area, NAICS) annual-average cell, private ownership.'):
        raise ValueError('Peer extract must declare its legacy private ownership scope')
    wages = json.loads((HERE.parent / 'wages/data/wages.json').read_text(encoding='utf-8'))
    names = wages['meta']['footprint']['counties']
    areas = {r['area']: r['area_name'] for r in raw if r['area_name'] in names}
    if len(areas) != 12 or set(areas.values()) != set(names):
        raise ValueError('PIC-12 footprint cannot be resolved exactly')
    local = cells_by_key(raw, areas, '326')
    groups = [{'name': 'PIC-12', 'naics': '326', 'series': series(local)}]
    for area, name in [('39000', 'Ohio'), ('US000', 'United States')]:
        groups.append({'name': name, 'naics': '326',
                       'series': series(cells_by_key(raw, [area], '326'))})
    for area, name in NEIGHBORS.items():
        groups.append({'name': name, 'naics': '326',
                       'series': series(cells_by_key(peers['rows'], [area], '326', True))})
    groups.append({'name': 'PIC-12 manufacturing', 'naics': '31-33',
                   'series': series(cells_by_key(raw, areas, '31-33'))})
    for g in groups:
        g['windows'] = [change(g['series'], a, b)
                        for a, b in [(2022, 2025), (2015, 2025), (2019, 2025),
                                     (2022, 2024), (2023, 2025), (2024, 2025)]]
    county = []
    for area, name in areas.items():
        a, b = local[area, 2022], local[area, 2025]
        county.append({'area': area, 'name': name, 'jobs_2022': a['jobs'],
                       'jobs_2025': b['jobs'], 'jobs_change': b['jobs'] - a['jobs'],
                       'establishments_2022': a['establishments'],
                       'establishments_2025': b['establishments'],
                       'establishments_change': b['establishments'] - a['establishments']})
    # Compare independently held by-area and by-industry extracts on identical keys.
    overlap = cells_by_key(peers['rows'], list(areas) + ['39000', 'US000'], '326', True)
    primary = cells_by_key(raw, list(areas) + ['39000', 'US000'], '326')
    differences = [{'area': a, 'year': y, 'measure': k, 'by_area': primary[a, y][k],
                    'by_industry': overlap[a, y][k]}
                   for a, y in primary for k in ('jobs', 'establishments')
                   if primary[a, y][k] != overlap[a, y][k]]
    if differences:
        raise ValueError(f'By-area and by-industry extracts disagree: {differences}')
    # Health's inherited wages series must agree cell-for-cell before the new view joins it.
    wage_lookup = {(r['area'], r['year']): r['emp'] for r in wages['trend']
                   if r['naics'] == '326' and r['area'] in areas}
    if any(wage_lookup.get(key) != row['jobs'] for key, row in local.items()):
        raise ValueError('Held QCEW employment differs from the published wages source')
    return {
        'meta': {'source': 'BLS QCEW annual-average files; held by-area and by-industry extracts',
                 'row': 'One private-ownership (own=5), NAICS 326 area-year; manufacturing benchmark NAICS 31–33 separately.',
                 'method': 'Annual-average jobs and establishments. Establishments are rounded averages of quarterly counts, not unique businesses or a panel of the same sites.',
                 'limitations': 'Repeated aggregate observations cannot identify changes within surviving plants, productivity, automation, or labor shortages. State comparators are larger geographies; Ohio and the US include PIC-12.',
                 'fetched': peers['meta']['fetched'],
                 'footprint': wages['meta']['footprint']},
        'years': YEARS, 'base_year': 2022, 'ownership': '5', 'naics': '326',
        'groups': groups, 'counties': sorted(county, key=lambda r: r['jobs_change']),
        'source_cells': list(local.values()),
        'receipts': [{'file': name, 'sha256': hashlib.sha256((source_dir / name).read_bytes()).hexdigest()}
                     for name in ['qcew.json', 'peers.json']],
        'vintage_check': {'compared_cells': len(primary), 'differences': differences,
                          'note': 'Agreement between two held extracts is not a fresh upstream revision audit. By-area cache has no fetch timestamp; by-industry timestamp is from its metadata.'},
        'annual_evidence': {'url': 'https://www.bls.gov/cew/downloadable-data-files.htm',
                            'rule': 'BLS provides annual averages only for entire years.',
                            'bulletin': 'https://www.bls.gov/cew/notices/',
                            'bulletin_2025_release': '2026-08-28'},
        'peer_selection': 'All five states bordering Ohio, selected geographically before inspecting changes. Stable state boundaries avoid the metro-definition break. These are context comparators, not matched industrial twins.',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('--source-dir', required=True, type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = build(args.source_dir)
    out = HERE / 'data/workplaces.json'
    if args.check:
        if json.loads(out.read_text(encoding='utf-8')) != data:
            raise SystemExit('FAIL: workplaces.json differs from held-source derivation')
        print('PASS: workplaces.json exactly matches held-source derivation')
    else:
        out.write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
        print('WROTE', out)
    for group in data['groups']:
        print(group['name'], group['windows'][0])
    print('VINTAGE', data['vintage_check'])


if __name__ == '__main__':
    main()
