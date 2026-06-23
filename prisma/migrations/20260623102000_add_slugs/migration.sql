-- AlterTable
ALTER TABLE "products" ADD COLUMN "slug" TEXT;

-- AlterTable
ALTER TABLE "authors" ADD COLUMN "slug" TEXT;

-- AlterTable
ALTER TABLE "books" ADD COLUMN "slug" TEXT;

-- Backfill existing rows before enforcing NOT NULL.
UPDATE "products"
SET "slug" = CONCAT(
  LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g'))),
  '-',
  SUBSTRING("id", 1, 8)
)
WHERE "slug" IS NULL;

UPDATE "authors"
SET "slug" = CONCAT(
  LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g'))),
  '-',
  SUBSTRING("id", 1, 8)
)
WHERE "slug" IS NULL;

UPDATE "books"
SET "slug" = CONCAT(
  LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE("title", '[^a-zA-Z0-9]+', '-', 'g'))),
  '-',
  SUBSTRING("id", 1, 8)
)
WHERE "slug" IS NULL;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "authors" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "books" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "books_slug_key" ON "books"("slug");
