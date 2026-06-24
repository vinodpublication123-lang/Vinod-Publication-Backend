import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { Prisma } from "@prisma/client";

export type AuditAction =
  // Products
  | "PRODUCT_CREATE"
  | "PRODUCT_UPDATE"
  | "PRODUCT_DELETE"
  // Books
  | "BOOK_UPDATE"
  // Authors
  | "AUTHOR_UPDATE"
  // Settings
  | "SETTINGS_UPDATE"
  // Orders
  | "ORDER_STATUS_CHANGE"
  // Tracking
  | "TRACKING_UPDATE"
  // Payments
  | "PAYMENT_VERIFIED"
  | "PAYMENT_CREATE_ORDER";

export interface AuditLogEntry {
  actorId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry.
 * Fire-and-forget — never throws so it cannot break the calling request.
 */
export function auditLog(entry: AuditLogEntry): void {
  prisma.auditLog
    .create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
      },
    })
    .catch((err) => {
      logger.error("[AuditLog] Failed to write audit entry", {
        action: entry.action,
        entityId: entry.entityId,
        error: String(err),
      });
    });
}

// ── Admin query ───────────────────────────────────────────────────────────────

export async function listAuditLogs(query: {
  page: number;
  limit: number;
  actorId?: string;
  action?: string;
  entityType?: string;
}) {
  const { page, limit, actorId, action, entityType } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(actorId && { actorId }),
    ...(action && { action }),
    ...(entityType && { entityType }),
  };

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
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
