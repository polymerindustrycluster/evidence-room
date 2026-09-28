# Optional DuckDB source audit

The published source register repeats each page/source relationship in two directions:
`pages[].sources` and `sources[].pages`. This experiment compares both against the
authoritative `_data/SOURCES.json` `by_artifact` map, using DuckDB set differences.
A swapped relationship can preserve every page count and global total and still be wrong.
The existing published-register guard compares inventories and census totals, not these edges.

Run from any working directory (substitute absolute paths when outside the repository):

```sh
uv run tools/duckdb_audit/audit.py
uv run tools/duckdb_audit/audit.py --source qcew --json
uv run --no-project --with duckdb==1.4.4 python tools/duckdb_audit/test_audit.py
```

The script pins DuckDB 1.4.4 in inline dependency metadata. `uv` installs it in an isolated
environment on first use; the audit itself reads only two local files and creates an
in-memory database, with no database file or network queries. Alternatively install
`duckdb==1.4.4` in a disposable Python 3.10+ environment and run the scripts with Python.

Exit codes: **0** means the declared relationships agree; **1** means discrepancies;
**2** means invalid/missing input, an unknown requested source, or a missing dependency.
Empty or malformed inventories, duplicate keys/IDs/edges, and unknown authoritative
source references fail rather than yielding a misleading clean result. Input SHA-256
hashes and elapsed query/load time accompany JSON reports. Finding order is deterministic.
The optional source lookup never narrows audit coverage.

The test suite swaps the laborshed and wages source lists in an isolated fixture, preserving
their counts and all global totals, and demands the exact four relationship findings.
It also checks the reverse source listing, malformed input, duplicates, empty-page inventory,
parameterized source lookup, and CLI exit codes. Real source files are never mutated.

This checks **declared dependencies**, not evidence that a source actually influenced a
page. It cannot establish whether the authoritative register is correct, compare arbitrary
figures with different units/years/geographies, inspect rendered prose, or replace the
existing claims, provenance, and browser gates. It intentionally remains outside
`tools/all.mjs`; the added coverage could also be implemented in Python without DuckDB.
Its experimental value is a queryable relationship model and precise dependency reports,
not faster census arithmetic or a new source of truth.
