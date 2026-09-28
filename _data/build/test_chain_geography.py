"""The checks that would have caught the chain page's geography defect.

Run:
  python -m unittest _data.build.test_chain_geography          (from the repo root)
  python _data/build/test_chain_geography.py                   (from _data/build)
  CHAIN_SOURCE=<path to pic.sqlite> python _data/build/test_chain_geography.py

WHY EACH CHECK EXISTS. Every one of them fails on the file as it shipped on
2026-09-08, and each is written against a defect that actually reached a reader:

  STATE HOMONYM. 64 Wayne County, MICHIGAN companies joined to Wayne County, Ohio on
    the county name alone, which made the single most contaminated county render as the
    region's best-covered one (80 known / 50 classified against 27 Census plants, a
    ratio of 1.85, the darkest cell on the choropleth). The register's published rule
    needs county AND state; a name-only join is the whole defect.

  MISMATCHED MAP AND TABLE SETS. The polygons were drawn from one fourteen-county list
    and shaded from another. Ashtabula, Trumbull and Columbiana fell through a
    `|| {classified:0}` default and drew as no-data -- Ashtabula has the sixth-largest
    establishment count of the fourteen -- while the table beside the map listed
    Crawford, Huron and Richland, which have no polygon on the page at all.

  AGGREGATE DISAGREEMENT. `meta.cbp_estab` was 653 because it was summed over the wrong
    FIPS set, while the per-county rows a reader could add up came to something else.
    A total that does not equal its own parts is the cheapest possible thing to check
    and nothing checked it.

  DISAPPEARING HELD-OUT ROWS. 75 rows leave the region count. Deleting them silently
    would replace one error with another, and the second would be invisible: a smaller,
    tidier number with nothing to audit. They must stay disclosed by bucket AND by
    name, and re-running the repair must not quietly zero the disclosure.

  A KNOWN-BAD CONTROL. `KnownBadControl` feeds each checker a fixture carrying the real
    historical defect and asserts it is REPORTED. A gate that returns no findings on the
    exact defect that motivated it is worse than no gate, because it certifies. These
    controls are the reason to believe a green run means anything.

WHAT THIS CANNOT DO. Without the held extract it cannot see a state at all -- the public
rows carry city and county, never state -- so the row-level homonym check runs only when
CHAIN_SOURCE points at pic.sqlite. Structurally it can still tell that the disclosure is
intact and that the county sets agree, which is what a reader-facing defect looks like
from the outside. It also checks page STRINGS, not rendered output; the rendered page is
the browser gates' job.
"""
import json
import hashlib
import sys
import tempfile
import os
import re
import sqlite3
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from repair_chain import load_cbp
# CHAIN_REPO_ROOT lets this file be checked against a worktree from outside it, which is
# how it was validated before it was ever run from inside the repo.
ROOT = os.path.abspath(os.environ.get("CHAIN_REPO_ROOT") or os.path.join(HERE, "..", ".."))
CHAIN = os.path.join(ROOT, "chain", "data", "chain-data.json")
VIZ = os.path.join(ROOT, "chain", "data", "viz-data.json")
CLAIMS = os.path.join(ROOT, "chain", "claims.json")
APP = os.path.join(ROOT, "chain", "app.js")
INDEX = os.path.join(ROOT, "chain", "index.html")

# From CODEBOOK.md 2026-08-14, "NEO-14 counties", transcribed here rather than imported
# so that a producer whose own constant drifts is caught rather than confirmed.
CODEBOOK_NEO14 = {
    "39007": "Ashtabula",  "39029": "Columbiana", "39035": "Cuyahoga",  "39055": "Geauga",
    "39085": "Lake",       "39093": "Lorain",     "39099": "Mahoning",  "39103": "Medina",
    "39133": "Portage",    "39151": "Stark",      "39153": "Summit",    "39155": "Trumbull",
    "39157": "Tuscarawas", "39169": "Wayne",
}
NEO14_NAMES = set(CODEBOOK_NEO14.values())
OHIO_STATES = {"ohio", "oh", ""}
HOLDOUT_BUCKETS = ("homonym_county_join", "regional_site_nonregional_company",
                   "address_missing")


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


