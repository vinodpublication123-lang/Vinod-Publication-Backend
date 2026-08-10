/**
 * One-time cleanup script: removes the "Echos of Monsoon" test book/product.
 * Run with: npx ts-node scripts/cleanup-test-book.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find by name (case-insensitive partial match)
  const product = await prisma.product.findFirst({
    where: { name: { contains: "Monsoon", mode: "insensitive" } },
    select: { id: true, name: true, status: true },
  });

  if (!product) {
    console.log("❌ Product 'Echos of Monsoon' not found — already deleted?");
    return;
  }

  console.log(`Found: "${product.name}" (${product.id}) — status: ${product.status}`);

  // Check if it has orders
  const orderCount = await prisma.orderItem.count({ where: { productId: product.id } });
  console.log(`Order items: ${orderCount}`);

  if (orderCount > 0) {
    // Can't hard-delete — soft delete (ARCHIVED + remove book record)
    await prisma.cartItem.deleteMany({ where: { productId: product.id } });
    await prisma.book.deleteMany({ where: { productId: product.id } });
    await prisma.product.update({ where: { id: product.id }, data: { status: "ARCHIVED" } });
    console.log(`✅ Soft-deleted (ARCHIVED) — has ${orderCount} order item(s), order history preserved.`);
  } else {
    // No orders — full hard delete
    await prisma.product.delete({ where: { id: product.id } });
    console.log("✅ Hard-deleted successfully — no orders referenced it.");
  }
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
