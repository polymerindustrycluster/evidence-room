"""Sync the CPI dependency without rebuilding the frozen nominal price series."""
import argparse
import copy
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def synchronized(scissors, federal):
    observations = federal['cpi_observations']
    rows = observations['rows']
    values = {str(row['year']): row['cpi'] for row in rows}
    if len(rows) != 7 or set(values) != {str(y) for y in range(2019, 2026)}:
        raise ValueError('Review the CPI observation coverage before updating this recipe')
    for row in rows:
        value = row['cpi']
        expected = {f'M{m:02}' for m in range(1, 13)}
        if row['year'] == 2025:
            expected.remove('M10')
        if (type(value) not in (int, float) or not math.isfinite(value) or value <= 0
                or federal['cpi'][str(row['year'])] != value
                or set(row['periods']) != expected
                or len(row['periods']) != len(expected) or row['months'] != len(expected)):
            raise ValueError('CPI values or published-month coverage disagree with the source')
    result = copy.deepcopy(scissors)
    caution = ('Annual CPI is a coarse approximation for monthly price indexes rebased to '
               'January 2019: the denominator is the 2019 annual average, not January CPI. '
               'The 2025 value averages eleven published months; October is unavailable. '
               'There is no 2026 observation here, so 2026 months carry the 2025 factor. '
               'The direction of the resulting error is unknown; these estimates are '
               'neither upper nor lower bounds on real gains or retracement.')
    result['deflator'] = {
        'index': 'CPI-U, all items, U.S. city average; annual means of published months',
        'source': "BLS observations shipped in federal-money/data/federal.json, cpi_observations",
        'base_year': '2019', 'latest_year': '2025',
        'purpose': scissors['deflator']['purpose'],
        'caution': caution, 'values': values, 'observations': copy.deepcopy(observations)}
    factor = values['2025'] / values['2019']
    product = next(s for s in scissors['series'] if s['label'] == 'PPI: plastics and rubber products manufacturing')
    resin = next(s for s in scissors['series'] if s['label'] == 'PPI: plastics material and resin manufacturing')
    result['meta']['nominal'] = (
        'Every plotted price is nominal, indexed to January 2019 without adjustment for '
        'general inflation. The real-terms paragraph uses a separate annual-CPI approximation: '
        f'the 2025 published-month mean is {100 * (factor - 1):.1f}% above the 2019 annual average. '
        f'Under this approximation, finished products are up about {product["now"]["index"] / factor - 100:.0f}% '
        f'rather than {product["now"]["index"] - 100:.0f}%, and resin reads '
        f'{resin["now"]["index"] / factor:.0f} against {resin["now"]["index"]:.0f} in cash. '
        'The claims recompute the real peak month and the ordering: feedstock still leads '
        'resin, then product at the stage level, while resin manufacturing passes crude '
        'within that ordering. The charts stay nominal because their retracement and '
        'gap measures are defined on the nominal series. ' + caution +
        ' The complete observation table and division inputs ship under deflator.')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--write', action='store_true')
    args = parser.parse_args()
    target = ROOT / 'cost-scissors/data/scissors.json'
    current = json.loads(target.read_text(encoding='utf-8'))
    federal = json.loads((ROOT / 'federal-money/data/federal.json').read_text(encoding='utf-8'))
    expected = synchronized(current, federal)
    if args.check:
        if current != expected:
            raise SystemExit('FAIL: cost-scissors CPI dependency or explanation is stale; run --write')
        print('PASS: cost-scissors CPI values, observation provenance and explanation equal upstream')
    else:
        target.write_text(json.dumps(expected, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print('Synced CPI dependency; nominal series and unrelated metadata preserved')


if __name__ == '__main__':
    main()
