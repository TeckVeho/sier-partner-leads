-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- Seed default target prefectures (北関東 3県)
INSERT INTO "system_settings" ("key", "value", "updated_at")
VALUES ('target_prefectures', '["群馬","栃木","茨城"]'::jsonb, CURRENT_TIMESTAMP);
