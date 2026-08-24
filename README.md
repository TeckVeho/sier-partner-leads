# sier-partner-leads

群馬・栃木・茨城の地方SIerパートナー候補を日次で蓄積するリポジトリ。

一次スクリーニングはルールベース、高スコアだけ Cowork がサイトを読み直す。
Slack 通知は「確定候補」ではなく **要確認**。商談前の最終判断は人。

## 構成

```
├── SKILL.md
├── data/candidates.csv
├── references/
│   ├── data-sources.md
│   └── scoring.md
└── scripts/
    ├── score_site.py
    ├── git_append.py
    └── COWORK_PROMPTS.md
```

## 初回セットアップ

```bash
git clone https://github.com/TeckVeho/sier-partner-leads.git
cd sier-partner-leads
gh auth status   # 未認証なら gh auth login
```

Cowork のプロジェクトに、clone したパスを追加する。
日次タスクの文面は `scripts/COWORK_PROMPTS.md` を貼る。

Slack 通知先は DM `D01BG830F9U`。他ファイルと食い違ったら `CONTEXT.md` を正とする。

## スクリプト

一時CSVを追記する（既存行は上書きしない）:

```bash
python3 scripts/git_append.py --repo . --input /tmp/new_candidates.csv
```

1社の本文をルールベース採点する:

```bash
python3 scripts/score_site.py --name "会社名" --url "https://example.com"
```

空欄・取得失敗は `fetched_ok=false` になり、スコアは付けない。

## スコア7+の扱い

1. Cowork が実サイトを読み直す
2. 除外なら `verdict` に理由を書いて Issue / Slack は出さない
3. 問題なければ GitHub Issue（ラベル「要確認」）と Slack 通知
4. 0件の日は Slack しない
