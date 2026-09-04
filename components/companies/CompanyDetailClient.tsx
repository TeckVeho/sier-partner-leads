"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Tabs } from "@/components/ui/tabs";
import { ContactLogSection, type ContactLogRow } from "@/components/contact/ContactLogSection";
import {
  COMPANY_STATUS_LABELS,
  PRIORITY_LABELS,
  PIPELINE_LABELS,
  SIGNAL_TYPE_LABELS,
  SIGNAL_POLARITY_LABELS,
  BUSINESS_MODEL_LABELS,
  INTRO_STATUS_LABELS,
  describeModelVersion,
  describeModelName,
} from "@/lib/scoring/labels";
import { cn, formatDate } from "@/lib/utils";
import { rerunSignalExtract, rescoreCompany } from "@/app/actions/companies";
import { generateIntroRequest } from "@/app/actions/intro-requests";

const TABS = ["survey", "intro", "activity"] as const;
type TabId = (typeof TABS)[number];

type CompanyDetailProps = {
  company: {
    id: string;
    name: string;
    url: string | null;
    prefecture: string | null;
    city: string | null;
    status: string;
    exclusionReason: string | null;
    discoveredAt: string;
    signals: Array<{
      id: string;
      signalType: string;
      polarity: string;
      evidenceText: string;
      sourceUrl: string;
      modelVersion: string | null;
    }>;
    scores: Array<{
      id: string;
      icpScore: number;
      pathScore: number;
      priority: string;
      breakdown: unknown;
      calculatedAt: string;
    }>;
    nodeMemberships: Array<{ node: { id: string; name: string; basePathScore: number } }>;
    introRequests: Array<{
      id: string;
      status: string;
      draftBody: string;
      viaPartner: { name: string };
      viaNode: { name: string };
    }>;
    pipelineEvents: Array<{
      id: string;
      stage: string;
      lostReason: string | null;
      note: string | null;
      occurredAt: string;
      recordedBy: { name: string } | null;
    }>;
    contactLogs: ContactLogRow[];
    profile: {
      summary: string;
      businessModel: string;
      offerings: string[];
      customers: string | null;
      techAssets: string | null;
      changeSignals: string | null;
      cautions: string | null;
      establishedYear: string | null;
      employeeScale: string | null;
      evidenceText: string | null;
      sourceUrl: string | null;
      modelVersion: string | null;
      extractedAt: string;
    } | null;
  };
  paths: Array<{
    partnerId: string;
    partnerName: string;
    introContactLevel: string | null;
    nodeId: string;
    nodeName: string;
    pathScore: number;
  }>;
};

function parseTab(value: string | null): TabId {
  return TABS.includes(value as TabId) ? (value as TabId) : "survey";
}

function priorityVariant(priority?: string) {
  if (priority === "A") return "success";
  if (priority === "hold") return "warning";
  if (priority === "C") return "muted";
  return "primary";
}

function polarityVariant(polarity: string) {
  if (polarity === "exclusion") return "danger";
  if (polarity === "negative") return "warning";
  return "success";
}

function introStatusVariant(status: string) {
  if (status === "accepted") return "success";
  if (status === "declined") return "danger";
  if (status === "approved" || status === "sent") return "primary";
  return "muted";
}

