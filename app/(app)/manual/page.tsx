import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { ManualContent } from "@/components/manual/ManualContent";

export default function ManualPage() {
  return (
    <>
      <PageHeader
        title="取扱マニュアル"
        description="Paag の目的と、初回セットアップから日常の営業進行までの使い方です。"
        actions={
          <Link
            href="/dashboard"
            className="text-[13px] text-primary hover:underline"
          >
            ダッシュボードへ戻る
          </Link>
        }
      />
      <ManualContent />
    </>
  );
}
