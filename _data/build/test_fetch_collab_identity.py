"""Offline regressions for the PI-transfer test in fetch_collab.py.

Run: python3 -B -m unittest _data/build/test_fetch_collab_identity.py
Only the identity functions are extracted from the producer's AST; importing or running
the producer would make live requests to NSF and OpenAlex and is deliberately avoided.
"""
import ast
import re
import unicodedata
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NAMES = ("pi_name", "same_pi", "is_transfer")


def load(source):
    tree = ast.parse(source)
    defs = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in NAMES]
    missing = set(NAMES) - {n.name for n in defs}
    if missing:
        raise AssertionError(f"fetch_collab.py no longer defines {sorted(missing)}")
    ns = {"re": re, "unicodedata": unicodedata}
    exec(compile(ast.Module(body=defs, type_ignores=[]), "fetch_collab.py", "exec"), ns)
    return ns["is_transfer"]


is_transfer = load((ROOT / "_data/build/fetch_collab.py").read_text(encoding="utf-8"))
YAO = "269970204"  # Lingxing Yao, sole PI on 1620198 (Case Western) and 1852597 (Akron)


class PiTransfer(unittest.TestCase):
    def test_the_recorded_transfer_is_still_found(self):
        self.assertTrue(is_transfer([{"piId": YAO}], [{"piId": YAO}]))

    def test_blank_identities_are_unknown_not_a_match(self):
        # Two awards with no piId and no name used to share the key "" and be dropped.
        self.assertFalse(is_transfer([{"id": "1"}], [{"id": "2"}]))
        self.assertFalse(is_transfer([{"piId": None, "pdPIName": " ", "piFirstName": None}],
                                     [{"piId": "", "pdPIName": "", "piLastName": ""}]))

    def test_a_single_word_name_is_unknown(self):
        self.assertFalse(is_transfer([{"pdPIName": "Yao"}], [{"piLastName": "Yao"}]))

    def test_piid_on_one_side_falls_back_to_the_name(self):
        self.assertTrue(is_transfer([{"piId": YAO, "pdPIName": "Lingxing Yao"}],
                                    [{"piFirstName": "Lingxing", "piLastName": "Yao"}]))

    def test_last_first_matches_split_names(self):
        self.assertTrue(is_transfer([{"pdPIName": "Yao, Lingxing"}],
                                    [{"piFirstName": "Lingxing", "piLastName": "Yao"}]))

    def test_middle_initials_accents_and_case_do_not_hide_a_person(self):
        self.assertTrue(is_transfer([{"pdPIName": "José A. García"}], [{"pdPIName": "GARCIA, Jose"}]))

    def test_two_piids_decide_even_when_names_agree(self):
        self.assertFalse(is_transfer([{"piId": "1", "pdPIName": "Lingxing Yao"}],
                                     [{"piId": "2", "pdPIName": "Lingxing Yao"}]))

    def test_different_people_are_not_a_transfer(self):
        self.assertFalse(is_transfer([{"pdPIName": "Lingxing Yao"}], [{"pdPIName": "Ann Smith"}]))


if __name__ == "__main__":
    unittest.main()