# --------------------------------------------------------------------- checkers
# Pure functions over loaded structures. They return a list of problems, empty when
# clean, so KnownBadControl can hand them a fixture without touching the repo.

def check_county_sets(data):
    """The map, the table, the rows and the codebook must name the same fourteen."""
    problems = []
    polys = {f["properties"].get("name") or f["properties"].get("NAME")
             for f in data["geo"]["features"]}
    table = {c["county"] for c in data["counties"]}
    rows = {c["c"] for c in data["companies"] if c.get("c")}
    for label, got in (("map polygons", polys), ("coverage table", table),
                       ("company rows", rows)):
        extra, gone = got - NEO14_NAMES, NEO14_NAMES - got
        if extra:
            problems.append("%s name counties outside NEO-14: %s" % (label, sorted(extra)))
        if gone and label != "company rows":
            problems.append("%s omit NEO-14 counties: %s" % (label, sorted(gone)))
    # A missing `fips` sorts alongside real codes, so keep it a string: a checker that
    # raises TypeError on the defect it is looking for reports nothing at all.
    fips = {c.get("fips") or "(none)" for c in data["counties"]}
    if fips != set(CODEBOOK_NEO14):
        problems.append("coverage table FIPS do not match the codebook: %s"
                        % sorted(fips ^ set(CODEBOOK_NEO14)))
    for c in data["counties"]:
        if c.get("fips") and CODEBOOK_NEO14.get(c["fips"]) != c["county"]:
            problems.append("county row %s carries FIPS %s, which is %s"
                            % (c["county"], c["fips"], CODEBOOK_NEO14.get(c["fips"])))
    return problems


def check_aggregates(data, viz):
    """Every published total must equal the parts a reader can add up."""
    problems = []
    meta, counties, companies = data["meta"], data["counties"], data["companies"]
    classified = [c for c in companies if c["t"]]
    checks = [
        ("meta.neo_total", meta["neo_total"], len(companies)),
        ("county known total", sum(c["known"] for c in counties), len(companies)),
        ("county classified total", sum(c["classified"] for c in counties), len(classified)),
        ("meta.unclassified", meta["unclassified"], len(companies) - len(classified)),
        ("meta.cbp_estab", meta["cbp_estab"], sum(c["cbp_estab"] for c in counties)),
        ("meta.cbp_emp", meta["cbp_emp"], sum(c["cbp_emp"] for c in counties)),
        ("region + outside", meta["neo_total"] + meta["outside_total"],
         meta.get("register_total")),
        ("viz supply_meta.neo_total", viz["supply_meta"]["neo_total"], meta["neo_total"]),
        ("viz supply_meta.cbp_estab", viz["supply_meta"]["cbp_estab"], meta["cbp_estab"]),
    ]
    for label, got, want in checks:
        if got != want:
            problems.append("%s is %r, the parts sum to %r" % (label, got, want))
    for tier in data["tiers"] + data["enablers"]:
        got = sum(1 for c in companies if tier["key"] in c["t"])
        if tier["neo"] != got:
            problems.append("tier %s says %d regional companies, the rows hold %d"
                            % (tier["key"], tier["neo"], got))
    if viz.get("counties") != counties:
        problems.append("viz-data.json carries a different county table from chain-data.json")
    # A NEO-14 county drawn as empty is either a finding or a defect, and the page has
    # been wrong about which before. Make it say which.
    blank = [c["county"] for c in counties if c["classified"] == 0 and not c.get("blank_reason")]
    if blank:
        problems.append("NEO-14 counties render as zero with no stated reason: %s" % blank)
    return problems


