"use client";

import { useMemo, useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSkill } from "@/app/actions/skills";
import { clearGeminiKey, saveGeminiKey, type GeminiKeyStatus } from "@/app/actions/llm-settings";
import { cn, formatDateTime } from "@/lib/utils";

export type SkillRecord = {
  id: string;
  title: string;
  usedBy: string;
  relativePath: string;
  description: string;
  content: string;
  updatedAt: string | null;
};

export function SkillsClient({
  initialSkills,
  gemini,
}: {
  initialSkills: SkillRecord[];
  gemini: GeminiKeyStatus;
}) {
  const [skills, setSkills] = useState(initialSkills);
  const [selectedId, setSelectedId] = useState(initialSkills[0]?.id ?? "");
  const selected = skills.find((skill) => skill.id === selectedId) ?? skills[0];
  const [draft, setDraft] = useState(selected?.content ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [keyPending, startKeyTransition] = useTransition();
  const [geminiStatus, setGeminiStatus] = useState(gemini);
  const [apiKey, setApiKey] = useState("");

  const dirty = Boolean(selected && draft !== selected.content);

  const preview = useMemo(() => {
    const line = draft.split("\n").find((item) => item.startsWith("description:"));
    return line?.replace(/^description:\s*/, "").replace(/^["']|["']$/g, "").trim() ?? selected?.description ?? "";
  }, [draft, selected?.description]);

  function selectSkill(id: string) {
    if (dirty && id !== selectedId) {
      const ok = window.confirm("保存していない変更があります。捨てて切り替えますか？");
      if (!ok) return;
    }
    const next = skills.find((skill) => skill.id === id);
    setSelectedId(id);
    setDraft(next?.content ?? "");
    setError(null);
    setMessage(null);
  }

  function handleSaveKey() {
    startKeyTransition(async () => {
      try {
        const next = await saveGeminiKey(apiKey);
        setGeminiStatus(next);
        setApiKey("");
        setMessage("Gemini キーを保存しました。すぐに使えます。");
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "キーの保存に失敗しました");
      }
    });
  }

  function handleClearKey() {
    startKeyTransition(async () => {
      try {
        const next = await clearGeminiKey();
        setGeminiStatus(next);
        setMessage(next.configured ? "画面のキーを消しました。環境変数のキーが残っています。" : "Gemini キーを削除しました。");
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "キーの削除に失敗しました");
      }
    });
  }

  function handleSave() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      try {
        const saved = await saveSkill(selected.id, draft);
        setSkills((prev) => prev.map((skill) => (skill.id === saved.id ? saved : skill)));
        setDraft(saved.content);
        setMessage("保存しました。次のジョブ実行から使われます。");
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存に失敗しました");
      }
    });
  }

  return (
    <>
      <PageHeader
        title="スキル管理"
        description="AI が読む判定手順です。点数はスコア設定、見方はこの Markdown が正本です。"
      />

      <section className="mb-4 rounded-xl border border-border bg-white px-4 py-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[14px] font-semibold text-text">Gemini キー</h2>
            <p className="mt-0.5 text-[12px] text-muted">再調査・依頼下書き・ノード提案に使います。キーは暗号化して保存し、画面には末尾だけ出します。</p>
          </div>
          {geminiStatus.configured ? (
            <Badge variant="success">
              接続済み{geminiStatus.hint ? ` ${geminiStatus.hint}` : ""}
              {geminiStatus.source === "env" ? "（環境変数）" : ""}
            </Badge>
          ) : (
            <Badge variant="danger">未設定</Badge>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            autoComplete="off"
            placeholder={geminiStatus.configured ? "新しいキーで上書き" : "Gemini API キー"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <div className="flex shrink-0 gap-2">
            <Button loading={keyPending} disabled={!apiKey.trim()} onClick={handleSaveKey}>
              登録
            </Button>
            <Button variant="secondary" loading={keyPending} disabled={geminiStatus.source !== "settings"} onClick={handleClearKey}>
              削除
            </Button>
          </div>
        </div>
      </section>

      {message ? <Alert variant="success" className="mb-3">{message}</Alert> : null}
      {error ? <Alert variant="danger" className="mb-3">{error}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-2">
          {skills.map((skill) => {
            const active = skill.id === selected?.id;
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => selectSkill(skill.id)}
                className={cn(
                  "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                  active ? "border-primary/25 bg-primary-light" : "border-border bg-white hover:bg-bg",
                )}
              >
                <p className="text-[13px] font-semibold text-text">{skill.title}</p>
                <p className="mt-0.5 text-[11px] text-muted">{skill.usedBy}</p>
              </button>
            );
          })}
        </aside>

        {selected ? (
          <section className="rounded-xl border border-border bg-white px-4 py-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-semibold text-text">{selected.title}</h2>
                <p className="mt-1 text-[12px] text-muted">{preview || selected.description}</p>
                <p className="mt-1 text-[11px] text-muted">
                  <code>{selected.relativePath}</code>
                  {selected.updatedAt ? ` · ${formatDateTime(selected.updatedAt)}` : ""}
                </p>
              </div>
              <Badge variant="muted">{selected.usedBy}</Badge>
            </div>

            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setMessage(null);
              }}
              spellCheck={false}
              className="min-h-[28rem] w-full resize-y rounded-md border border-border bg-bg px-3 py-2 font-mono text-[13px] leading-6 text-text outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] text-muted">
                {draft.length.toLocaleString()} 文字
                {dirty ? " · 未保存" : ""}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={!dirty || pending}
                  onClick={() => {
                    setDraft(selected.content);
                    setError(null);
                    setMessage(null);
                  }}
                >
                  元に戻す
                </Button>
                <Button loading={pending} disabled={!dirty} onClick={handleSave}>
                  保存
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <p className="text-[13px] text-muted">スキルがありません。</p>
        )}
      </div>
    </>
  );
}
