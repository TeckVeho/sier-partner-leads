"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { createContactLog, deleteContactLog } from "@/app/actions/contact-logs";
import { CONTACT_TYPE_LABELS, type ContactTypeKey } from "@/lib/contact/labels";
import { formatDateTime } from "@/lib/utils";

export type ContactLogRow = {
  id: string;
  contactType: ContactTypeKey;
  content: string;
  contactedAt: string;
  recordedBy: { name: string } | null;
};

export function ContactLogSection({
  companyId,
  initialLogs,
  framed = true,
}: {
  companyId: string;
  initialLogs: ContactLogRow[];
  framed?: boolean;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [contactType, setContactType] = useState<ContactTypeKey>("phone");
  const [content, setContent] = useState("");
  const [contactedAt, setContactedAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const log = await createContactLog({
          companyId,
          contactType,
          content,
          contactedAt: contactedAt || undefined,
        });
        setLogs((prev) => [
          {
            id: log.id,
            contactType: log.contactType as ContactTypeKey,
            content: log.content,
            contactedAt: log.contactedAt.toISOString(),
            recordedBy: log.recordedBy,
          },
          ...prev,
        ]);
        setContent("");
        setContactedAt("");
        setMessage("コンタクト記録を追加しました");
      } catch (err) {
        setError(err instanceof Error ? err.message : "保存に失敗しました");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteContactLog(id, companyId);
      setLogs((prev) => prev.filter((log) => log.id !== id));
    });
  }

  return (
    <div className={framed ? "rounded-lg border border-border bg-white px-4 py-3" : undefined}>
      <h2 className="text-[14px] font-semibold">コンタクト履歴</h2>
      <p className="mt-1 text-[12px] text-muted">電話・メール・訪問など、先方とのやり取りを記録します。</p>

      {message ? <Alert variant="success" className="my-3">{message}</Alert> : null}
      {error ? <Alert variant="danger" className="my-3">{error}</Alert> : null}

      <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-md border border-border bg-surface-subtle p-3">
        <div className="grid gap-2 md:grid-cols-2">
          <Select
            value={contactType}
            onChange={(e) => setContactType(e.target.value as ContactTypeKey)}
          >
            {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <input
            type="datetime-local"
            className="h-8 rounded-md border border-border bg-white px-2 text-[13px]"
            value={contactedAt}
            onChange={(e) => setContactedAt(e.target.value)}
            placeholder="日時（空欄=現在）"
          />
        </div>
        <textarea
          className="min-h-20 w-full rounded-md border border-border bg-white px-3 py-2 text-[13px]"
          placeholder="内容（先方の反応、次のアクションなど）"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <div className="flex justify-end">
          <Button type="submit" loading={pending}>
            記録を追加
          </Button>
        </div>
      </form>

      <ul className="mt-4 space-y-2">
        {logs.length === 0 ? (
          <li className="text-[13px] text-muted">コンタクト記録はまだありません。</li>
        ) : (
          logs.map((log) => (
            <li key={log.id} className="rounded-md border border-border px-3 py-2 text-[13px]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {CONTACT_TYPE_LABELS[log.contactType]} · {formatDateTime(log.contactedAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-text">{log.content}</p>
                  {log.recordedBy ? (
                    <p className="mt-1 text-[12px] text-muted">記録: {log.recordedBy.name}</p>
                  ) : null}
                </div>
                <Button variant="ghost" size="md" loading={pending} onClick={() => handleDelete(log.id)}>
                  削除
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