def check_holdout(data):
    """Rows held out of the region must stay disclosed, by count and by name."""
    problems = []
    holdout = (data.get("meta") or {}).get("holdout")
    if not holdout:
        return ["meta.holdout is absent: rows left the region count with nothing disclosed"]
    shipped = {c["n"] for c in data["companies"]}
    total = 0
    for bucket in HOLDOUT_BUCKETS:
        entry = holdout.get(bucket)
        if not entry:
            problems.append("holdout bucket %s is missing" % bucket)
            continue
        names = entry.get("names") or []
        if entry.get("n", 0) < 1:
            problems.append("holdout bucket %s reports %r rows: a bucket that empties "
                            "silently is the failure this check exists for"
                            % (bucket, entry.get("n")))
        if len(names) != entry.get("n"):
            problems.append("holdout bucket %s counts %r but names %d"
                            % (bucket, entry.get("n"), len(names)))
        if not (entry.get("note") or "").strip():
            problems.append("holdout bucket %s carries no note saying why" % bucket)
        both = sorted(set(names) & shipped)
        if both:
            problems.append("held out AND still counted in the region: %s" % both[:5])
        total += entry.get("n", 0)
    if data["meta"].get("holdout_total") != total:
        problems.append("meta.holdout_total is %r, the buckets sum to %d"
                        % (data["meta"].get("holdout_total"), total))
    return problems


def check_rows_against_source(companies, source_rows, holdout_names):
    """Every shipped row must satisfy the register's own rule: county AND state.

    This is the check that sees a homonym. The public rows carry no state, so it needs
    the held extract; without one, a Wayne County, Michigan company is indistinguishable
    from a Wayne County, Ohio one on the page.
    """
    problems = []
    held = {}
    for r in source_rows:
        held[(r["name"] or "").replace("’", "'")] = r
    for c in companies:
        r = held.get((c["n"] or "").replace("’", "'"))
        if r is None:
            problems.append("shipped row %r is not in the extract" % c["n"])
            continue
        state = (r["state"] or "").strip()
        county = (r["county"] or "").strip()
        if state.lower() not in OHIO_STATES:
            problems.append("state homonym: %r is in %s, %s, and is counted as NEO-14"
                            % (c["n"], county or "no county", state))
        elif county not in NEO14_NAMES:
            problems.append("%r carries county %r, which is not NEO-14" % (c["n"], county))
        if county and c.get("c") and county != c["c"]:
            problems.append("%r shows county %r, the extract says %r" % (c["n"], c["c"], county))
    for name in holdout_names:
        r = held.get((name or "").replace("’", "'"))
        if r is None:
            problems.append("held-out row %r is not in the extract" % name)
        elif r["in_neo14"]:
            problems.append("held-out row %r now qualifies and is no longer published" % name)
    return problems


def check_claims(claims, data, viz):
    """The published claims must not assert a number the data no longer holds."""
    problems = []
    ids = [c["id"] for c in claims["claims"]]
    if "chain-blank-counties" in ids:
        problems.append("chain-blank-counties is still published: it named three counties "
                        "outside NEO-14 in which the register holds 20 classified companies")
    pinned = {"chain-neo-total": data["meta"]["neo_total"],
              "chain-unclassified": data["meta"]["unclassified"],
              "chain-cbp-benchmark": data["meta"]["cbp_estab"]}
    for claim in claims["claims"]:
        want = pinned.get(claim["id"])
        if want is not None and str(want) not in claim["assert"]:
            problems.append("claim %s does not assert the shipped value %r"
                            % (claim["id"], want))
        if want is not None and str(want) not in claim["text"]:
            problems.append("claim %s asserts %r but its sentence does not say it"
                            % (claim["id"], want))
    converters = [s for s in viz["spine"] if s["key"] == "converters"][0]["supply"]
    sd = [c for c in claims["claims"] if c["id"] == "chain-supply-demand"]
    if sd and str(converters) not in sd[0]["assert"]:
        problems.append("chain-supply-demand does not assert the shipped converter count %d"
                        % converters)
    return problems


