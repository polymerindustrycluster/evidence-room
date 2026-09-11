"""Fetch the two NSF award records named as exclusions in federal-money."""
import argparse
import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from contact import UA


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    for award in ("2532460", "2330145"):
        path = out / f"nsf-{award}.json"
        if path.exists():
            raise SystemExit(f"Refusing to overwrite {path.name}")
        url = f"https://api.nsf.gov/services/v1/awards/{award}.json"
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as response:
            body = response.read()
        records = json.loads(body)["response"]["award"]
        if len(records) != 1 or records[0]["id"] != award:
            raise ValueError(f"Unexpected NSF award response: {award}")
        # Only fields consumed by the article belong in the reusable cache. NSF's
        # response also includes personal contact fields that this analysis does not use.
        selected = {key: records[0][key] for key in
                    ("id", "title", "estimatedTotalAmt", "fundsObligatedAmt", "expDate")}
        result = {"source_url": url, "fetched": datetime.now(timezone.utc).isoformat(),
                  "response_sha256": hashlib.sha256(body).hexdigest(),
                  "response": {"award": [selected]}}
        path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(f"Saved NSF award {award}")


if __name__ == "__main__":
    main()
