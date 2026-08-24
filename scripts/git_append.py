#!/usr/bin/env python3
"""重複排除つきで candidates.csv に追記する。

既存行は上書きしない。新規行だけ末尾に足す。
重複キーは正規化した会社名、および website（空でなければ）。
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path
from urllib.parse import urlparse


CANONICAL_FIELDS = [
    "company_name",
    "prefecture",
    "city",
    "website",
    "subtype",
    "legacy_score",
    "bonus_score",
    "total_score",
    "source",
    "fetched_ok",
    "verdict",
    "rationale",
    "issue_url",
    "added_at",
    "updated_at",
]

LEGAL_SUFFIXES = (
    "株式会社",
    "有限会社",
    "合同会社",
    "(株)",
    "（株）",
    "(有)",
    "（有）",
    "㈱",
    "㈲",
)


def normalize_name(name: str) -> str:
    text = (name or "").strip().lower()
    text = text.replace(" ", "").replace("　", "")
    for suffix in LEGAL_SUFFIXES:
        text = text.replace(suffix.lower(), "")
    text = re.sub(r"[・.\-ー−_]", "", text)
    return text


def normalize_website(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        return ""
    if "://" not in raw:
        raw = "https://" + raw
    parsed = urlparse(raw)
    host = (parsed.netloc or parsed.path).lower()
    if host.startswith("www."):
        host = host[4:]
    path = parsed.path.rstrip("/")
    return f"{host}{path}"


def row_keys(row: dict[str, str]) -> set[str]:
    keys: set[str] = set()
    name = normalize_name(row.get("company_name", ""))
    if name:
        keys.add(f"name:{name}")
    site = normalize_website(row.get("website", ""))
    if site:
        keys.add(f"site:{site}")
    return keys


def read_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return [{field: (row.get(field) or "") for field in CANONICAL_FIELDS} for row in reader]


def write_rows(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CANONICAL_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in CANONICAL_FIELDS})


def append_new(existing: list[dict[str, str]], incoming: list[dict[str, str]]) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    seen: set[str] = set()
    for row in existing:
        seen |= row_keys(row)

    added: list[dict[str, str]] = []
    for row in incoming:
        keys = row_keys(row)
        if not keys:
            continue
        if keys & seen:
            continue
        normalized = {field: row.get(field, "") for field in CANONICAL_FIELDS}
        existing.append(normalized)
        added.append(normalized)
        seen |= keys
    return existing, added


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="candidates.csv に重複排除つきで追記する")
    parser.add_argument("--repo", default=".", help="リポジトリルート")
    parser.add_argument("--input", required=True, help="追記する一時CSV")
    parser.add_argument(
        "--target",
        default="data/candidates.csv",
        help="追記先（リポジトリからの相対パス）",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    repo = Path(args.repo).resolve()
    target = repo / args.target
    incoming_path = Path(args.input).resolve()

    if not incoming_path.exists():
        print(f"入力CSVがありません: {incoming_path}", file=sys.stderr)
        return 2

    existing = read_rows(target)
    incoming = read_rows(incoming_path)
    merged, added = append_new(existing, incoming)
    write_rows(target, merged)

    print(f"added={len(added)}")
    for row in added:
        print(f"+ {row.get('company_name', '')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