def check_page_text(app_js, index_html, data):
    """Strings a reader sees that the repair must have moved."""
    problems = []
    if re.search(r"/\s*[A-Za-z_][\w.]*cbp_estab\b", app_js):
        problems.append("app.js still divides company records by Census establishments")
    if re.search(r"rat\s*\*\s*100", app_js):
        problems.append("app.js still prints a coverage PERCENT: classified companies "
                        "divided by Census establishments is not a rate")
    for needle, why in (
            ("no classified company at all", "the withdrawn blank-counties finding"),
            ("regional count is <b>721</b>", "the superseded 721"),
            ("PIC-12 (twelve counties)", "the applications were never filtered to PIC-12")):
        if needle in index_html:
            problems.append("index.html still carries %s (%r)" % (why, needle))
    if "blanks" in app_js and 'getElementById("blanks")' in app_js:
        problems.append("app.js still writes the blank-counties block")
    dek = re.search(r'const DEK = "(.*?)";', app_js)
    if not dek:
        problems.append("app.js does not define a single DEK constant, so the static and "
                        "rendered headlines can diverge again")
    else:
        static = re.search(r'<h1 id="takeaway">(.*?)</h1>', index_html, re.S)
        if not static:
            problems.append("index.html has no <h1 id=\"takeaway\">")
        elif " ".join(static.group(1).split()) != dek.group(1):
            problems.append("the static dek and the rendered dek say different things:\n"
                            "  static: %s\n  script: %s"
                            % (" ".join(static.group(1).split()), dek.group(1)))
    total = str(data["meta"]["neo_total"])
    if total not in index_html:
        problems.append("index.html never states the corrected region total %s" % total)
    return problems


# ------------------------------------------------------------------ shipped files

class ShippedChainPage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = load(CHAIN)
        cls.viz = load(VIZ)
        cls.claims = load(CLAIMS)
        cls.app = read(APP)
        cls.index = read(INDEX)

    def test_one_county_set(self):
        self.assertEqual([], check_county_sets(self.data))

    def test_totals_equal_their_parts(self):
        self.assertEqual([], check_aggregates(self.data, self.viz))

    def test_held_out_rows_stay_disclosed(self):
        self.assertEqual([], check_holdout(self.data))

    def test_claims_match_the_data(self):
        self.assertEqual([], check_claims(self.claims, self.data, self.viz))

    def test_page_text(self):
        self.assertEqual([], check_page_text(self.app, self.index, self.data))

    def test_demand_footprint_is_stated_as_extracted(self):
        foot = self.viz.get("demand_footprint")
        self.assertIsNotNone(foot, "viz-data.json does not say what the demand side counts")
        self.assertFalse(foot["filtered"],
                         "if the applications are now filtered, the page copy must say to what")
        self.assertEqual(foot["n"], self.viz["intake"]["n"])
        self.assertEqual(foot["ohio"], self.viz["intake"]["ohio"])

    @unittest.skipUnless(os.environ.get("CHAIN_SOURCE"),
                         "set CHAIN_SOURCE to pic.sqlite to check rows against the extract")
    def test_rows_against_the_held_extract(self):
        path = os.path.abspath(os.environ["CHAIN_SOURCE"]).replace("\\", "/").lstrip("/")
        con = sqlite3.connect("file:" + path + "?mode=ro", uri=True)
        con.row_factory = sqlite3.Row
        rows = [dict(r) for r in con.execute("SELECT * FROM companies")]
        con.close()
        holdout = (self.data["meta"].get("holdout") or {})
        names = [n for b in holdout.values() for n in (b.get("names") or [])]
        self.assertEqual([], check_rows_against_source(self.data["companies"], rows, names))
        # and the flag the repair trusts must still equal the rule it claims to implement
        disagree = [r["name"] for r in rows
                    if bool(r["in_neo14"]) != ((r["county"] or "").strip() in NEO14_NAMES
                                               and (r["state"] or "").strip().lower() in OHIO_STATES)]
        self.assertEqual([], disagree[:5])


# -------------------------------------------------------------- known-bad control

