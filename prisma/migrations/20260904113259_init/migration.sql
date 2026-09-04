-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('vendor', 'association', 'financial');

-- CreateEnum
CREATE TYPE "AccessPolicy" AS ENUM ('public', 'members_only', 'prohibited');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('candidate', 'excluded', 'on_hold');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('legacy_asset', 'stock_revenue', 'crisis_awareness', 'ai_inhouse', 'subsidiary', 'customer_overlap');

-- CreateEnum
CREATE TYPE "SignalPolarity" AS ENUM ('positive', 'negative', 'exclusion');

-- CreateEnum
CREATE TYPE "ScoringAxis" AS ENUM ('icp', 'path');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('A', 'B', 'C', 'hold');

-- CreateEnum
CREATE TYPE "IntroRequestStatus" AS ENUM ('draft', 'approved', 'sent', 'accepted', 'declined');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('not_contacted', 'requested', 'intro_obtained', 'first_contact', 'meeting', 'partnership', 'lost');

-- CreateEnum
CREATE TYPE "JobRunStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "JobRunType" AS ENUM ('roster_crawl', 'signal_extract', 'score_recalc', 'node_discovery');

-- CreateEnum
CREATE TYPE "CrawlRunStatus" AS ENUM ('success', 'partial', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "cognito_sub" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "prefecture" TEXT,
    "intro_contact_level" TEXT,
    "relationship_note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nodes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "node_type" "NodeType" NOT NULL,
    "roster_url" TEXT,
    "access_policy" "AccessPolicy" NOT NULL DEFAULT 'prohibited',
    "crawl_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_crawled_at" TIMESTAMPTZ,
    "base_path_score" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_node_memberships" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_node_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "prefecture" TEXT,
    "city" TEXT,
    "corporate_number" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'candidate',
    "exclusion_reason" TEXT,
    "discovered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_memberships" (
    "id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "source_url" TEXT,
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "node_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "signal_type" "SignalType" NOT NULL,
    "polarity" "SignalPolarity" NOT NULL,
    "evidence_text" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "confidence" DECIMAL(4,3),
    "extracted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model_version" TEXT,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_rules" (
    "id" UUID NOT NULL,
    "rule_key" TEXT NOT NULL,
    "axis" "ScoringAxis" NOT NULL,
    "weight" INTEGER NOT NULL,
    "is_exclusion" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL,
    "effective_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_scores" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "icp_score" INTEGER NOT NULL,
    "path_score" INTEGER NOT NULL,
    "priority" "Priority" NOT NULL,
    "breakdown" JSONB NOT NULL DEFAULT '{}',
    "rules_version" INTEGER NOT NULL,
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intro_requests" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "via_partner_id" UUID NOT NULL,
    "via_node_id" UUID NOT NULL,
    "draft_body" TEXT NOT NULL,
    "status" "IntroRequestStatus" NOT NULL DEFAULT 'draft',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "intro_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_events" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "stage" "PipelineStage" NOT NULL,
    "lost_reason" TEXT,
    "note" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" UUID,

    CONSTRAINT "pipeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_runs" (
    "id" UUID NOT NULL,
    "node_id" UUID,
    "source_url" TEXT NOT NULL,
    "status" "CrawlRunStatus" NOT NULL,
    "robots_allowed" BOOLEAN NOT NULL DEFAULT true,
    "new_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "crawl_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" UUID NOT NULL,
    "job_type" "JobRunType" NOT NULL,
    "status" "JobRunStatus" NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "progress_note" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_cognito_sub_key" ON "users"("cognito_sub");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "partner_node_memberships_partner_id_node_id_key" ON "partner_node_memberships"("partner_id", "node_id");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status");

-- CreateIndex
CREATE INDEX "companies_prefecture_idx" ON "companies"("prefecture");

-- CreateIndex
CREATE UNIQUE INDEX "node_memberships_node_id_company_id_key" ON "node_memberships"("node_id", "company_id");

-- CreateIndex
CREATE INDEX "signals_company_id_idx" ON "signals"("company_id");

-- CreateIndex
CREATE INDEX "scoring_rules_version_axis_idx" ON "scoring_rules"("version", "axis");

-- CreateIndex
CREATE INDEX "company_scores_company_id_calculated_at_idx" ON "company_scores"("company_id", "calculated_at");

-- CreateIndex
CREATE INDEX "intro_requests_status_idx" ON "intro_requests"("status");

-- CreateIndex
CREATE INDEX "pipeline_events_company_id_occurred_at_idx" ON "pipeline_events"("company_id", "occurred_at");

-- CreateIndex
CREATE INDEX "job_runs_status_created_at_idx" ON "job_runs"("status", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_created_at_idx" ON "audit_logs"("entity_type", "created_at");

-- AddForeignKey
ALTER TABLE "partner_node_memberships" ADD CONSTRAINT "partner_node_memberships_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_node_memberships" ADD CONSTRAINT "partner_node_memberships_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_memberships" ADD CONSTRAINT "node_memberships_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_memberships" ADD CONSTRAINT "node_memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_scores" ADD CONSTRAINT "company_scores_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intro_requests" ADD CONSTRAINT "intro_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intro_requests" ADD CONSTRAINT "intro_requests_via_partner_id_fkey" FOREIGN KEY ("via_partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intro_requests" ADD CONSTRAINT "intro_requests_via_node_id_fkey" FOREIGN KEY ("via_node_id") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intro_requests" ADD CONSTRAINT "intro_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_events" ADD CONSTRAINT "pipeline_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_events" ADD CONSTRAINT "pipeline_events_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_runs" ADD CONSTRAINT "crawl_runs_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
