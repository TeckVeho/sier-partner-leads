-- AlterTable
ALTER TABLE "partners" ADD COLUMN "target_prefectures" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "partners"
SET "target_prefectures" = ARRAY["prefecture"]
WHERE "prefecture" IS NOT NULL
  AND cardinality("target_prefectures") = 0;
