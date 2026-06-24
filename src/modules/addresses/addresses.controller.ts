import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "./addresses.service";

export async function getAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await listAddresses(req.user!.sub);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function postAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await createAddress(req.user!.sub, req.body);
    successResponse(res, data, 201);
  } catch (err) {
    next(err);
  }
}

export async function patchAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await updateAddress(String(req.params.id), req.user!.sub, req.body);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function removeAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteAddress(String(req.params.id), req.user!.sub);
    successResponse(res, { message: "Address deleted" });
  } catch (err) {
    next(err);
  }
}
