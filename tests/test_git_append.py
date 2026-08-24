import csv
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import git_append  # noqa: E402


class GitAppendTest(unittest.TestCase):
    def test_normalize_name_strips_legal_suffix(self) -> None:
        self.assertEqual(
            git_append.normalize_name("株式会社常陽コンピューターサービス"),
            git_append.normalize_name("常陽コンピューターサービス"),
        )

    def test_skips_duplicate_name_and_website(self) -> None:
        existing = [
            {
                "company_name": "株式会社SDC",
                "website": "https://www.example-sdc.jp/",
                **{field: "" for field in git_append.CANONICAL_FIELDS if field not in {"company_name", "website"}},
            }
        ]
        incoming = [
            {"company_name": "SDC", "website": ""},
            {"company_name": "別会社", "website": "https://example-sdc.jp"},
            {"company_name": "新規SIer", "website": "https://new.example.jp"},
        ]
        incoming = [
            {field: row.get(field, "") for field in git_append.CANONICAL_FIELDS}
            for row in incoming
        ]
        _, added = git_append.append_new(existing, incoming)
        self.assertEqual([row["company_name"] for row in added], ["新規SIer"])

    def test_writes_only_new_rows(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            target = repo / "data" / "candidates.csv"
            git_append.write_rows(
                target,
                [
                    {
                        field: "SDC" if field == "company_name" else ""
                        for field in git_append.CANONICAL_FIELDS
                    }
                ],
            )
            incoming = repo / "new.csv"
            with incoming.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=git_append.CANONICAL_FIELDS)
                writer.writeheader()
                writer.writerow(
                    {
                        field: "SDC" if field == "company_name" else ""
                        for field in git_append.CANONICAL_FIELDS
                    }
                )
                writer.writerow(
                    {
                        field: "常陽コンピューターサービス" if field == "company_name" else ""
                        for field in git_append.CANONICAL_FIELDS
                    }
                )

            code = git_append.main(["--repo", str(repo), "--input", str(incoming)])
            self.assertEqual(code, 0)
            rows = git_append.read_rows(target)
            self.assertEqual(
                [row["company_name"] for row in rows],
                ["SDC", "常陽コンピューターサービス"],
            )


if __name__ == "__main__":
    unittest.main()
