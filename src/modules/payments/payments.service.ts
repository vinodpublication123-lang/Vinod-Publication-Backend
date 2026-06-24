import Razorpay from "razorpay";
import crypto from "crypto";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { auditLog } from "../audit/audit.service";
import { logger } from "../../lib/logger";
import { sendPaymentSuccessEmail } from "../email/email.service";

// ── Razorpay client (lazy singleton) ─────────────────────────────────────────

let _razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!_razorpay) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new AppError("Payment service is not configured", 503);
    }
    _razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

// ── Create Razorpay order ─────────────────────────────────────────────────────

export async function createPaymentOrder(userId: string, orderId: string) {
  // 1. Load and validate our internal order
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: {
      id: true,
      orderNumber: true,
      paymentStatus: true,
      total: true,
      razorpayOrderId: true,
    },
  });

  if (!order) throw new AppError("Order not found", 404);
  if (order.paymentStatus === "PAID") {
    throw new AppError("Order is already paid", 409);
  }

  // 2. If a Razorpay order already exists for this, return it
  if (order.razorpayOrderId) {
    return {
      razorpayOrderId: order.razorpayOrderId,
      amount: Math.round(Number(order.total) * 100),
      currency: "INR",
      key: env.RAZORPAY_KEY_ID,
    };
  }

  // 3. Create Razorpay order (amount in paise)
  const amountInPaise = Math.round(Number(order.total) * 100);

  let rzpOrder: { id: string; amount: number; currency: string; receipt: string };
  try {
    rzpOrder = await getRazorpay().orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: order.orderNumber,
      notes: { internalOrderId: order.id },
    }) as { id: string; amount: number; currency: string; receipt: string };
  } catch (err) {
    logger.error("[Payments] Razorpay orders.create failed", { error: String(err) });
    throw new AppError(
      "Payment gateway error — check Razorpay credentials or try again later",
      503
    );
  }

  // 4. Persist the razorpayOrderId on our order + create Payment record
  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzpOrder.id },
    }),
    prisma.payment.create({
      data: {
        orderId: order.id,
        razorpayOrderId: rzpOrder.id,
        amount: amountInPaise,
        currency: "INR",
        provider: "razorpay",
      },
    }),
  ]);

  auditLog({
    actorId: userId,
    action: "PAYMENT_CREATE_ORDER",
    entityType: "Order",
    entityId: order.id,
    metadata: { razorpayOrderId: rzpOrder.id, amount: amountInPaise },
  });

  logger.info("[Payments] Razorpay order created", {
    orderId: order.id,
    razorpayOrderId: rzpOrder.id,
  });

  return {
    razorpayOrderId: rzpOrder.id,
    amount: amountInPaise,
    currency: "INR",
    key: env.RAZORPAY_KEY_ID,
  };
}

// ── Verify payment ────────────────────────────────────────────────────────────

export interface VerifyPaymentInput {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export async function verifyPayment(userId: string, input: VerifyPaymentInput) {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;

  // 1. Load the order (must belong to user)
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: { id: true, paymentStatus: true, razorpayOrderId: true },
  });

  if (!order) throw new AppError("Order not found", 404);
  if (order.paymentStatus === "PAID") throw new AppError("Order is already paid", 409);

  // 2. Verify the razorpayOrderId matches what we stored
  if (order.razorpayOrderId !== razorpayOrderId) {
    throw new AppError("Payment order ID mismatch", 400);
  }

  // 3. Server-side signature verification — NEVER trust frontend
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const signatureValid = expectedSignature === razorpaySignature;

  if (!signatureValid) {
    // Log the failed attempt
    logger.warn("[Payments] Signature verification FAILED", {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
    });
    auditLog({
      actorId: userId,
      action: "PAYMENT_VERIFIED",
      entityType: "Order",
      entityId: orderId,
      metadata: { verified: false, razorpayOrderId, razorpayPaymentId },
    });
    throw new AppError("Payment signature verification failed", 400);
  }

  // 4. Update order + payment record atomically
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        status: "CONFIRMED",
      },
    }),
    prisma.payment.update({
      where: { razorpayOrderId },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        verified: true,
        verifiedAt: new Date(),
      },
    }),
  ]);

  auditLog({
    actorId: userId,
    action: "PAYMENT_VERIFIED",
    entityType: "Order",
    entityId: orderId,
    metadata: { verified: true, razorpayOrderId, razorpayPaymentId },
  });

  logger.info("[Payments] Payment verified successfully", { orderId, razorpayPaymentId });

  // Fire-and-forget: load user info and send payment success email
  prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true } },
    },
  }).then((o) => {
    if (o) {
      sendPaymentSuccessEmail(
        o.user.email,
        o.user.name,
        o.orderNumber,
        Number(o.total)
      );
    }
  }).catch(() => { /* non-critical */ });

  return { success: true, message: "Payment verified and order confirmed" };
}
