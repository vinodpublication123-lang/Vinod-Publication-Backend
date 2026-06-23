# VINVERSE Backend

Phase 1 backend foundation for the VINVERSE Publication and Ecommerce platform.

## Scope

This phase includes Express, TypeScript, PostgreSQL, Prisma, database architecture, migrations, and seed infrastructure.

This phase intentionally does not include authentication, product APIs, order APIs, Razorpay, or S3 integration.

## Commands

```bash
npm install
docker compose up -d
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run seed
npm run dev
```

If PostgreSQL is already installed locally, Docker is optional. The default `.env.example` points to:

```text
postgresql://postgres:postgres@localhost:5432/vinverse_publication?schema=public
```

## Folder Structure

```text
prisma/
  migrations/         Initial migration for the Phase 1 schema
  schema.prisma       Database models, enums, relations, and indexes
  seed.ts             Seed infrastructure entry point
prisma.config.ts      Prisma schema, migration, datasource, and seed config
src/
  app.ts              Express app composition and foundation routes
  server.ts           HTTP server bootstrap
  config/env.ts       Zod-validated environment configuration
  lib/prisma.ts       Shared Prisma client instance
  modules/health/     Foundation health endpoint only
```

## Database Architecture

Products are the primary creation entity. A product can represent a book, apparel, or merchandise. When `Product.category` is `BOOK`, the product may have one linked `Book` record. The `Book` record stores publication-specific data and links to exactly one `Author`.

Core relationship map:

```text
User 1--* Address
User 1--* Order
Product 1--0..1 Book
Author 1--* Book
Book 1--1 Product
Order 1--* OrderItem
OrderItem *--1 Product
Order 1--0..1 TrackingInfo
Order *--1 Address
```

Product sizes are stored in `ProductSize` rows. VINVERSE currently supports `SMALL`, `MEDIUM`, and `LARGE`, each with independent stock values.

## Phase 2 Readiness

The schema is ready for Phase 2 API work around admin product creation, book metadata management, author management, carts, checkout, and order workflows.
