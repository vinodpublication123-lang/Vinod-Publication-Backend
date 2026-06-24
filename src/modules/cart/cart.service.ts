import { Decimal } from "@prisma/client/runtime/library";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { AddCartItemInput, UpdateCartItemInput } from "./cart.schemas";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve or create the cart for a user */
async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: { items: { include: { product: { include: { sizes: true } } } } },
  });
}

/** Compute totals for a populated cart */
function computeCartTotals(
  items: Array<{
    quantity: number;
    product: { price: Decimal; salePrice: Decimal | null };
  }>
) {
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.product.salePrice ?? item.product.price);
    return sum + price * item.quantity;
  }, 0);
  return { subtotal: Number(subtotal.toFixed(2)), itemCount: items.length };
}

/** Full cart with enriched data */
async function loadFullCart(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { sizes: true, book: { include: { author: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cart) {
    return { id: null, items: [], subtotal: 0, itemCount: 0 };
  }

  const { subtotal, itemCount } = computeCartTotals(cart.items);
  return { ...cart, subtotal, itemCount };
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function getCart(userId: string) {
  return loadFullCart(userId);
}

export async function addCartItem(userId: string, input: AddCartItemInput) {
  // 1. Validate product exists and is ACTIVE
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { sizes: true },
  });

  if (!product || product.status !== "ACTIVE") {
    throw new AppError("Product not found or not available", 404);
  }

  // 2. Validate size for APPAREL
  if (product.category === "APPAREL") {
    if (!input.sizeLabel) {
      throw new AppError("sizeLabel is required for APPAREL products", 422);
    }
    const size = product.sizes.find((s) => s.label === input.sizeLabel);
    if (!size) {
      throw new AppError(
        `Size ${input.sizeLabel} not available for this product`,
        422
      );
    }
    if (product.trackStock && size.stock < input.quantity) {
      throw new AppError(
        `Insufficient stock for size ${input.sizeLabel}. Available: ${size.stock}`,
        409
      );
    }
  } else {
    // Non-apparel — ignore sizeLabel
    if (product.trackStock && product.globalStock < input.quantity) {
      throw new AppError(
        `Insufficient stock. Available: ${product.globalStock}`,
        409
      );
    }
  }

  // 3. Upsert cart
  const cart = await getOrCreateCart(userId);

  // 4. Merge if item already exists
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: input.productId,
      sizeLabel: input.sizeLabel ?? null,
    },
  });

  if (existingItem) {
    const newQty = existingItem.quantity + input.quantity;

    // Re-validate merged quantity against stock
    if (product.category === "APPAREL" && input.sizeLabel) {
      const size = product.sizes.find((s) => s.label === input.sizeLabel)!;
      if (product.trackStock && size.stock < newQty) {
        throw new AppError(
          `Cannot add ${input.quantity} more. Stock available: ${size.stock}, already in cart: ${existingItem.quantity}`,
          409
        );
      }
    } else if (product.trackStock && product.globalStock < newQty) {
      throw new AppError(
        `Cannot add ${input.quantity} more. Stock available: ${product.globalStock}, already in cart: ${existingItem.quantity}`,
        409
      );
    }

    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQty },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: input.productId,
        sizeLabel: input.sizeLabel ?? null,
        quantity: input.quantity,
      },
    });
  }

  return loadFullCart(userId);
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  input: UpdateCartItemInput
) {
  // Verify item belongs to this user's cart
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    include: { product: { include: { sizes: true } } },
  });

  if (!item) throw new AppError("Cart item not found", 404);

  // Stock validation
  const { product } = item;
  if (product.category === "APPAREL" && item.sizeLabel) {
    const size = product.sizes.find((s) => s.label === item.sizeLabel);
    if (product.trackStock && size && size.stock < input.quantity) {
      throw new AppError(
        `Insufficient stock for size ${item.sizeLabel}. Available: ${size.stock}`,
        409
      );
    }
  } else if (product.trackStock && product.globalStock < input.quantity) {
    throw new AppError(
      `Insufficient stock. Available: ${product.globalStock}`,
      409
    );
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity: input.quantity },
  });

  return loadFullCart(userId);
}

export async function removeCartItem(userId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
  });
  if (!item) throw new AppError("Cart item not found", 404);

  await prisma.cartItem.delete({ where: { id: itemId } });
  return loadFullCart(userId);
}

export async function clearCart(userId: string) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
  return { message: "Cart cleared" };
}
