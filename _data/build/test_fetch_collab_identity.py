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

    def test_conflicting_middle_initials_are_two_people(self):
        self.assertFalse(is_transfer([{"pdPIName": "John A. Smith"}], [{"pdPIName": "John B. Smith"}]))
        self.assertFalse(is_transfer([{"pdPIName": "Ann Marie Smith"}],
                                     [{"pdPIName": "Smith, Ann Louise"}]))

    def test_a_middle_name_missing_or_abbreviated_on_one_side_still_matches(self):
        self.assertTrue(is_transfer([{"pdPIName": "Ann Marie Smith"}], [{"pdPIName": "Smith, Ann"}]))
        self.assertTrue(is_transfer([{"pdPIName": "John A. Smith"}], [{"pdPIName": "Smith, John Albert"}]))
        self.assertTrue(is_transfer([{"pdPIName": "John A. B. Smith"}], [{"pdPIName": "John B. Smith"}]))

    def test_a_suffix_is_not_a_surname(self):
        for other in ("Yao, Lingxing Jr.", "Yao, Lingxing, Jr.", "Lingxing Yao, Jr.", "Lingxing Yao"):
            self.assertTrue(is_transfer([{"pdPIName": "Lingxing Yao Jr."}], [{"pdPIName": other}]),
                            other)
        self.assertTrue(is_transfer([{"piFirstName": "Lingxing", "piLastName": "Yao Jr."}],
                                    [{"pdPIName": "Yao, Lingxing"}]))

    def test_conflicting_suffixes_are_two_people(self):
        self.assertFalse(is_transfer([{"pdPIName": "John Smith Jr."}], [{"pdPIName": "Smith, John, Sr."}]))
        self.assertFalse(is_transfer([{"pdPIName": "John Smith II"}], [{"pdPIName": "John Smith III"}]))

    def test_a_one_word_pdpiname_falls_back_to_the_split_fields(self):
        self.assertTrue(is_transfer([{"pdPIName": "Yao", "piFirstName": "Lingxing", "piLastName": "Yao"}],
                                    [{"pdPIName": "Yao, Lingxing"}]))


if __name__ == "__main__":
    unittest.main()
