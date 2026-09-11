"""Offline regressions for count-based ratios and the two-record Akron claim.

Run: python -B _data/build/test_programs_ratios.py
Only the two ratio assignments are extracted from the fetch producer's AST; importing
or running that producer would make live requests and is deliberately avoided.
"""
import ast
import copy
import json
import unittest
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / 'programs/data/viz-data.json').read_text(encoding='utf-8'))
CLAIMS = {c['id']: c for c in json.loads((ROOT / 'programs/claims.json').read_text(encoding='utf-8'))['claims']}
RATIOS = {'ratio_le10': 'le10_awards', 'ratio_both': 'both'}


def producer_ratios(polymer, control):
    tree = ast.parse((ROOT / '_data/build/fetch_ipeds_control_baserate.py').read_text(encoding='utf-8'))
    assignments = []
    for node in tree.body:
        if not isinstance(node, ast.Assign) or len(node.targets) != 1:
            continue
        target = node.targets[0]
        if (isinstance(target, ast.Subscript) and isinstance(target.value, ast.Name)
                and target.value.id == 'control' and isinstance(target.slice, ast.Constant)
                and target.slice.value in RATIOS):
            assignments.append(node)
    if len(assignments) != len(RATIOS):
        raise AssertionError('Expected exactly two ratio assignments; producer shape changed.')
    env = {'POLY': copy.deepcopy(polymer), 'control': copy.deepcopy(control), 'round': round}
    exec(compile(ast.Module(body=assignments, type_ignores=[]), '<ratio assignments>', 'exec'), {'__builtins__': {}}, env)
    return {key: env['control'][key] for key in RATIOS}


def expected_ratios(polymer, control):
    return {key: float(round(Fraction(polymer[count], polymer['ever']) /
                             Fraction(control[count], control['ever']), 2))
            for key, count in RATIOS.items()}


def claim_passes(name, data):
    return eval(CLAIMS[name]['assert'], {'D': data})


class ProgramsRatios(unittest.TestCase):
    def test_producer_uses_raw_counts_across_changed_denominators(self):
        polymer = DATA['base']
        control = DATA['layers']['control']['base']
        fixtures = [(polymer, control),
                    ({**polymer, 'ever': polymer['ever'] * 2}, control),
                    (polymer, {**control, 'ever': control['ever'] * 3}),
                    ({'ever': 9, 'le10_awards': 5, 'both': 2},
                     {'ever': 17, 'le10_awards': 4, 'both': 1})]
        for p, c in fixtures:
            with self.subTest(polymer=p['ever'], control=c['ever']):
                # Deliberately misleading display percentages must have no effect.
                p = {**p, 'le10_awards_pct': 99, 'both_pct': 99}
                c = {**c, 'le10_awards_pct': 1, 'both_pct': 1}
                self.assertEqual(producer_ratios(p, c), expected_ratios(p, c))

    def test_published_fields_match_counts_and_six_components(self):
        p, c = DATA['base'], DATA['layers']['control']['base']
        for key in ('ever', 'le10_awards', 'le5_years', 'both'):
            self.assertEqual(c[key], sum(v[key] for v in c['per_cip'].values()))
        self.assertEqual({key: c[key] for key in RATIOS}, expected_ratios(p, c))
        self.assertTrue(claim_passes('prog-base-rate-control', DATA))

    def test_old_rounded_percentages_are_rejected(self):
        mutant = copy.deepcopy(DATA)
        p, c = mutant['base'], mutant['layers']['control']['base']
        for key, count in RATIOS.items():
            c[key] = round(p[count + '_pct'] / c[count + '_pct'], 2)
        self.assertNotEqual({key: c[key] for key in RATIOS}, expected_ratios(p, c))
        self.assertFalse(claim_passes('prog-base-rate-control', mutant))

    def test_two_akron_records_cannot_be_three_with_the_same_sum(self):
        self.assertTrue(claim_passes('prog-ohio-never-took-off', DATA))
        mutant = copy.deepcopy(DATA)
        rows = mutant['ohio']['programs']
        akron = [r for r in rows if r['total_awards'] <= 10 and 'AKRON MAIN' in r['institution'].upper()]
        self.assertEqual(len(akron), 2)
        extra = next(r for r in rows if r['total_awards'] < 10 and 'AKRON MAIN' not in r['institution'].upper())
        extra['institution'] = 'University of Akron Main Campus'
        for row in akron + [extra]:
            row['total_awards'] = 3
        self.assertEqual(sum(r['total_awards'] for r in akron + [extra]), 9)
        self.assertEqual(sum(r['total_awards'] <= 10 for r in rows), 13)
        self.assertTrue(any(r['total_awards'] == 10 for r in rows))
        self.assertFalse(claim_passes('prog-ohio-never-took-off', mutant))


if __name__ == '__main__':
    unittest.main(verbosity=2)
