import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import { getTrackingByOrderId, updateTracking } from "./tracking.service";

export async function fetchTracking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Customer route: verify ownership
    const userId = req.user?.role === "CUSTOMER" ? req.user.sub : undefined;
    const data = await getTrackingByOrderId(String(req.params.orderId), userId);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function patchTracking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await updateTracking(String(req.params.orderId), req.body);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}
