import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { UserRole } from "@prisma/client";

export interface AuthPayload {
  sub: string;
  role: UserRole;
  type: "access";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        throw new AppError("Missing or invalid authorization header", 401);
      }

      const token = authHeader.slice(7);
      let payload: AuthPayload;

      try {
        payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
      } catch {
        throw new AppError("Invalid or expired access token", 401);
      }

      if (payload.type !== "access") {
        throw new AppError("Invalid token type", 401);
      }

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, status: true },
      });

      if (!user || user.status !== "ACTIVE") {
        throw new AppError("User not found or inactive", 401);
      }

      req.user = { sub: user.id, role: user.role, type: "access" };
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError("Insufficient permissions", 403));
      return;
    }
    next();
  };
}
