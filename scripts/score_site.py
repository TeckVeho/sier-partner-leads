#!/usr/bin/env python3
"""一次スクリーニング用のルールベース採点。

サイト本文を自分で読んで定性判断する処理はここには置かない。
空欄・取得失敗はスコア0・fetched_ok=false にし、候補扱いしない。
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.error import URLError
from urllib.request import Request, urlopen


MIN_TEXT_CHARS = 120

TARGET_PREFECTURES = ("群馬", "栃木", "茨城")
TARGET_CITIES = (
    "前橋",
    "高崎",
    "太田",
    "伊勢崎",
    "桐生",
    "宇都宮",
    "小山",
    "栃木市",
    "水戸",
    "つくば",
    "日立",
    "土浦",
)
SIER_KEYWORDS = (
    "システム開発",
    "システムインテグレ",
    "sier",
    "受託開発",
    "受託",
    "情報処理",
    "ソフトウェア開発",
    "業務システム",
)
CONTACT_KEYWORDS = ("お問い合わせ", "お問合せ", "tel", "電話", "所在地", "本社")
PACKAGE_KEYWORDS = ("奉行", "obc", "オービックビジネス", "pca", "販売店")
BPO_KEYWORDS = ("給与計算", "受託計算", "計算センター", "bpo", "アウトソーシング", "給与処理")
LAW_KEYWORDS = ("法改正",)
AI_KEYWORDS = ("生成ai", "chatgpt", "生成系ai", "生成人工知能")
A_TYPE_KEYWORDS = BPO_KEYWORDS
B_TYPE_KEYWORDS = ("システム開発", "受託開発", "システム構築", "システムインテグレ")


class _HTMLTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._chunks: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "noscript"}:
            self._skip += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript"} and self._skip:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if self._skip:
            return
        text = data.strip()
        if text:
            self._chunks.append(text)

    def text(self) -> str:
        return "\n".join(self._chunks)


def html_to_text(html: str) -> str:
    parser = _HTMLTextExtractor()
    parser.feed(html)
    parser.close()
    return re.sub(r"\n{3,}", "\n\n", parser.text()).strip()


def fetch_url(url: str, timeout: float = 15.0) -> str:
    request = Request(
        url,
        headers={"User-Agent": "sier-partner-leads-score/1.0"},
    )
    with urlopen(request, timeout=timeout) as response:
        raw = response.read()
        charset = response.headers.get_content_charset() or "utf-8"
    return raw.decode(charset, errors="replace")


def contains_any(text: str, keywords: Iterable[str]) -> bool:
    return any(keyword in text for keyword in keywords)


def detect_subtype(text: str) -> str:
    is_a = contains_any(text, A_TYPE_KEYWORDS)
    is_b = contains_any(text, B_TYPE_KEYWORDS)
    if is_a and not is_b:
        return "A型(受託)"
    if is_b and not is_a:
        return "B型(開発)"
    if is_a and is_b:
        return "A型(受託)"
    return ""


def score_text(text: str) -> dict[str, object]:
    compact = (text or "").strip()
    lowered = compact.lower()

    if len(compact) < MIN_TEXT_CHARS:
        return {
            "fetched_ok": False,
            "legacy_score": 0,
            "bonus_score": 0,
            "total_score": 0,
            "subtype": "",
            "verdict": "取得失敗/空欄",
            "rationale": "本文が空、または短すぎるため候補判定しない",
        }

    legacy = 0
    reasons: list[str] = []

    if contains_any(compact, TARGET_PREFECTURES):
        legacy += 3
        reasons.append("対象県の言及あり(+3)")
    if contains_any(lowered, SIER_KEYWORDS):
        legacy += 3
        reasons.append("SIer/受託の言及あり(+3)")
    legacy += 2
    reasons.append("事業本文が十分読める(+2)")
    if contains_any(compact, TARGET_CITIES):
        legacy += 1
        reasons.append("市区町村拠点の言及あり(+1)")
    if contains_any(lowered, CONTACT_KEYWORDS):
        legacy += 1
        reasons.append("会社情報/連絡先の言及あり(+1)")

    bonus = 0
    if contains_any(lowered, PACKAGE_KEYWORDS):
        bonus += 2
        reasons.append("業務パッケージ販売店(+2)")
    if contains_any(lowered, BPO_KEYWORDS):
        bonus += 2
        reasons.append("BPO/受託計算(+2)")
    if contains_any(compact, LAW_KEYWORDS):
        bonus += 1
        reasons.append("法改正対応(+1)")
    if not contains_any(lowered, AI_KEYWORDS):
        bonus += 1
        reasons.append("生成AI記述なし(+1)")

    return {
        "fetched_ok": True,
        "legacy_score": legacy,
        "bonus_score": bonus,
        "total_score": legacy + bonus,
        "subtype": detect_subtype(lowered),
        "verdict": "",
        "rationale": " / ".join(reasons),
    }


def score_source(
    *,
    company_name: str,
    url: str = "",
    html: str | None = None,
    text: str | None = None,
    prefecture: str = "",
    city: str = "",
    source: str = "",
    added_at: str = "",
) -> dict[str, str]:
    fetched_ok = True
    body = (text or "").strip()
    error = ""

    if html is not None:
        body = html_to_text(html)
    elif text is None and url:
        try:
            body = html_to_text(fetch_url(url))
        except (URLError, TimeoutError, ValueError, OSError) as exc:
            fetched_ok = False
            error = str(exc)
            body = ""

    scored = score_text(body)
    if not fetched_ok:
        scored.update(
            {
                "fetched_ok": False,
                "legacy_score": 0,
                "bonus_score": 0,
                "total_score": 0,
                "subtype": "",
                "verdict": "取得失敗/空欄",
                "rationale": f"サイト取得失敗のため候補判定しない: {error}",
            }
        )

    return {
        "company_name": company_name,
        "prefecture": prefecture,
        "city": city,
        "website": url,
        "subtype": str(scored["subtype"]),
        "legacy_score": str(scored["legacy_score"]),
        "bonus_score": str(scored["bonus_score"]),
        "total_score": str(scored["total_score"]),
        "source": source,
        "fetched_ok": "true" if scored["fetched_ok"] else "false",
        "verdict": str(scored["verdict"]),
        "rationale": str(scored["rationale"]),
        "issue_url": "",
        "added_at": added_at,
        "updated_at": added_at,
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="サイト本文をルールベースで採点する")
    parser.add_argument("--name", required=True, help="会社名")
    parser.add_argument("--url", default="", help="公式サイトURL")
    parser.add_argument("--html-file", help="保存済みHTMLを採点する")
    parser.add_argument("--text-file", help="保存済みテキストを採点する")
    parser.add_argument("--prefecture", default="")
    parser.add_argument("--city", default="")
    parser.add_argument("--source", default="")
    parser.add_argument("--added-at", default="")
    parser.add_argument("--out", help="1行CSVの出力先。省略時はJSONを標準出力")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    html = Path(args.html_file).read_text(encoding="utf-8") if args.html_file else None
    text = Path(args.text_file).read_text(encoding="utf-8") if args.text_file else None

    row = score_source(
        company_name=args.name,
        url=args.url,
        html=html,
        text=text,
        prefecture=args.prefecture,
        city=args.city,
        source=args.source,
        added_at=args.added_at,
    )

    if args.out:
        out_path = Path(args.out)
        exists = out_path.exists()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("a", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(row.keys()))
            if not exists:
                writer.writeheader()
            writer.writerow(row)
    else:
        json.dump(row, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
