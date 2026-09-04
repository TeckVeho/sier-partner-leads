import { prisma } from "@/lib/db";

export async function checkDatabaseConnection(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    if (message.includes("Can't reach database server") || message.includes("ECONNREFUSED")) {
      return {
        ok: false,
        message:
          "PostgreSQL に接続できません。`docker-compose up -d` で DB を起動し、`npm run db:migrate` を実行してください。",
      };
    }
    if (message.includes("does not exist") || message.includes("P2021")) {
      return {
        ok: false,
        message:
          "データベースの初期化が未完了です。`npm run db:migrate` と `npm run db:seed` を実行してください。",
      };
    }
    return {
      ok: false,
      message: `データベースエラー: ${message}`,
    };
  }
}
