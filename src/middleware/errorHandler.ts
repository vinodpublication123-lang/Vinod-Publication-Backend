import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import { Prisma } from "@prisma/client";

export function errorHandler(
  err: unknown,
  _req: Request,
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
  }

  // Prisma validation error
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      message: "Invalid data provided",
    });
    return;
  }

  // Unknown error — log and return generic message
  console.error("[ErrorHandler]", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