def _clean_fixture():
    """A miniature of the corrected page: two counties, three companies, one holdout."""
    return {
        "meta": {"neo_total": 3, "unclassified": 1, "outside_total": 4, "register_total": 7,
                 "cbp_estab": 30, "cbp_emp": 300, "holdout_total": 3,
                 "holdout": {
                     "homonym_county_join": {"n": 1, "names": ["Detroit Molding"],
                                             "note": "Wayne County, Michigan."},
                     "regional_site_nonregional_company": {"n": 1, "names": ["Pretium Packaging"],
                                                           "note": "Plant may be inside."},
                     "address_missing": {"n": 1, "names": ["No Address Co"],
                                         "note": "No city, county or state."}}},
        "tiers": [{"key": "oem", "label": "Finished product OEM", "roles": [], "neo": 2,
                   "outside": 1}],
        "enablers": [],
        "counties": [
            {"county": "Summit", "fips": "39153", "known": 2, "classified": 2,
             "cbp_estab": 20, "cbp_emp": 200},
            {"county": "Wayne", "fips": "39169", "known": 1, "classified": 0,
             "cbp_estab": 10, "cbp_emp": 100, "blank_reason": "no classified row here yet"}],
        "companies": [{"n": "A", "c": "Summit", "t": ["oem"]},
                      {"n": "B", "c": "Summit", "t": ["oem"]},
                      {"n": "C", "c": "Wayne", "t": []}],
        "geo": {"features": [{"properties": {"name": n}} for n in ("Summit", "Wayne")]},
    }


def _clean_viz(data):
    return {"spine": [{"key": "converters", "supply": 2}],
            "supply_meta": {"neo_total": data["meta"]["neo_total"],
                            "cbp_estab": data["meta"]["cbp_estab"]},
            "counties": data["counties"],
            "intake": {"n": 59, "ohio": 38},
            "demand_footprint": {"n": 59, "ohio": 38, "filtered": False}}


