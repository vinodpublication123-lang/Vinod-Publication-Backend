# APPAREL_VARIANTS.md

## Overview
The VINVERSE backend now supports a multi-variant apparel architecture. This resolves the limitation where an apparel product could only have a single global gallery and one set of sizes. The new architecture introduces a nested structure: `Product` -> `ProductVariant` -> (`VariantImage` & `VariantSize`). This enables color-specific galleries and size-specific inventory tracking while maintaining a single top-level `Product` entity.

## Architectural Changes

### Database Schema Updates
Three new tables have been introduced in the database:
- **`ProductVariant`**: Belongs to a `Product`. Represents a specific color variant.
  - Fields: `id`, `productId`, `colourName`, `colourHex`, `displayOrder`, `createdAt`, `updatedAt`
- **`VariantImage`**: Belongs to a `ProductVariant`. Holds images specific to that color.
  - Fields: `id`, `variantId`, `url`, `displayOrder`, `isPrimary`, `createdAt`
- **`VariantSize`**: Belongs to a `ProductVariant`. Holds the size and its stock levels for a specific color.
  - Fields: `id`, `variantId`, `label`, `stock`, `lowStockThreshold`, `createdAt`, `updatedAt`

### Backward Compatibility
The existing models for non-apparel products (`Books`, `Merchandise`) remain completely unchanged.
The existing global `ProductSize` model is preserved for backward compatibility and fallback purposes, though `APPAREL` products are encouraged to utilize `VariantSize` instead.
The backend API logic specifically checks the `category === 'APPAREL'` enum to route inventory and persistence logic to the nested variant tables.

## API Data Contract

### Product Creation / Updating (`/api/v1/admin/products`)
For apparel products, a new `variants` array is accepted in the payload:
```json
{
  "name": "VINVERSE T-Shirt",
  "category": "APPAREL",
  "variants": [
    {
      "colourName": "Midnight Black",
      "colourHex": "#000000",
      "displayOrder": 1,
      "images": [
        { "url": "https://...", "displayOrder": 1, "isPrimary": true }
      ],
      "sizes": [
        { "label": "M", "stock": 50, "lowStockThreshold": 10 }
      ]
    }
  ]
}
```

### Cart and Checkout (`/api/v1/orders/checkout`)
The frontend Cart and Checkout payloads now include a `variantId` property for apparel items to ensure atomic stock validation targets the correct `VariantSize`.

```json
{
  "shippingAddress": { ... },
  "items": [
    {
      "productId": "prod_123",
      "variantId": "var_456",
      "quantity": 1,
      "sizeLabel": "M"
    }
  ]
}
```

## Inventory Operations & Atomicity
During checkout, the `orders.service.ts` logic determines the inventory source dynamically:
- If `variantId` is provided (Apparel), the system uses `db.variantSize.update()` to decrement the atomic inventory block.
- Otherwise, it falls back to the legacy `db.productSize.update()` or `db.product.update({ globalStock })`.

When an order is cancelled or a payment fails, the exact same logic path reverses the operation to restore stock cleanly.

## Database Migration & Deployment
To reconcile the database migration history before production deployment and move away from `prisma db push`:
1. Delete the `_prisma_migrations` table in your staging/production database manually.
2. Run a clean migration bootstrap: `npx prisma migrate resolve --applied 0_init` (using a baseline migration if one is generated).
3. If no baseline migration is needed and this is a fresh setup, simply run `npx prisma migrate dev --name init_apparel_variants` on an empty DB to create the initial snapshot.

*Note: There is a known issue on Windows where `query_engine-windows.dll.node` can lock up and throw an `EPERM` error when Prisma Client generates. In the target deployment environment (typically Linux/Vercel), this issue does not occur. If it occurs locally, closing the dev server and running a clean `npm install` usually resolves it.*
