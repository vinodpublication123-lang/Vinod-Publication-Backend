import { Prisma, OrderStatus } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import {
  CheckoutInput,
  CustomerOrderQuery,
  AdminOrderQuery,
  UpdateOrderStatusInput,
} from "./orders.schemas";
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from "../email/email.service";
import { auditLog } from "../audit/audit.service";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

// ── Printing Press — Google Sheets Notification ───────────────────────────────

async function notifyPrintingPressGoogleSheets(payload: {
  orderNumber: string;
  orderDate: string;
  customer: { name: string; phone: string };
  address: {
    fullName: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    coverImageUrl?: string | null;
  }>;
  orderTotal: number;
}): Promise<void> {
  if (!env.GOOGLE_SHEETS_WEBHOOK_URL) {
    logger.warn(
      "[Sheets] GOOGLE_SHEETS_WEBHOOK_URL not set — skipping Google Sheets notification"
    );
    return;
  }
  try {
    const res = await fetch(env.GOOGLE_SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn("[Sheets] Webhook returned non-OK status", { status: res.status });
    } else {
      logger.info("[Sheets] Book order logged to Google Sheets", {
        orderNumber: payload.orderNumber,
      });
    }
  } catch (err) {
    logger.error("[Sheets] Failed to notify Google Sheets", { error: String(err) });
  }
}

// ── Allowed order status transitions ─────────────────────────────────────────

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

// ── Order number generation ───────────────────────────────────────────────────

async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  // Find the highest sequence number for today's date string
  const prefix = `VIN-${dateStr}-`;
  const lastOrder = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
  });

  let sequence = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNumber.replace(prefix, ""), 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  const sequenceStr = String(sequence).padStart(4, "0");
  return `${prefix}${sequenceStr}`;
}

// ── Shared order include ──────────────────────────────────────────────────────

const orderInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          primaryImage: true,
          category: true,
          variants: { include: { images: true } }
        },
      },
      variant: {
        include: { images: true, sizes: true }
      }
    },
  },
  address: true,
  tracking: true,
} satisfies Prisma.OrderInclude;

// ── CHECKOUT ─────────────────────────────────────────────────────────────────

export async function checkout(userId: string, input: CheckoutInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Verify items exist
    if (!input.items || input.items.length === 0) {
      throw new AppError("Cart is empty", 422);
    }

    // 2. Create or update address
    const address = await tx.address.create({
      data: {
        userId,
        fullName: input.shippingAddress.name,
        phone: input.shippingAddress.phone,
        line1: input.shippingAddress.address1,
        line2: input.shippingAddress.address2 || "",
        city: input.shippingAddress.city,
        state: input.shippingAddress.state,
        postalCode: input.shippingAddress.pincode,
        country: input.shippingAddress.country,
        isDefault: true,
      }
    });

    // 3. Validate inventory and compute totals
    let subtotal = 0;
    let taxTotal = 0;

    const settings = await tx.storeSettings.findFirst();
    const taxRate =
      settings?.taxEnabled ? Number(settings.defaultTaxRate ?? 0) / 100 : 0;

    for (const item of input.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { sizes: true, variants: { include: { sizes: true } } },
      });

      if (!product || product.status !== "ACTIVE") {
        throw new AppError(
          `Product is no longer available`,
          409
        );
      }

      if (product.category === "APPAREL" && item.variantId && item.sizeLabel) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new AppError(`Variant not found for "${product.name}"`, 409);
        }
        const size = variant.sizes.find((s) => s.label === item.sizeLabel);
        if (!size || (product.trackStock && size.stock < item.quantity)) {
          throw new AppError(
            `Insufficient stock for "${product.name}" size ${item.sizeLabel}`,
            409
          );
        }
      } else {
        if (product.trackStock && product.globalStock < item.quantity) {
          throw new AppError(
            `Insufficient stock for "${product.name}"`,
            409
          );
        }
      }

      const unitPrice = Number(product.salePrice ?? product.price);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      taxTotal += lineTotal * taxRate;
    }

    subtotal = Number(subtotal.toFixed(2));
    taxTotal = Number(taxTotal.toFixed(2));
    const shippingTotal = 0; // Phase 3 foundation — shipping rules in Phase 4+
    const discountTotal = 0;
    const total = Number(
      (subtotal + taxTotal + shippingTotal - discountTotal).toFixed(2)
    );

    // 4. Create order
    const orderNumber = await generateOrderNumber();

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId,
        addressId: address.id,
        status: "PENDING",
        paymentStatus: "PENDING",
        subtotal,
        taxTotal,
        shippingTotal,
        discountTotal,
        total,
      },
    });

    // 5. Create order items (snapshot immutable data)
    for (const item of input.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId }});
      if (!product) continue;
      
      const unitPrice = Number(product.salePrice ?? product.price);
      const taxAmount = Number(
        (unitPrice * item.quantity * taxRate).toFixed(2)
      );
      const lineTotal = Number((unitPrice * item.quantity).toFixed(2));

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          variantId: item.variantId ?? null,
          sizeLabel: item.sizeLabel as any,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unitPrice,
          taxAmount,
          total: lineTotal,
        },
      });

      // 6. Deduct inventory
      if (product.category === "APPAREL" && item.variantId && item.sizeLabel) {
        await tx.variantSize.updateMany({
          where: { variantId: item.variantId, label: item.sizeLabel as any },
          data: { stock: { decrement: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: product.id },
          data: { globalStock: { decrement: item.quantity } },
        });
      }
    }

    // 7. Clear cart
    const userCart = await tx.cart.findUnique({ where: { userId } });
    if (userCart) {
      await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });
    }

    // 8. Create TrackingInfo
    await tx.trackingInfo.create({
      data: { orderId: order.id, status: "NOT_DISPATCHED" },
    });

    // Return full order
    const fullOrder = await tx.order.findUnique({
      where: { id: order.id },
      include: {
        ...orderInclude,
        user: { select: { name: true, email: true } },
      },
    });

    // Fire-and-forget emails (outside transaction so they don't block rollback)
    if (fullOrder) {
      const emailItems = fullOrder.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      }));
      sendOrderConfirmationEmail(fullOrder.user.email, {
        name: fullOrder.user.name,
        orderNumber: fullOrder.orderNumber,
        total: Number(fullOrder.total),
        items: emailItems,
      });
      sendAdminNewOrderEmail(
        fullOrder.orderNumber,
        fullOrder.user.name,
        Number(fullOrder.total)
      );

      // Log book items to printing press Google Sheet (fire-and-forget)
      const bookItems = fullOrder.items.filter(
        (i) => i.product.category === "BOOK"
      );
      if (bookItems.length > 0) {
        const orderDate = new Date(fullOrder.placedAt).toLocaleDateString(
          "en-IN",
          { day: "2-digit", month: "long", year: "numeric" }
        );
        notifyPrintingPressGoogleSheets({
          orderNumber: fullOrder.orderNumber,
          orderDate,
          customer: {
            name: fullOrder.user.name,
            phone: fullOrder.address.phone,
          },
          address: {
            fullName: fullOrder.address.fullName,
            line1: fullOrder.address.line1,
            line2: fullOrder.address.line2,
            city: fullOrder.address.city,
            state: fullOrder.address.state,
            postalCode: fullOrder.address.postalCode,
            country: fullOrder.address.country,
            phone: fullOrder.address.phone,
          },
          items: bookItems.map((i) => ({
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            total: Number(i.total),
            coverImageUrl: i.product.primaryImage,
          })),
          orderTotal: Number(fullOrder.total),
        }).catch(() => { /* already logged inside */ });
      }
    }

    return fullOrder;
  });
}

