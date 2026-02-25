-- Sprint 6: eCommerce - Products
-- Migration: Add categories, products, product_variants, product_images tables
-- Date: 2025-02-25

-- ============================================
-- ENUM: ProductStatus
-- ============================================

CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- ============================================
-- TABLE: categories
-- ============================================

CREATE TABLE "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "parent_id" uuid,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL,
  "description" text,
  "image_url" varchar(500),
  "level" integer NOT NULL DEFAULT 0,
  "path" varchar(1000),
  "position" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),

  CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "categories_tenant_id_idx" ON "categories"("tenant_id");
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- ============================================
-- TABLE: products
-- ============================================

CREATE TABLE "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL,
  "description" text,
  "meta_title" varchar(255),
  "meta_desc" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),

  CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "products_tenant_id_idx" ON "products"("tenant_id");
CREATE INDEX "products_category_id_idx" ON "products"("category_id");
CREATE INDEX "products_slug_idx" ON "products"("slug");

-- Full-text search index
CREATE INDEX "products_search_gin" ON "products"
  USING GIN (to_tsvector('english', coalesce("name", '') || ' ' || coalesce("description", '')));

-- ============================================
-- TABLE: product_variants
-- ============================================

CREATE TABLE "product_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "sku" varchar(100) UNIQUE,
  "name" varchar(255) NOT NULL,
  "price" decimal(10,2) NOT NULL,
  "compare_price" decimal(10,2),
  "stock" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),

  CONSTRAINT "product_variants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "product_variants_tenant_id_idx" ON "product_variants"("tenant_id");
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");
CREATE INDEX "product_variants_sku_idx" ON "product_variants"("sku");

-- ============================================
-- TABLE: product_images
-- ============================================

CREATE TABLE "product_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "variant_id" uuid,
  "url" varchar(1000) NOT NULL,
  "alt" varchar(500),
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),

  CONSTRAINT "product_images_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_images_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "product_images_tenant_id_idx" ON "product_images"("tenant_id");
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");
CREATE INDEX "product_images_variant_id_idx" ON "product_images"("variant_id");

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;

-- Policy: categories - tenant isolation
CREATE POLICY "categories_tenant_isolation" ON "categories"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true)::uuid);

-- Policy: products - tenant isolation
CREATE POLICY "products_tenant_isolation" ON "products"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true)::uuid);

-- Policy: product_variants - tenant isolation
CREATE POLICY "product_variants_tenant_isolation" ON "product_variants"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true)::uuid);

-- Policy: product_images - tenant isolation
CREATE POLICY "product_images_tenant_isolation" ON "product_images"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant', true)::uuid);
