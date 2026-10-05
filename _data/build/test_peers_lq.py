"""Peers prints BLS's location quotient; its definition must describe the bureau's basis.

Run: python -B _data/build/test_peers_lq.py

THE DEFECT (2026-10-04). The peers methods defined concentration as "the industry's share
of an area's private jobs divided by its share of private jobs nationwide". The numbers the
page prints are not that. fetch_peers.py stores QCEW's own `lq_annual_avg_emplvl` column on
the own_code 5 industry rows, and the bureau computes that column with private industry jobs
over ALL jobs in the area, every ownership, and the same ratio nationally (the sources page
works Summit 2025 both ways: 3.272 on the bureau's basis, 3.124 private over private).

THE FIXTURE. Akron's printed 4.69 is rebuilt from components on the documented basis: the
Akron metro is exactly Summit and Portage (peers akron-sum claim), whose private plastics and
rubber jobs and all-ownership totals location-quotient/data/lq.json carries; the national
share is pinned by Ohio's cell in the same file, which is computed on the same basis and
reproduces the bureau's column. Then the definition on the page is held to that basis.
"""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PEERS = json.loads((ROOT / "peers/data/peers.json").read_text(encoding="utf-8"))
LQ = json.loads((ROOT / "location-quotient/data/lq.json").read_text(encoding="utf-8"))
REG = json.loads((ROOT / "sources/data/registry.json").read_text(encoding="utf-8"))
CELL = {(c["year"], c["area"], c["naics"]): c for c in LQ["cells"]}
YEAR = PEERS["cross_year"]


def definitions():
    src = (ROOT / "peers/app.js").read_text(encoding="utf-8")
    m = re.search(r"definitions:\s*`(.*?)`\}\);", src, re.S)
    return re.sub(r"\s+", " ", m.group(1)) if m else ""


class PeersLocationQuotient(unittest.TestCase):
    def test_peers_reads_the_bureau_column(self):
        fetch = (ROOT / "_data/build/fetch_peers.py").read_text(encoding="utf-8")
        self.assertIn('"lq": num(r["lq_annual_avg_emplvl"])', fetch)
        self.assertIn('r["own_code"] != "5"', fetch)
        # the same published column, read twice: peers' Ohio cell and lq.json's
        ohio = CELL[(YEAR, "39000", "326")]
        self.assertEqual(PEERS["states"]["326"]["subject_lq"], ohio["lq_published"])

    def test_bureau_basis_is_all_ownership(self):
        b = REG["lq"]["basis"]
        self.assertEqual(round(b["bls_basis"], 2), b["bls_published"])
        self.assertNotEqual(round(b["same_basis"], 2), b["bls_published"])

    def test_akron_printed_lq_reproduces_on_the_documented_basis(self):
        ohio = CELL[(YEAR, "39000", "326")]
        national = ohio["emp"] / ohio["local_total"] / ohio["lq"]
        summit, portage = CELL[(YEAR, "39153", "326")], CELL[(YEAR, "39133", "326")]
        jobs = summit["emp"] + portage["emp"]
        every_job = summit["local_total"] + portage["local_total"]
        m = PEERS["metros"]["326"]
        self.assertEqual(jobs, m["subject_emp"])
        self.assertEqual(f"{jobs / every_job / national:.2f}", f"{m['subject_lq']:.2f}")
        self.assertEqual(f"{m['subject_lq']:.2f}", "4.69")

    def test_definition_states_the_bureau_basis(self):
        d = definitions()
        self.assertTrue(d, "peers/app.js definitions block not found")
        self.assertIn("every job in the area, public and private", d)
        self.assertNotRegex(d, r"divided by its share of private jobs nationwide")


if __name__ == "__main__":
    unittest.main()