export function CompanyDetailClient({ company, paths }: CompanyDetailProps) {
  const [tab, setTabState] = useState<TabId>("survey");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const latestScore = company.scores[0];
  const latestStage = company.pipelineEvents[0]?.stage ?? "not_contacted";
  const outOfCoverage = Boolean(
    latestScore?.breakdown &&
      typeof latestScore.breakdown === "object" &&
      "priority:out_of_coverage" in (latestScore.breakdown as Record<string, unknown>),
  );
  const location = [company.prefecture, company.city].filter(Boolean).join(" ") || "所在地未設定";

  useEffect(() => {
    setTabState(parseTab(new URLSearchParams(window.location.search).get("tab")));
  }, []);

  function setTab(next: TabId) {
    setTabState(next);
    const url = new URL(window.location.href);
    if (next === "survey") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function runAction(action: () => Promise<unknown>, success: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage(success);
      } catch (e) {
        setError(e instanceof Error ? e.message : "操作に失敗しました");
      }
    });
  }

  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-text">{company.name}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {location}
            <span className="mx-1.5">·</span>
            {COMPANY_STATUS_LABELS[company.status as keyof typeof COMPANY_STATUS_LABELS] ?? company.status}
            <span className="mx-1.5">·</span>
            取得 {formatDate(company.discoveredAt)}
            {company.url ? (
              <>
                <span className="mx-1.5">·</span>
                <a href={company.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  サイト
                </a>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            loading={pending}
            onClick={() =>
              runAction(() => rerunSignalExtract(company.id), "再調査を開始しました（サイト取得のあとシグナルと調査メモを更新します）")
            }
          >
            再調査
          </Button>
          <Button
            variant="secondary"
            loading={pending}
            onClick={() => runAction(() => rescoreCompany(company.id), "スコアを再計算しました")}
          >
            再採点
          </Button>
          <Link href="/companies">
            <Button variant="secondary">一覧へ戻る</Button>
          </Link>
        </div>
      </header>

      {message ? <Alert variant="success" className="mb-3">{message}</Alert> : null}
      {error ? <Alert variant="danger" className="mb-3">{error}</Alert> : null}
      {company.exclusionReason ? (
        <Alert variant="warning" className="mb-3">
          除外/保留理由: {company.exclusionReason}
        </Alert>
      ) : null}
      {company.profile?.cautions ? (
        <Alert variant="warning" className="mb-3">
          注意: {company.profile.cautions}
        </Alert>
      ) : null}

      <section className="rounded-xl border border-border bg-white px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {latestScore ? (
            <Badge variant={priorityVariant(latestScore.priority)}>
              {PRIORITY_LABELS[latestScore.priority as keyof typeof PRIORITY_LABELS]}
            </Badge>
          ) : (
            <Badge variant="muted">未採点</Badge>
          )}
          <Badge variant="muted">{PIPELINE_LABELS[latestStage as keyof typeof PIPELINE_LABELS] ?? latestStage}</Badge>
          {outOfCoverage ? <Badge variant="warning">エリア外</Badge> : null}
          {company.nodeMemberships.map((membership) => (
            <Badge key={membership.node.id} variant="muted">
              {membership.node.name}
            </Badge>
          ))}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] text-muted">ICP</dt>
            <dd className="text-[20px] font-semibold tabular-nums leading-tight">
              {latestScore ? latestScore.icpScore : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted">経路</dt>
            <dd className="text-[20px] font-semibold tabular-nums leading-tight">
              {latestScore ? latestScore.pathScore : "—"}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-[11px] text-muted">紹介経路</dt>
            <dd className="text-[20px] font-semibold tabular-nums leading-tight">{paths.length}</dd>
          </div>
        </dl>

        <p className={cn("mt-4 text-[14px] leading-relaxed", company.profile ? "text-text" : "text-muted")}>
          {company.profile?.summary ?? "再調査すると、サイト本文から調査メモが入ります。"}
        </p>
        {latestScore ? (
          <p className="mt-2 text-[12px] text-muted">
            算出 {new Date(latestScore.calculatedAt).toLocaleString("ja-JP")}
            {outOfCoverage ? " · パートナー対象エリア外のため優先度 C" : ""}
          </p>
        ) : null}
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-white">
        <div className="px-2">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: "survey", label: "調査", count: company.signals.length },
              { id: "intro", label: "紹介", count: paths.length },
              { id: "activity", label: "活動", count: company.contactLogs.length + company.pipelineEvents.length },
            ]}
          />
        </div>
        <div className="px-4 py-4">
          {tab === "survey" ? <SurveyTab company={company} /> : null}
          {tab === "intro" ? (
            <IntroTab
              company={company}
              paths={paths}
              pending={pending}
              onDraft={(partnerId, nodeId) =>
                runAction(
                  () => generateIntroRequest(company.id, partnerId, nodeId),
                  "依頼下書きを作成しました（内容を依頼キューで確認してください）",
                )
              }
            />
          ) : null}
          {tab === "activity" ? <ActivityTab company={company} /> : null}
        </div>
      </section>
    </>
  );
}

