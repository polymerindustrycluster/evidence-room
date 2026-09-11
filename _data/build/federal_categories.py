"""Exhaust USAspending transaction-category pages and retain request/response receipts."""
import hashlib
import json
import math
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from contact import UA
from footprints import PIC12

URL = "https://api.usaspending.gov/api/v2/search/spending_by_category/{category}/"


def request_payload(fy, codes=None):
    payload = {"filters": {
        "time_period": [{"start_date": f"{fy - 1}-10-01", "end_date": f"{fy}-09-30"}],
        "place_of_performance_locations": [
            {"country": "USA", "state": "OH", "county": c[2:]} for c in PIC12]},
        "spending_level": "transactions", "limit": 100}
    if codes:
        payload["filters"]["award_type_codes"] = codes
    return payload


def validate_receipts(category, fy, codes, receipts):
    """Replay the retained source bytes, request filters and contiguous page walk."""
    if not receipts:
        raise ValueError("Missing page receipts")
    rows, seen = [], set()
    for page, receipt in enumerate(receipts, 1):
        expected = {**request_payload(fy, codes), "page": page}
        if receipt["request"] != expected or receipt["url"] != URL.format(category=category):
            raise ValueError("Receipt request changed filters, endpoint or page order")
        body = receipt["response_text"].encode("utf-8")
        if hashlib.sha256(body).hexdigest() != receipt["sha256"]:
            raise ValueError("Receipt response bytes do not match their hash")
        data = json.loads(body)
        chunk, more = validate_page(data, page, category)
        if (receipt["row_count"] != len(chunk) or receipt["page_metadata"] != data["page_metadata"]
                or more != (page < len(receipts))):
            raise ValueError("Receipt count, metadata or terminal page disagrees with response")
        for row in chunk:
            if row["code"] in seen:
                raise ValueError("Repeated category in retained source pages")
            seen.add(row["code"])
        rows.extend(chunk)
    return rows


def validate_page(data, page, category, limit=100):
    if not isinstance(data, dict) or data.get("category") != category:
        raise ValueError("Missing or incorrect category response")
    if data.get("spending_level") != "transactions" or data.get("limit") != limit:
        raise ValueError("Response changed transaction grain or page limit")
    meta = data.get("page_metadata")
    rows = data.get("results")
    if not isinstance(meta, dict) or type(meta.get("page")) is not int or meta["page"] != page:
        raise ValueError("Missing or incorrect pagination page")
    if type(meta.get("hasNext")) is not bool or "next" not in meta:
        raise ValueError("Missing terminal pagination evidence")
    if meta["hasNext"]:
        if type(meta["next"]) is not int or meta["next"] != page + 1:
            raise ValueError("Invalid next-page pointer")
    elif meta["next"] is not None:
        raise ValueError("Terminal page has a next-page pointer")
    if not isinstance(rows, list) or len(rows) > limit or (meta["hasNext"] and len(rows) != limit):
        raise ValueError("Incomplete or malformed result page")
    for row in rows:
        if not isinstance(row, dict) or "code" not in row or "name" not in row:
            raise ValueError("Malformed category row")
        amount = row.get("amount")
        if type(amount) not in (int, float) or not math.isfinite(amount):
            raise ValueError("Missing or non-finite obligation")
    return rows, meta["hasNext"]


def post(url, payload):
    request = urllib.request.Request(url, data=json.dumps(payload).encode(),
        headers={**UA, "Content-Type": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError):
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def fetch_categories(category, fy, codes=None, receipt_dir=None, request=post):
    """Filter only after exhaustion. Signed amounts, including de-obligations, survive."""
    payload = request_payload(fy, codes)
    rows, seen, receipts = [], set(), []
    group = "-".join(codes) if codes else "all"
    url = URL.format(category=category)
    directory = Path(receipt_dir) if receipt_dir else None
    if directory:
        directory.mkdir(parents=True, exist_ok=True)
    for page in range(1, 1001):
        payload["page"] = page
        body = request(url, payload)
        data = json.loads(body)
        chunk, has_next = validate_page(data, page, category)
        for row in chunk:
            code = row["code"]
            if code in seen:
                raise ValueError(f"Repeated category {code!r} in FY{fy} {category}")
            seen.add(code)
        receipt = {"url": url, "request": json.loads(json.dumps(payload)),
            "fetched": datetime.now(timezone.utc).isoformat(),
            "sha256": hashlib.sha256(body).hexdigest(),
            "response_text": body.decode("utf-8"),
            "row_count": len(chunk), "page_metadata": data["page_metadata"]}
        if directory:
            stem = f"{fy}-{category}-{group}-page{page}"
            (directory / f"{stem}.response.json").write_bytes(body)
            (directory / f"{stem}.receipt.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
        receipts.append(receipt)
        rows.extend(chunk)
        if not has_next:
            return rows, receipts
    raise ValueError("Pagination exceeded 1,000 pages without a terminal response")
