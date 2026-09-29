"""Regressions for verify_claims.tofixed — the claim-side twin of JavaScript's toFixed.

A page prints a ratio with toFixed(1); the claim beside it used Python's round(x, 1).
They disagree on exact binary halves: round(1.25, 1) is 1.2 (half to even), while
(1.25).toFixed(1) is "1.3" (half up). Latent for the reach page's 1.8349 ratio, but a
guard that can pass on 1.2 while the reader is shown 1.3 is not guarding the sentence.

Each test is written against a way the helper could go quietly wrong and still look right:
  - it must give the text JavaScript gives, so the differential test asks node itself,
    over exact halves, negatives, ties at other digit counts and the page's own ratio;
  - it must not lean on that differential alone, so the expected strings are also written
    out, in case node is one day mocked, missing or itself changes;
  - the reach claim must run through it, or the fix is a helper nothing calls.

Run: python3 -m unittest discover -s _data/build -p 'test_*.py'   (auto-discovered)
     python3 _data/build/test_verify_claims.py
"""
import json
import subprocess
import unittest
from pathlib import Path

import verify_claims as vc

ROOT = Path(__file__).resolve().parents[2]
CASES = [(1.25, 1), (0.5, 0), (2.5, 0), (0.125, 2), (-1.25, 1), (-2.5, 0), (-0.04, 1),
         (0.0, 1), (-0.0, 1), (1.8349, 1), (2.018 / 1.0998, 1), (1.35, 1), (1.45, 1),
         (2.675, 2), (1234.5, 0), (0.05, 1)]


def js_tofixed(cases):
    """What node prints for each (value, digits), asked of node rather than remembered."""
    script = ("const c = JSON.parse(process.argv[1]);"
              "console.log(JSON.stringify(c.map(([x, d]) => (Object.is(x, -0) ? -0 : x).toFixed(d))));")
    r = subprocess.run(["node", "-e", script, json.dumps(cases)],
                       capture_output=True, text=True, timeout=30, check=True)
    return json.loads(r.stdout)


class ToFixedTest(unittest.TestCase):
    def test_exact_binary_half_rounds_up_where_round_goes_to_even(self):
        self.assertEqual(round(1.25, 1), 1.2)          # the disagreement this exists for
        self.assertEqual(vc.tofixed(1.25, 1), "1.3")   # what the reader is shown

    def test_written_out_expectations(self):
        for x, digits, want in [(1.25, 1, "1.3"), (-1.25, 1, "-1.3"), (0.5, 0, "1"),
                                (2.5, 0, "3"), (0.125, 2, "0.13"), (1.8349, 1, "1.8"),
                                (-0.04, 1, "-0.0"), (-0.0, 1, "0.0"), (1.35, 1, "1.4"),
                                (1.45, 1, "1.4"), (2.675, 2, "2.67")]:
            with self.subTest(x=x, digits=digits):
                self.assertEqual(vc.tofixed(x, digits), want)

    def test_agrees_with_javascript_on_every_case(self):
        for (x, digits), want in zip(CASES, js_tofixed(CASES)):
            with self.subTest(x=x, digits=digits):
                self.assertEqual(vc.tofixed(x, digits), want)

    def test_the_differential_is_not_vacuous(self):
        # The helper must beat round() on at least one case here, or the whole file
        # would pass for round() as well.
        self.assertTrue(any(str(round(x, d)) != w for (x, d), w in zip(CASES, js_tofixed(CASES))
                            if d > 0))


class ReachRatioClaimTest(unittest.TestCase):
    """The claim that guards reach/app.js's (fwci_mean / fwci_median).toFixed(1)."""

    def setUp(self):
        spec = json.loads((ROOT / "reach/claims.json").read_text(encoding="utf-8"))
        self.claim = next(c for c in spec["claims"] if c["id"] == "rch-median-not-mean")
        self.data = json.loads((ROOT / "reach/data/reach.json").read_text(encoding="utf-8"))

    def test_claim_is_checked_the_way_the_page_prints_it(self):
        self.assertIn("tofixed(", self.claim["assert"])
        self.assertNotIn("round(", self.claim["assert"])

    def test_claim_passes_and_matches_the_text_node_prints(self):
        env = dict(vc.ENV, D={"totals": self.data["totals"]})
        env["__builtins__"] = {}
        self.assertTrue(eval(self.claim["assert"], env, {}))
        t = self.data["totals"]
        printed = subprocess.run(
            ["node", "-e", f"console.log(({t['fwci_mean']} / {t['fwci_median']}).toFixed(1))"],
            capture_output=True, text=True, timeout=30, check=True).stdout.strip()
        self.assertEqual(vc.tofixed(t["fwci_mean"] / t["fwci_median"], 1), printed)


if __name__ == "__main__":
    unittest.main()