function SurveyTab({ company }: Pick<CompanyDetailProps, "company">) {
  const profile = company.profile;
  const facts = profile
    ? [
        {
          label: "事業",
          value: [
            BUSINESS_MODEL_LABELS[profile.businessModel] ?? profile.businessModel,
            profile.offerings.length > 0 ? profile.offerings.join("、") : null,
          ]
            .filter(Boolean)
            .join(" · "),
        },
        { label: "顧客層", value: profile.customers },
        { label: "技術・資産", value: profile.techAssets },
        { label: "変化の兆し", value: profile.changeSignals },
        { label: "設立", value: profile.establishedYear },
        { label: "規模", value: profile.employeeScale },
      ].filter((row) => row.value)
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[14px] font-semibold">調査メモ</h2>
          {profile ? (
            <p className="text-[12px] text-muted">
              {new Date(profile.extractedAt).toLocaleString("ja-JP")}
              {describeModelName(profile.modelVersion) ? ` · ${describeModelName(profile.modelVersion)}` : ""}
            </p>
          ) : null}
        </div>
        {profile ? (
          <div className="mt-3 space-y-3 text-[13px]">
            {facts.length > 0 ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                {facts.map((row) => (
                  <div key={row.label}>
                    <dt className="text-[12px] text-muted">{row.label}</dt>
                    <dd className="mt-0.5">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-muted">詳細項目はまだありません。</p>
            )}
            {profile.evidenceText || profile.sourceUrl ? (
              <div>
                <p className="text-[12px] text-muted">根拠</p>
                {profile.evidenceText ? <p className="mt-1 text-muted">「{profile.evidenceText}」</p> : null}
                {profile.sourceUrl ? (
                  <a
                    href={profile.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-[12px] text-primary hover:underline"
                  >
                    {profile.sourceUrl}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-muted">再調査すると、サイト本文から調査メモが入ります。</p>
        )}
      </div>

      <div>
        <h2 className="text-[14px] font-semibold">シグナル</h2>
        <ul className="mt-3 space-y-2">
          {company.signals.length === 0 ? (
            <li className="text-[13px] text-muted">シグナルなし</li>
          ) : (
            company.signals.map((signal) => (
              <li key={signal.id} className="rounded-lg border border-border px-3 py-2 text-[13px]">
                <p className="flex flex-wrap items-center gap-1.5 font-medium">
                  {SIGNAL_TYPE_LABELS[signal.signalType as keyof typeof SIGNAL_TYPE_LABELS] ?? signal.signalType}
                  <Badge variant={polarityVariant(signal.polarity)}>
                    {SIGNAL_POLARITY_LABELS[signal.polarity] ?? signal.polarity}
                  </Badge>
                  <span className="text-[12px] font-normal text-muted">{describeModelVersion(signal.modelVersion)}</span>
                </p>
                <p className="mt-1 text-muted">{signal.evidenceText}</p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function IntroTab({
  company,
  paths,
  pending,
  onDraft,
}: Pick<CompanyDetailProps, "company" | "paths"> & {
  pending: boolean;
  onDraft: (partnerId: string, nodeId: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="text-[14px] font-semibold">紹介経路</h2>
        {paths.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted">共通ノードを持つ既存パートナーがありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {paths.map((path) => (
              <li
                key={`${path.partnerId}-${path.nodeId}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-[13px]"
              >
                <div>
                  <p className="font-medium">{path.partnerName}</p>
                  <p className="text-muted">
                    {path.nodeName}（経路 {path.pathScore}）
                    {path.introContactLevel ? ` · ${path.introContactLevel}` : ""}
                  </p>
                </div>
                <Button loading={pending} onClick={() => onDraft(path.partnerId, path.nodeId)}>
                  依頼下書き
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-[14px] font-semibold">依頼</h2>
        {company.introRequests.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted">この会社の依頼はまだありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {company.introRequests.map((request) => (
              <li key={request.id} className="rounded-lg border border-border px-3 py-2 text-[13px]">
                <p className="flex flex-wrap items-center gap-1.5 font-medium">
                  {request.viaPartner.name}
                  <Badge variant={introStatusVariant(request.status)}>
                    {INTRO_STATUS_LABELS[request.status as keyof typeof INTRO_STATUS_LABELS] ?? request.status}
                  </Badge>
                </p>
                <p className="mt-1 text-muted">{request.viaNode.name}</p>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[12px] text-muted">{request.draftBody}</p>
                <Link href="/intro-requests" className="mt-2 inline-block text-[12px] text-primary hover:underline">
                  依頼キューで開く
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActivityTab({ company }: Pick<CompanyDetailProps, "company">) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <ContactLogSection companyId={company.id} initialLogs={company.contactLogs} framed={false} />
      <div>
        <h2 className="text-[14px] font-semibold">パイプライン履歴</h2>
        <ul className="mt-3 space-y-2">
          {company.pipelineEvents.length === 0 ? (
            <li className="text-[13px] text-muted">未接触</li>
          ) : (
            company.pipelineEvents.map((event) => (
              <li key={event.id} className="rounded-lg border border-border px-3 py-2 text-[13px]">
                <p className="font-medium">
                  {PIPELINE_LABELS[event.stage as keyof typeof PIPELINE_LABELS] ?? event.stage}
                  <span className="ml-2 font-normal text-muted">
                    {new Date(event.occurredAt).toLocaleDateString("ja-JP")}
                  </span>
                </p>
                {event.lostReason ? <p className="mt-1 text-muted">理由: {event.lostReason}</p> : null}
                {event.note ? <p className="mt-1 text-muted">{event.note}</p> : null}
                {event.recordedBy ? <p className="mt-1 text-[12px] text-muted">記録: {event.recordedBy.name}</p> : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
