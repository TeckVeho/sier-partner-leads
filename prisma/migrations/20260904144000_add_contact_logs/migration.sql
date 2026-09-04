-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('phone', 'email', 'visit', 'other');

-- CreateTable
CREATE TABLE "contact_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "contact_type" "ContactType" NOT NULL,
    "content" TEXT NOT NULL,
    "contacted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_logs_company_id_contacted_at_idx" ON "contact_logs"("company_id", "contacted_at");

-- AddForeignKey
ALTER TABLE "contact_logs" ADD CONSTRAINT "contact_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_logs" ADD CONSTRAINT "contact_logs_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
