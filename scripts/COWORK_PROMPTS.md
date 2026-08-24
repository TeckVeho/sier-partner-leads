# Cowork に貼る指示文

Slack 通知先は DM `D0B8J0CJNUS`。該当候補が0件の日は送らない。

## 初回セットアップ（人側）

```bash
git clone https://github.com/TeckVeho/sier-partner-leads.git
cd sier-partner-leads
gh auth status   # 未認証なら gh auth login
```

その後、Cowork のプロジェクト設定で、clone したフォルダのパスをコンテキストに追加する。

## 日次スケジュールタスク（一次スクリーニング → 高スコア深掘り → Issue化 → Slack）

```
sier-partner-screening スキルを使って、地方SIerパートナー候補の日次パイプラインを実行して。

対象県: 群馬・栃木・茨城
リポジトリ: [cloneしたローカルパス]
Slack通知先: D0B8J0CJNUS（自分自身へのDM）

手順:
1. data/candidates.csv を読み、既に登録済みの企業を把握する（再取得・再スコアリングしない）
2. references/data-sources.md の情報源から、まだ登録されていない新規企業を探す
3. SKILL.md の ICP 基準でルールベース・スクリーニングする
4. 結果を一時CSVにまとめ、scripts/git_append.py で追記
5. 追加件数が1件以上なら git add -A && git commit -m "候補更新: 日付 新規N件" && git push
6. 今回追加された候補のうち、legacy_score + 加点合計が7点以上のものについて:
   a. 実サイトを自分で直接読み直す。空欄・取得失敗を「候補」と誤判定していないか、
      A型/B型のサブタイプ、既存パートナー(群馬・SDC)との競合有無を再確認する
   b. 除外すべきと判断したら、その理由をcandidates.csvのverdictに追記して終了
      (Issue化しない、Slack通知もしない)
   c. 候補として問題なければ、GitHub Issueを作成しラベル「要確認」を付ける
   d. Slackの D0B8J0CJNUS に通知する。以下の内容を含める:
      - 企業名・都道府県・サブタイプ・スコア
      - 深掘りで分かった判断根拠(1-2行)
      - Issueへのリンク
      - 文末に「※最終判断は商談前に確認してください」と明記する
7. 該当候補が0件の日はSlack通知しない
```

## Slack 通知メッセージの型

```
:mag: 新規パートナー候補（要確認）

*常陽コンピューターサービス*（茨城・水戸市）
サブタイプ: A型(受託) / スコア: 8点

奉行の販売店で受託計算業務出自。450社超に給与計算BPOを提供しており、
毎年の法改正対応が固定費化している点が刺さりそう。生成AI等の記述なし。

Issue: <リンク>

※最終判断は商談前に確認してください
```
