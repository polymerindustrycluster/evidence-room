# Polymer chain register

The page describes a company register, not a regional census or a certification of
current capability. It contains 710 records with a qualifying Northeast Ohio address;
566 carry a mapped role. A company can carry several roles and count at several stages.

The geography is the held extract’s fourteen-county CODEBOOK boundary: all twelve PIC
counties plus Columbiana and Tuscarawas. County names must be paired with an Ohio, OH
or blank state. Seventy-five previously counted records fail this rule: 64 Wayne County,
Michigan records, one record with a nonregional company address, and ten missing all
address fields. Their names remain disclosed. An address filter cannot rule out a
company’s regional plants.

Census CBP 2023 supplies separate context: 684 establishments and 43,242 reported
employees in NAICS 325 and 326 across those same counties. Its unit and industry scope
differ from the register. The page does not divide company records by establishments
or interpret their quotient as coverage.

The stage comparison uses all 59 applications to PIC’s 2026 round, 38 in Ohio, without
a regional filter. Application counts do not measure market demand or production capacity.

## Reproduce the geography correction

`_data/build/repair_chain.py` runs offline against a read-only held `pic.sqlite`, the
existing public projections and two cached Census responses. The input files and exact
byte hashes are recorded in the private data cache’s
`manifests/2026-09-11-chain-geography.json`; the responses live in
`build/chain-geography/` with their acquisition receipt. The SQLite source remains in
the governed internal estate and is not shipped in this repository.

Run from the repository root, using explicit paths:

```text
python _data/build/repair_chain.py --source <pic.sqlite> --cbp-dir <cached-responses> --dry-run
python _data/build/repair_chain.py --source <pic.sqlite> --cbp-dir <cached-responses> --chain <copy-of-chain-data.json> --viz <copy-of-viz-data.json>
python -m unittest _data.build.test_chain_geography -v
```

Set `CHAIN_SOURCE` to the held SQLite path when running the tests to include the
source-row comparison; without it that one check is explicitly skipped. The repair
rejects changed input bytes, missing or duplicate county cells, wrong industries,
missing employment values and source-field drift. It preserves the original public
card limits of fourteen process labels and twelve material labels. Repeated execution
must preserve the held-out disclosure and reproduce identical output bytes.

This is a scoped repair of existing projections. It does not re-extract company
narratives, membership or the application export, and it stops if previously excluded
records newly qualify. The legacy `build_chain.py` and `build_viz.py` still contain
obsolete paths and import-time source operations; do not use them as diagnostics.

Changes to published figures and interpretations are recorded in
[`CORRECTIONS.md`](../CORRECTIONS.md).