class KnownBadControl(unittest.TestCase):
    """Each checker is shown the defect it exists for and must report it.

    The fixture holds only two of the fourteen counties on purpose: these assertions are
    about whether a checker SPEAKS, not about the real numbers, and a fixture that had to
    be kept in step with the register would rot and be deleted.
    """

    def setUp(self):
        self.clean = _clean_fixture()
        # the reduced fixture has two counties, so the codebook check would fire on the
        # twelve it omits; the county-set control below scopes itself to the real defect.
        self.viz = _clean_viz(self.clean)

    def _county_problems(self, data):
        """Only the problems the historical defect caused, not fixture-size noise.

        The fixture names two of the fourteen counties, so the whole-set FIPS comparison
        and the omitted-county message fire on its size rather than on any defect. Those
        two messages are filtered; everything else is a real finding about the fixture.
        """
        return [p for p in check_county_sets(data)
                if not p.startswith("coverage table FIPS do not match")
                and "omit NEO-14 counties" not in p]

    def test_control_passes_when_clean(self):
        self.assertEqual([], self._county_problems(self.clean))
        self.assertEqual([], check_aggregates(self.clean, self.viz))
        self.assertEqual([], check_holdout(self.clean))

    def test_catches_a_county_outside_the_codebook(self):
        bad = _clean_fixture()
        # the actual shipped defect: Crawford in the table, no polygon on the map
        bad["counties"].append({"county": "Crawford", "fips": "39033", "known": 0,
                                "classified": 0, "cbp_estab": 4, "cbp_emp": 29})
        self.assertTrue(any("Crawford" in p for p in self._county_problems(bad)),
                        "a county outside NEO-14 in the coverage table went unreported")

    def test_catches_a_polygon_the_table_never_shades(self):
        bad = _clean_fixture()
        bad["geo"]["features"].append({"properties": {"name": "Ashtabula"}})
        self.assertTrue(any("Ashtabula" in p for p in check_county_sets(bad)),
                        "a polygon with no row behind it went unreported")

    def test_catches_a_wrong_fips_on_a_right_name(self):
        bad = _clean_fixture()
        bad["counties"][1]["fips"] = "39077"          # Huron's code on Wayne's row
        self.assertTrue(any("carries FIPS" in p for p in self._county_problems(bad)),
                        "a county keyed to the wrong FIPS went unreported")

    def test_catches_a_total_that_does_not_equal_its_parts(self):
        bad = _clean_fixture()
        bad["meta"]["cbp_estab"] = 653                # the shipped wrong-FIPS total
        problems = check_aggregates(bad, _clean_viz(_clean_fixture()))
        self.assertTrue(any("cbp_estab" in p for p in problems),
                        "a CBP total summed over a different county set went unreported")

    def test_catches_an_inflated_region_count(self):
        bad = _clean_fixture()
        bad["meta"]["neo_total"] = 785
        self.assertTrue(any("neo_total" in p for p in check_aggregates(bad, self.viz)),
                        "a region total larger than the rows behind it went unreported")

    def test_catches_a_silently_blank_county(self):
        bad = _clean_fixture()
        bad["counties"][1].pop("blank_reason")
        self.assertTrue(any("render as zero" in p for p in check_aggregates(bad, _clean_viz(bad))),
                        "a NEO-14 county drawn empty with no reason went unreported")

    def test_catches_a_missing_disclosure(self):
        bad = _clean_fixture()
        bad["meta"].pop("holdout")
        self.assertTrue(check_holdout(bad), "rows left the count with nothing disclosed")

    def test_catches_a_disclosure_that_emptied_itself(self):
        bad = _clean_fixture()
        bad["meta"]["holdout"]["homonym_county_join"] = {"n": 0, "names": [], "note": "x"}
        bad["meta"]["holdout_total"] = 2
        self.assertTrue(any("silently" in p for p in check_holdout(bad)),
                        "a held-out bucket that emptied on a rerun went unreported")

    def test_catches_a_held_out_row_still_counted(self):
        bad = _clean_fixture()
        bad["companies"].append({"n": "Detroit Molding", "c": "Wayne", "t": ["oem"]})
        self.assertTrue(any("still counted" in p for p in check_holdout(bad)),
                        "a row both held out and counted went unreported")

    def test_catches_a_state_homonym(self):
        rows = [{"name": "Detroit Molding", "city": "Detroit", "state": "MI",
                 "county": "Wayne", "in_neo14": 0},
                {"name": "Akron Molding", "city": "Akron", "state": "OH",
                 "county": "Summit", "in_neo14": 1}]
        companies = [{"n": "Detroit Molding", "c": "Wayne"}, {"n": "Akron Molding", "c": "Summit"}]
        problems = check_rows_against_source(companies, rows, [])
        self.assertTrue(any("state homonym" in p for p in problems),
                        "a Michigan company counted as Northeast Ohio went unreported")
        self.assertEqual([], check_rows_against_source([companies[1]], rows, ["Detroit Molding"]))

    def test_catches_a_readmitted_holdout(self):
        rows = [{"name": "No Address Co", "city": "Akron", "state": "OH",
                 "county": "Summit", "in_neo14": 1}]
        problems = check_rows_against_source([], rows, ["No Address Co"])
        self.assertTrue(any("now qualifies" in p for p in problems),
                        "a held-out row that started qualifying went unreported")

    def test_catches_a_withdrawn_claim_still_published(self):
        data = _clean_fixture()
        claims = {"claims": [{"id": "chain-blank-counties", "text": "Three counties.",
                              "assert": "True"}]}
        self.assertTrue(any("chain-blank-counties" in p
                            for p in check_claims(claims, data, self.viz)),
                        "the withdrawn claim went unreported")

    def test_catches_a_claim_pinned_to_a_superseded_number(self):
        data = _clean_fixture()
        claims = {"claims": [{"id": "chain-neo-total", "text": "785 rows.",
                              "assert": "D['chain']['meta']['neo_total'] == 785"}]}
        self.assertTrue(check_claims(claims, data, self.viz),
                        "a claim asserting a number the data no longer holds went unreported")

    def test_catches_the_page_strings_that_shipped(self):
        app = ('const DEK = "The region owns the middle.";\n'
               'document.getElementById("blanks").innerHTML = x;\n'
               'return Math.round(rat*100)+"%";')
        index = ('<h1 id="takeaway">The region owns the middle of the polymer chain.</h1>'
                 '<p>the regional count is <b>721</b> until the register is re-keyed</p>'
                 '<h2>Three of the fourteen counties have no classified company at all.</h2>'
                 '<span>2026 applications naming that stage, PIC-12 (twelve counties)</span>')
        problems = check_page_text(app, index, _clean_fixture())
        for needle in ("PERCENT", "721", "blank-counties", "PIC-12", "different things"):
            self.assertTrue(any(needle in p for p in problems),
                            "%s went unreported: %s" % (needle, problems))


