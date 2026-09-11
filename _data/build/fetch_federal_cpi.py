"""Fetch BLS monthly CPI and derive the calendar-year deflators used by federal-money."""
import argparse
import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from contact import UA

URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0?startyear=2019&endyear=2025&annualaverage=true"


def annual_rows(data):
    if data.get("status") != "REQUEST_SUCCEEDED":
        raise ValueError("BLS request did not succeed")
    series = data["Results"]["series"]
    if len(series) != 1 or series[0]["seriesID"] != "CUUR0000SA0":
        raise ValueError("Unexpected CPI series")
    rows = []
    for year in range(2019, 2026):
        monthly = [r for r in series[0]["data"] if int(r["year"]) == year
                   and r["period"] != "M13" and r["value"] != "-"]
        periods = sorted(r["period"] for r in monthly)
        expected = [f"M{m:02}" for m in range(1, 13) if not (year == 2025 and m == 10)]
        if periods != expected:
            raise ValueError(f"Unexpected published CPI months for {year}: {periods}")
        values = [float(r["value"]) for r in monthly]
        if not all(v > 0 for v in values):
            raise ValueError("Invalid CPI observation")
        rows.append({"year": year, "cpi": round(sum(values) / len(values), 3),
                     "months": len(values), "periods": periods})
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True, help="Fresh private raw-output directory")
    args = parser.parse_args()
    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    if (out / "federal_cpi.json").exists() or (out / "cpi-bls-response.json").exists():
        raise SystemExit("Refusing to overwrite CPI source evidence")
    with urllib.request.urlopen(urllib.request.Request(URL, headers=UA), timeout=90) as response:
        body = response.read()
    rows = annual_rows(json.loads(body))
    (out / "cpi-bls-response.json").write_bytes(body)
    doc = {"meta": {"source": "BLS CPI-U CUUR0000SA0 monthly observations",
        "url": URL, "fetched": datetime.now(timezone.utc).isoformat(),
        "sha256": hashlib.sha256(body).hexdigest()}, "rows": rows}
    (out / "federal_cpi.json").write_text(json.dumps(doc, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows)} CPI years; 2025 contains eleven published months")


if __name__ == "__main__":
    main()
