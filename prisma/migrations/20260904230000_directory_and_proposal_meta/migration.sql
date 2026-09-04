CREATE TYPE "DiscoveryMethod" AS ENUM ('partner_site', 'official_roster');
CREATE TYPE "NodeRelationType" AS ENUM ('member', 'certified_partner', 'reseller', 'bank_relation');
CREATE TYPE "EvidenceStrength" AS ENUM ('explicit', 'indirect');

ALTER TABLE "node_proposals"
ADD COLUMN "discovery_method" "DiscoveryMethod",
ADD COLUMN "relation_type" "NodeRelationType",
ADD COLUMN "source_url" TEXT,
ADD COLUMN "evidence_strength" "EvidenceStrength";

CREATE TABLE "directory_sources" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "node_type" "NodeType" NOT NULL,
    "official_domain" TEXT,
    "roster_url" TEXT NOT NULL,
    "prefectures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "access_policy" "AccessPolicy" NOT NULL DEFAULT 'public',
    "crawl_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_crawled_at" TIMESTAMPTZ,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "directory_sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "directory_sources_roster_url_key" ON "directory_sources"("roster_url");
