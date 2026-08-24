import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import score_site  # noqa: E402


JOYO_SAMPLE = """
常陽コンピューターサービスは茨城県水戸市のシステム会社です。
奉行の販売店として、450社超に給与計算BPOを提供しています。
受託計算業務を出自とし、毎年の法改正対応を継続しています。
会社概要・所在地・電話番号はこちら。お問い合わせは下記まで。
""" * 2


class ScoreSiteTest(unittest.TestCase):
    def test_blank_text_is_not_a_candidate(self) -> None:
        scored = score_site.score_text("   ")
        self.assertFalse(scored["fetched_ok"])
        self.assertEqual(scored["legacy_score"], 0)
        self.assertEqual(scored["total_score"], 0)
        self.assertEqual(scored["verdict"], "取得失敗/空欄")

    def test_short_placeholder_is_not_a_candidate(self) -> None:
        scored = score_site.score_text("coming soon")
        self.assertFalse(scored["fetched_ok"])
        self.assertEqual(scored["total_score"], 0)

    def test_fetch_error_does_not_score(self) -> None:
        row = score_site.score_source(
            company_name="茨城計算センター",
            url="https://this-domain-should-not-exist.invalid",
        )
        self.assertEqual(row["fetched_ok"], "false")
        self.assertEqual(row["legacy_score"], "0")
        self.assertEqual(row["verdict"], "取得失敗/空欄")

    def test_high_signal_site_reaches_threshold(self) -> None:
        row = score_site.score_source(
            company_name="常陽コンピューターサービス",
            text=JOYO_SAMPLE,
            prefecture="茨城",
            city="水戸市",
        )
        self.assertEqual(row["fetched_ok"], "true")
        self.assertEqual(row["subtype"], "A型(受託)")
        self.assertGreaterEqual(int(row["total_score"]), 7)


if __name__ == "__main__":
    unittest.main()
