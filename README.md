# Paag

地方 SIer パートナー開拓支援システム。既存 Cowork スキル `sier-partner-screening` の後継。

## 構成

| パス | 内容 |
|---|---|
| `app/` | Next.js App Router（Web UI + API） |
| `components/` | UI コンポーネント（dan1-new-system 準拠） |
| `prisma/` | PostgreSQL スキーマ・マイグレーション |
| `lib/` | 認証・DB・ユーティリティ |
| `data/` | レガシー CSV（移行元） |
| `scripts/` | レガシー Python パイプライン |
| `docs/` | 設計書・実装計画 |
| `skills/` | LLM タスクの正本（シグナル抽出・依頼下書き） |

## ローカル開発

### 一括セットアップ（初回）

```bash
npm install
npm run dev:setup   # PostgreSQL起動 + migrate + seed
npm run dev
```

### 手動セットアップ

```bash
docker-compose up -d          # PostgreSQL（ポート 5433）
cp .env.example .env          # 初回のみ
npm install
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

http://localhost:3000 にアクセス。

- メール: `admin@example.com`
- パスワード: `admin`（`.env` の `DEV_LOGIN_PASSWORD`）
- AI: 名簿クロール・再調査・依頼下書き・ノード提案は Gemini 必須です。`.env` に `GEMINI_API_KEY` を置きます。未設定だと実行はエラーになります。

### トラブルシューティング

| 症状 | 対処 |
|---|---|
| 「PostgreSQL に接続できません」 | `docker-compose up -d` を実行 |
| 「データベースの初期化が未完了」 | `npm run db:migrate:deploy && npm run db:seed` |
| ポート 3000 が使用中 | 別プロセスを停止するか `next dev -p 3001` |
| `docker compose` が使えない | この環境では **`docker-compose`**（ハイフン付き）を使用 |

ヘルスチェック: http://localhost:3000/api/health

## デプロイ

AWS ECS Fargate + RDS PostgreSQL を前提としています。詳細は `docs/01_implementation_plan.md` を参照。

```bash
docker build -t paag .
```

## レガシーパイプライン

`scripts/` と `SKILL.md` は移行完了まで残しています。新システムの正データは PostgreSQL です。
