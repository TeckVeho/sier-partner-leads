-- CreateTable
CREATE TABLE "company_profiles" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "business_model" TEXT NOT NULL DEFAULT 'unknown',
    "offerings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customers" TEXT,
    "tech_assets" TEXT,
    "change_signals" TEXT,
    "cautions" TEXT,
    "established_year" TEXT,
    "employee_scale" TEXT,
    "evidence_text" TEXT,
    "source_url" TEXT,
    "model_version" TEXT,
    "extracted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_profiles_company_id_key" ON "company_profiles"("company_id");

-- AddForeignKey
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
