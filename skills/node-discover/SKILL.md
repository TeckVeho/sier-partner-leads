---
name: node-discover
description: 既存パートナーの公開ページから、所属しそうな名簿ノードを提案する。ノードは作らない。人が確定する。新しい URL は作らない。
---

# ノード提案

既存パートナーの公式サイト本文だけを見て、
その会社が所属していそうな「紹介ノード」（県協会、ベンダー販売店網、金融機関の紹介先など）を列挙する。
Paag は提案を pending で保存する。採用するまでノードは作らない。

## やってはいけないこと

- 本文に無い協会名・名簿 URL を推測で作らない。
- 点数や優先度を付けない。
- 個人の氏名・電話・メールを出さない。
- 説明文やマークダウンを出さない。JSON だけ返す。
- 「ありそう」だけの候補を出さない。根拠テキストが書けない行は出さない。
- 入力ページに無い `sourcePageId` や `rosterUrl` を作らない。
- 間接的な推測（県にあるから県協会に入っているはず、など）は出さない。

## 判定対象

| nodeType | 意味 |
|---|---|
| association | 県・地域の情報サービス産業協会、商工会議所、組合など |
| vendor | ベンダーの販売店・パートナー一覧 |
| financial | 地銀・信金などの紹介先・取引先ネットワーク |

| relationType | 意味 |
|---|---|
| member | 協会・組合の会員 |
| certified_partner | ベンダー認定パートナー |
| reseller | 販売店・リセラー |
| bank_relation | 金融機関との取引・紹介関係 |

## 本文が薄いとき

判断材料が足りなければ `nodes` を空配列にし、`insufficient` を true にする。

## 名簿 URL

本文中に会員名簿・加盟店一覧などの **具体的な URL が出ているときだけ** `rosterUrl` に入れる。
無いなら空文字。推測のパスを組み立てない。

## 出力（JSON のみ）

```json
{
  "nodes": [
    {
      "name": "群馬県情報サービス産業協会",
      "nodeType": "association",
      "relationType": "member",
      "rosterUrl": "",
      "sourcePageId": "PAGE_2",
      "evidenceQuote": "群馬県情報サービス産業協会の正会員です",
      "confidence": 0.86
    }
  ],
  "insufficient": false,
  "notes": "補足があれば短く。不要なら空文字"
}
```

`confidence` は 0 から 1。0.75 未満は出さない。
`evidenceQuote` は入力ページ本文にそのまま存在する連続引用だけにする。
