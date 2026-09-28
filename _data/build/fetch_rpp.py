"""Acquire BEA metro prices with their boundary definition and byte-level receipt.

Usage: python fetch_rpp.py --output-dir <fresh-private-cache>
Optional --archive <held-MARPP.zip> extracts the already acquired official archive.
The output directory must be new. Only CSV, footnotes and a receipt are persisted;
no API key is needed and the old rpp.json cache is never overwritten.
"""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import zipfile
from geography_checks import bea_boundary

URL = 'https://apps.bea.gov/regional/zip/MARPP.zip'


def extract(archive):
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        names = [n for n in z.namelist() if n.startswith('MARPP_MSA_') and n.endswith('.csv')]
        if len(names) != 1:
            raise ValueError('Expected exactly one MARPP metro CSV')
        table = z.read(names[0])
        foot = z.read('MARPP__Footnotes.html')
    bea_boundary(foot)
    reader = csv.DictReader(io.StringIO(table.decode('utf-8-sig')), skipinitialspace=True)
    if '2024' not in (reader.fieldnames or []):
        raise ValueError('MARPP table lacks the required 2024 comparison year')
    metros = [r for r in reader if r.get('LineCode') == '1' and
              'Metropolitan Statistical Area' in (r.get('GeoName') or '')]
    if not metros or len({r['GeoFIPS'] for r in metros}) != len(metros):
        raise ValueError('Empty or duplicate metro price rows')
    return {Path(names[0]).name: table, 'MARPP__Footnotes.html': foot}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', required=True, type=Path)
    parser.add_argument('--archive', type=Path)
    args = parser.parse_args()
    if args.output_dir.exists():
        raise SystemExit('Output directory already exists; choose a fresh private cache')
    if args.archive:
        body = args.archive.read_bytes()
    else:
        with urllib.request.urlopen(URL, timeout=90) as response:
            body = response.read()
    files = extract(body)
    receipt = {'source_url': URL, 'recorded_at': datetime.now(timezone.utc).isoformat(),
               'method': 'extract held official ZIP' if args.archive else 'download official ZIP',
               'archive_sha256': hashlib.sha256(body).hexdigest(), 'archive_bytes': len(body),
               'boundary_vintage': bea_boundary(files['MARPP__Footnotes.html'])['vintage'], 'comparison_year': 2024,
               'files': {n: {'sha256': hashlib.sha256(b).hexdigest(), 'bytes': len(b)} for n,b in files.items()}}
    args.output_dir.mkdir(parents=True, exist_ok=False)
    for name, content in files.items():
        (args.output_dir/name).write_bytes(content)
    (args.output_dir/'rpp-receipt.json').write_text(json.dumps(receipt, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(receipt, indent=2))
