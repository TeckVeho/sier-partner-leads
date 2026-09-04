-- CreateEnum
CREATE TYPE "NodeProposalStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "node_proposals" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "job_run_id" UUID,
    "name" TEXT NOT NULL,
    "node_type" "NodeType" NOT NULL,
    "roster_url" TEXT,
    "evidence_text" TEXT NOT NULL,
    "confidence" DECIMAL(4,3),
    "status" "NodeProposalStatus" NOT NULL DEFAULT 'pending',
    "matched_node_id" UUID,
    "accepted_node_id" UUID,
    "model_version" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "node_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "node_proposals_status_created_at_idx" ON "node_proposals"("status", "created_at");

-- CreateIndex
CREATE INDEX "node_proposals_partner_id_status_idx" ON "node_proposals"("partner_id", "status");

-- AddForeignKey
ALTER TABLE "node_proposals" ADD CONSTRAINT "node_proposals_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_proposals" ADD CONSTRAINT "node_proposals_matched_node_id_fkey" FOREIGN KEY ("matched_node_id") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_proposals" ADD CONSTRAINT "node_proposals_accepted_node_id_fkey" FOREIGN KEY ("accepted_node_id") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_proposals" ADD CONSTRAINT "node_proposals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
