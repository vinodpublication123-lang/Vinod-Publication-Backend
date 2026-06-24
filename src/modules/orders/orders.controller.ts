import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import {
  checkout,
  listCustomerOrders,
  getCustomerOrder,
  cancelOrder,
  listAdminOrders,
  getAdminOrder,
  updateOrderStatus,
  getOrderAnalytics,
} from "./orders.service";

// ── Customer ──────────────────────────────────────────────────────────────────

export async function postCheckout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await checkout(req.user!.sub, req.body);
    successResponse(res, data, 201);
  } catch (err) {
    next(err);
  }
}

export async function getMyOrders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await listCustomerOrders(req.user!.sub, req.query as never);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getMyOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await getCustomerOrder(req.user!.sub, String(req.params.id));
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function postCancelOrder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await cancelOrder(req.user!.sub, String(req.params.id));
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function getAdminOrders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await listAdminOrders(req.query as never);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getAdminOrderById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await getAdminOrder(String(req.params.id));
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function patchOrderStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await updateOrderStatus(String(req.params.id), req.body);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function fetchAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await getOrderAnalytics();
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}
