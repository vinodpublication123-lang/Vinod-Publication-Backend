import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { UpdateTrackingInput } from "./tracking.schemas";

export async function getTrackingByOrderId(orderId: string, userId?: string) {
  // If userId provided — verify order ownership
  if (userId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true },
    });
    if (!order) throw new AppError("Order not found", 404);
  } else {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
    if (!order) throw new AppError("Order not found", 404);
  }

  const tracking = await prisma.trackingInfo.findUnique({
    where: { orderId },
  });

  if (!tracking) throw new AppError("Tracking information not found", 404);
  return tracking;
}

export async function updateTracking(
  orderId: string,
  input: UpdateTrackingInput
) {
  // Ensure order exists
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!order) throw new AppError("Order not found", 404);

  const tracking = await prisma.trackingInfo.findUnique({ where: { orderId } });
  if (!tracking) throw new AppError("Tracking record not found", 404);

  // Auto-set timestamps based on status
  const data: UpdateTrackingInput & {
    shippedAt?: Date | null;
    deliveredAt?: Date | null;
  } = { ...input };

  if (input.status === "DISPATCHED" && !input.shippedAt && !tracking.shippedAt) {
    data.shippedAt = new Date();
  }

  if (
    input.status === "DELIVERED" &&
    !input.deliveredAt &&
    !tracking.deliveredAt
  ) {
    data.deliveredAt = new Date();
  }

  return prisma.trackingInfo.update({
    where: { orderId },
    data,
  });
}
