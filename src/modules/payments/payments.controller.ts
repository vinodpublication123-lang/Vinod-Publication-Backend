import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import { createPaymentOrder, verifyPayment } from "./payments.service";

export async function handleCreateOrder(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const data = await createPaymentOrder(req.user!.sub, req.body.orderId);
    successResponse(res, data, 201);
  } catch (err) { next(err); }
}

export async function handleVerifyPayment(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const data = await verifyPayment(req.user!.sub, req.body);
    successResponse(res, data);
  } catch (err) { next(err); }
}