class RawCensusInputChecks(unittest.TestCase):
    """Malformed responses must fail before their totals can enter the page."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.responses = {
            naics: [["state", "county", "NAICS2017", "ESTAB", "EMP"]] +
                   [["39", fips[2:], naics, "1", "10"] for fips in CODEBOOK_NEO14]
            for naics in ("325", "326")
        }

    def write_inputs(self):
        receipts = []
        for naics, rows in self.responses.items():
            filename = "cbp2023-naics%s-state39.json" % naics
            raw = json.dumps(rows).encode("utf-8")
            with open(os.path.join(self.tmp.name, filename), "wb") as fh:
                fh.write(raw)
            receipts.append({"file": filename, "naics": naics, "bytes": len(raw),
                             "sha256": hashlib.sha256(raw).hexdigest()})
        with open(os.path.join(self.tmp.name, "cbp-receipts.json"), "w", encoding="utf-8") as fh:
            json.dump(receipts, fh)

    def test_complete_cells_sum_to_known_totals(self):
        self.write_inputs()
        result = load_cbp(self.tmp.name)
        self.assertEqual(sum(r["estab"] for r in result.values()), 28)
        self.assertEqual(sum(r["emp"] for r in result.values()), 280)

    def test_missing_county_is_not_a_zero(self):
        self.responses["325"].pop()
        self.write_inputs()
        with self.assertRaisesRegex(SystemExit, "missing selected counties"):
            load_cbp(self.tmp.name)

    def test_duplicate_county_is_not_added_twice(self):
        self.responses["325"].append(self.responses["325"][1])
        self.write_inputs()
        with self.assertRaisesRegex(SystemExit, "duplicate county"):
            load_cbp(self.tmp.name)

    def test_wrong_industry_is_rejected(self):
        self.responses["325"][1][2] = "326"
        self.write_inputs()
        with self.assertRaisesRegex(SystemExit, "wrong state or industry"):
            load_cbp(self.tmp.name)

    def test_wrong_state_is_rejected(self):
        self.responses["325"][1][0] = "26"
        self.write_inputs()
        with self.assertRaisesRegex(SystemExit, "wrong state or industry"):
            load_cbp(self.tmp.name)

    def test_blank_employment_is_not_a_zero(self):
        self.responses["325"][1][4] = ""
        self.write_inputs()
        with self.assertRaisesRegex(SystemExit, "missing or invalid"):
            load_cbp(self.tmp.name)

    def test_changed_bytes_are_rejected(self):
        self.write_inputs()
        with open(os.path.join(self.tmp.name, "cbp2023-naics325-state39.json"), "ab") as fh:
            fh.write(b" ")
        with self.assertRaisesRegex(SystemExit, "cached bytes do not match"):
            load_cbp(self.tmp.name)

    def test_ratio_ranking_is_not_coverage(self):
        problems = check_page_text("const rank = c.classified / c.cbp_estab;", "", _clean_fixture())
        self.assertTrue(any("divides company records" in p for p in problems))


if __name__ == "__main__":
    unittest.main(verbosity=2)
