---
name: signal-extract
description: 地方 SIer の公開サイト本文から ARO のシグナルと調査メモを抽出し、根拠付き JSON だけを返す。点数は付けない。
---

# シグナル抽出

企業サイトの公開本文だけを見て、協業判断に使うシグナルと、人が読む調査メモを作る。
ARO のジョブがこのスキルを読み、構造化 JSON を保存する。点数は付けない。

## やってはいけないこと

- 点数・優先度（A/B/C）を付けない。採点は `scoring_rules` が正。調査メモにも優先度のコメントを書かない。
- 本文に無いことを推測で埋めない。売上・利益・従業員数の推測はしない。
- 根拠テキストが書けないシグナルは出力しない。
- 個人の氏名・電話・メールを本文から拾って出力しない。
- 社名・所在県は名簿が正。調査メモで上書き・訂正しない。

## 判定対象

| signalType | 意味 | polarity |
|---|---|---|
| legacy_asset | COBOL / VB / Access / オフコン / オンプレ / 受託の運用保守など、レガシー保守基盤がある | positive |
| stock_revenue | 保守契約・運用契約などストック収益がある | positive |
| crisis_awareness | 新規事業、脱下請け、DX、中期での変革など危機意識がある | positive |
| ai_inhouse | **自社で**生成AI・内製開発を打ち出している（他社製品の販売・導入支援だけは該当しない） | exclusion |
| subsidiary | 大手 SIer / メーカーの完全子会社である | exclusion |
| customer_overlap | 公開情報から、既存パートナーと明らかに同じ顧客層で競合する | negative |

## 除外の注意

- 「生成AIに対応します」「ChatGPT を業務で使えます」は、自社プロダクト内製とは限らない。内製・自社開発の根拠が無いなら `ai_inhouse` を出さない。
- グループ会社でも、完全子会社と読めないなら `subsidiary` を出さない。

## 調査メモ

人が候補詳細で読む短い整理。シグナルの根拠とは別で、点数には使わない。

- `summary` は1〜2文。何の会社かだけ。
- 各項目は本文にあることだけ。無い項目は空文字または空配列。
- `evidenceText` は本文の短い引用。出典 URL は呼び出し側が付ける。
- 全体が薄いときは `profile.insufficient` を true にする。呼び出し側は前回の調査メモを残す。

## 本文が薄いとき

判断材料が足りなければシグナルを空配列にし、`insufficient` を true にする。
呼び出し側は既存シグナルと既存の調査メモを消さない。

## 出力（JSON のみ）

説明文やマークダウンは出さない。次の形だけを返す。

```json
{
  "signals": [
    {
      "signalType": "legacy_asset",
      "polarity": "positive",
      "evidenceText": "本文の短い引用と、なぜ該当するかの一文",
      "confidence": 0.8
    }
  ],
  "profile": {
    "summary": "何の会社かを1〜2文。本文に基づく。",
    "businessModel": "contracting",
    "offerings": ["基幹保守", "受託開発"],
    "customers": "地域の中堅製造など。無ければ空文字",
    "techAssets": "COBOL / オンプレ保守など。無ければ空文字",
    "changeSignals": "DX支援を掲げている、など。無ければ空文字",
    "cautions": "子会社・自社AI内製など紹介しにくい点。無ければ空文字",
    "establishedYear": "設立年。本文に数字があるときだけ",
    "employeeScale": "従業員規模。本文に数字があるときだけ",
    "evidenceText": "本文の短い引用",
    "insufficient": false
  },
  "insufficient": false,
  "notes": "補足があれば短く。不要なら空文字"
}
```

`businessModel` は `contracting` / `product` / `staffing` / `mixed` / `unknown` のいずれか。
`confidence` は 0 から 1。根拠が弱いシグナルは出さない（低 confidence で埋めない）。
調査メモも本文に無いことを埋めない。判断材料が足りない項目は空文字にし、全体が薄いときだけ `profile.insufficient` を true にする。
