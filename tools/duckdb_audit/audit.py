# /// script
# requires-python = ">=3.10"
# dependencies = ["duckdb==1.4.4"]
# ///
"""Optional read-only reconciliation of declared page/source relationships.

Python validates and normalizes the two JSON documents; DuckDB owns comparisons.
No persistent database, generated page data, or production gate is modified.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import time

AUTHORITY = "_data/SOURCES.json"
PUBLISHED = "sources/data/registry.json"
ROOT = Path(__file__).resolve().parents[2]


class InputError(ValueError):
    pass


def require(condition, location, message):
    if not condition:
        raise InputError(f"{location}: {message}")


def identifier(value, location):
    require(isinstance(value, str) and bool(value.strip()), location,
            "expected a non-empty identifier")
    return value


def identifiers(value, location):
    require(isinstance(value, list), location, "expected an array")
    result = [identifier(v, location) for v in value]
    require(len(result) == len(set(result)), location, "duplicate identifier")
    return result


def load(root, relative):
    try:
        raw = (root / relative).read_bytes()
        data = json.loads(raw, object_pairs_hook=unique_object)
    except (OSError, ValueError) as exc:
        raise InputError(f"{relative}: {exc}") from exc
    require(isinstance(data, dict), relative, "root must be an object")
    return data, {"path": relative, "sha256": hashlib.sha256(raw).hexdigest()}


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, key, "duplicate JSON key")
        result[key] = value
    return result


def normalize(authority, published):
    sources = authority.get("sources")
    pages = authority.get("by_artifact")
    require(isinstance(sources, dict) and bool(sources), AUTHORITY,
            "sources must be a non-empty object")
    require(isinstance(pages, dict) and bool(pages), AUTHORITY,
            "by_artifact must be a non-empty object")
    source_ids = [identifier(s, AUTHORITY) for s in sources]
    expected = []
    for page, keys in pages.items():
        identifier(page, AUTHORITY)
        for key in identifiers(keys, f"{AUTHORITY}: by_artifact.{page}"):
            require(key in sources, AUTHORITY, f"{page} references unknown source {key}")
            expected.append((page, key))

    inventories, edges, counts = {}, {}, []
    for field, id_field, links in [("pages", "slug", "sources"),
                                    ("sources", "key", "pages")]:
        rows = published.get(field)
        require(isinstance(rows, list) and bool(rows), PUBLISHED,
                f"{field} must be a non-empty array")
        ids, pairs = [], []
        for row in rows:
            require(isinstance(row, dict), PUBLISHED, f"{field} row must be an object")
            key = identifier(row.get(id_field), f"{PUBLISHED}: {field}.{id_field}")
            ids.append(key)
            values = identifiers(row.get(links), f"{PUBLISHED}: {field}.{key}.{links}")
            pairs.extend((key, v) if field == "pages" else (v, key) for v in values)
            if field == "pages":
                n = row.get("n_sources")
                require(type(n) is int and 0 <= n <= 2**63 - 1, PUBLISHED,
                        f"pages.{key}.n_sources must be a nonnegative 64-bit integer")
                counts.append((key, n))
        require(len(ids) == len(set(ids)), PUBLISHED, f"duplicate {field} identifier")
        inventories[field], edges[field] = ids, pairs
    return pages, source_ids, expected, inventories, edges, counts


def audit(root=ROOT, source=None):
    import duckdb

    started = time.perf_counter()
    authority, a_hash = load(root, AUTHORITY)
    published, p_hash = load(root, PUBLISHED)
    pages, source_ids, expected, inventories, edges, counts = normalize(authority, published)
    if source is not None:
        require(source in source_ids, "--source", f"unknown source {source!r}")
    with duckdb.connect(":memory:") as db:
        db.execute("CREATE TABLE expected(page VARCHAR, source VARCHAR)")
        db.execute("CREATE TABLE page_copy(page VARCHAR, source VARCHAR)")
        db.execute("CREATE TABLE source_copy(page VARCHAR, source VARCHAR)")
        for table, rows in [("expected", expected), ("page_copy", edges["pages"]),
                            ("source_copy", edges["sources"])]:
            if rows:
                db.executemany(f"INSERT INTO {table} VALUES (?, ?)", rows)
        db.execute("CREATE TABLE inventory(kind VARCHAR, id VARCHAR, side VARCHAR)")
        db.executemany("INSERT INTO inventory VALUES (?, ?, ?)",
                       [(kind, key, side) for kind, keys, side in [
                           ("page", pages, "expected"), ("source", source_ids, "expected"),
                           ("page", inventories["pages"], "published"),
                           ("source", inventories["sources"], "published")]
                        for key in keys])
        db.execute("CREATE TABLE counts(page VARCHAR, published BIGINT)")
        db.executemany("INSERT INTO counts VALUES (?, ?)", counts)
        # EXCEPT compares relationships, not aggregate counts; all SQL interpolations
        # below are fixed table names. Source selection is always parameterized.
        findings = []
        for table, view in [("page_copy", "pages[].sources"),
                            ("source_copy", "sources[].pages")]:
            for direction, left, right in [("missing", "expected", table),
                                            ("unexpected", table, "expected")]:
                rows = db.execute(f"SELECT * FROM {left} EXCEPT SELECT * FROM {right}").fetchall()
                findings.extend({"check": f"{direction}-edge", "view": view,
                                 "page": p, "source": s} for p, s in rows)
        for direction, left, right in [("missing", "expected", "published"),
                                        ("unexpected", "published", "expected")]:
            rows = db.execute("""
                SELECT kind, id FROM inventory WHERE side = ?
                EXCEPT SELECT kind, id FROM inventory WHERE side = ?
            """, [left, right]).fetchall()
            findings.extend({"check": f"{direction}-{kind}", "id": key}
                            for kind, key in rows)
        rows = db.execute("""
            SELECT c.page, c.published, count(e.source) AS expected
            FROM counts c LEFT JOIN expected e ON c.page = e.page
            GROUP BY c.page, c.published HAVING c.published <> count(e.source)
        """).fetchall()
        findings.extend({"check": "source-count", "page": p, "published": n,
                         "expected": n_expected} for p, n, n_expected in rows)
        impact = None
        if source is not None:
            impact = {"source": source}
            for table, label in [("expected", "declared_pages"),
                                  ("page_copy", "published_page_list"),
                                  ("source_copy", "published_source_list")]:
                impact[label] = [r[0] for r in db.execute(
                    f"SELECT page FROM {table} WHERE source = ? ORDER BY page", [source]).fetchall()]
    return {"scope": "declared page-source relationships only", "engine": f"DuckDB {duckdb.__version__}",
            "inputs": [a_hash, p_hash], "pages": len(pages), "sources": len(source_ids),
            "relationships": len(expected), "findings": sorted(findings, key=lambda f: json.dumps(f, sort_keys=True)),
            "impact": impact, "elapsed_ms": round((time.perf_counter() - started) * 1000, 2)}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT, help="repository or isolated fixture root")
    parser.add_argument("--source", help="report declared dependent pages; audit still checks all sources")
    parser.add_argument("--json", action="store_true", help="emit machine-readable evidence")
    args = parser.parse_args(argv)
    try:
        report = audit(args.root, args.source)
    except (InputError, ImportError) as exc:
        report = {"scope": "declared page-source relationships only", "error": str(exc)}
        if args.json:
            print(json.dumps(report, indent=2))
        else:
            print(f"ERROR [source-audit-input] {exc}", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"{len(report['findings'])} finding(s); {report['relationships']} declared relationships, "
              f"{report['pages']} pages, {report['sources']} sources ({report['elapsed_ms']} ms)")
        for finding in report["findings"]:
            print(json.dumps(finding, sort_keys=True))
        if report["impact"]:
            print(json.dumps(report["impact"], indent=2))
        print("Scope: declared dependencies, not measured data use or factual correctness.")
    return 1 if report["findings"] else 0


if __name__ == "__main__":
    sys.exit(main())
