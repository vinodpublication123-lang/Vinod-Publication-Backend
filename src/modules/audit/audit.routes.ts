import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { Request, Response, NextFunction } from "express";
import { listAuditLogs } from "./audit.service";
import { successResponse } from "../../lib/response";
import { z } from "zod";

export const auditRouter = Router();

auditRouter.use(authenticate(), authorize("ADMIN"));

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  actorId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
});

// GET /api/v1/admin/audit-logs
auditRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = auditQuerySchema.parse(req.query);
    const data = await listAuditLogs(query);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
});
