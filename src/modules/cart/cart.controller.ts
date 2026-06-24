import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "./cart.service";

export async function fetchCart(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await getCart(req.user!.sub);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function postCartItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await addCartItem(req.user!.sub, req.body);
    successResponse(res, data, 201);
  } catch (err) {
    next(err);
  }
}

export async function patchCartItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await updateCartItem(
      req.user!.sub,
      String(req.params.id),
      req.body
    );
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function deleteCartItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await removeCartItem(req.user!.sub, String(req.params.id));
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function deleteCart(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await clearCart(req.user!.sub);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}
