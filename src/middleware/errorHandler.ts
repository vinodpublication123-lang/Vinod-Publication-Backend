import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import { Prisma } from "@prisma/client";
import { logger } from "../lib/logger";
import { env } from "../config/env";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Operational errors we threw intentionally
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const fields = (err.meta?.target as string[])?.join(", ") ?? "field";
      res.status(409).json({
        success: false,
        message: `A record with this ${fields} already exists`,
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Record not found",
      });
      return;
    }
    if (err.code === "P2003") {
      res.status(400).json({
        success: false,
        message: "Related record not found",
      });
      return;
    }

    // Other Prisma errors — never expose raw error in production
    logger.error("[ErrorHandler] Unhandled Prisma error", {
      code: err.code,
      method: req.method,
      path: req.path,
      // Do NOT log err.message in production — it may contain query fragments
      ...(env.NODE_ENV !== "production" && { detail: err.message }),
    });
    res.status(500).json({ success: false, message: "Database error" });
    return;
  }

  // Prisma validation error
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.warn("[ErrorHandler] Prisma validation error", {
      method: req.method,
      path: req.path,
    });
    res.status(400).json({
      success: false,
      message: "Invalid data provided",
    });
    return;
  }

  // Multer errors (file upload issues)
  if (
    err instanceof Error &&
    err.constructor.name === "MulterError"
  ) {
    const multerErr = err as Error & { code: string; field?: string };
    const message =
      multerErr.code === "LIMIT_FILE_SIZE"
        ? "File is too large"
        : multerErr.message ?? "File upload error";
    res.status(413).json({ success: false, message });
    return;
  }

  // Unknown error — log full details but return generic message
  logger.error("[ErrorHandler] Unhandled error", {
    method: req.method,
    path: req.path,
    error: err instanceof Error ? err.message : String(err),
    // Stack only in non-production
    ...(env.NODE_ENV !== "production" && err instanceof Error && { stack: err.stack }),
  });

  // OWASP: Never send stack traces to client in production
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