// ── CUSTOMER ORDERS ───────────────────────────────────────────────────────────

export async function listCustomerOrders(
  userId: string,
  query: CustomerOrderQuery
) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { placedAt: "desc" },
      include: orderInclude,
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCustomerOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: orderInclude,
  });

  if (!order) throw new AppError("Order not found", 404);
  return order;
}

// ── CANCEL (customer) ─────────────────────────────────────────────────────────

export async function cancelOrder(userId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { include: { product: { include: { sizes: true } } } },
        tracking: true,
      },
    });

    if (!order) throw new AppError("Order not found", 404);

    const cancellable: OrderStatus[] = ["PENDING", "CONFIRMED"];
    if (!cancellable.includes(order.status)) {
      throw new AppError(
        `Cannot cancel order in status "${order.status}". Only PENDING or CONFIRMED orders can be cancelled.`,
        409
      );
    }

    // Restore inventory
    for (const item of order.items) {
      if (item.variantId && item.sizeLabel) {
        await tx.variantSize.updateMany({
          where: { variantId: item.variantId, label: item.sizeLabel },
          data: { stock: { increment: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { globalStock: { increment: item.quantity } },
        });
      }
    }

    // Update order status
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
      include: orderInclude,
    });

    // Update tracking
    if (order.tracking) {
      await tx.trackingInfo.update({
        where: { id: order.tracking.id },
        data: { status: "RETURNED" },
      });
    }

    return updated;
  });
}

// ── ADMIN ORDERS ──────────────────────────────────────────────────────────────

export async function listAdminOrders(query: AdminOrderQuery) {
  const { page, limit, status, paymentStatus, search, dateFrom, dateTo, sort, order } =
    query;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {
    ...(status && { status }),
    ...(paymentStatus && { paymentStatus }),
    ...(dateFrom || dateTo
      ? { placedAt: { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) } }
      : {}),
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
      include: {
        ...orderInclude,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    }),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getAdminOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      ...orderInclude,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  if (!order) throw new AppError("Order not found", 404);
  return order;
}

export async function updateOrderStatus(
  orderId: string,
  input: UpdateOrderStatusInput
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });

  if (!order) throw new AppError("Order not found", 404);

  const allowed = STATUS_TRANSITIONS[order.status];
  if (!allowed.includes(input.status)) {
    throw new AppError(
      `Invalid status transition from "${order.status}" to "${input.status}". Allowed: ${allowed.join(", ") || "none"}`,
      409
    );
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: input.status },
    include: orderInclude,
  }).then((updated) => {
    auditLog({
      actorId: undefined,
      action: "ORDER_STATUS_CHANGE",
      entityType: "Order",
      entityId: orderId,
      metadata: { from: order.status, to: input.status },
    });
    return updated;
  });
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────

export async function getOrderAnalytics() {
  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    revenueAgg,
    topProductsRaw,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "DELIVERED" } }),
    prisma.order.count({ where: { status: "CANCELLED" } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
    }),
    prisma.orderItem.groupBy({
      by: ["productId", "productName", "sku"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { placedAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        placedAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const revenue = Number(revenueAgg._sum.total ?? 0);
  const averageOrderValue =
    totalOrders > 0 ? Number((revenue / totalOrders).toFixed(2)) : 0;

  const topProducts = topProductsRaw.map((p) => ({
    productId: p.productId,
    productName: p.productName,
    sku: p.sku,
    totalQuantitySold: p._sum.quantity ?? 0,
  }));

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    revenue,
    averageOrderValue,
    topProducts,
    recentOrders,
  };
}
