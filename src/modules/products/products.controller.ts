import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./products.service";

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await listProducts(req.query as never);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getProductById(String(req.params.id));
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function postProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await createProduct(req.body);
    successResponse(res, data, 201);
  } catch (err) {
    next(err);
  }
}

export async function patchProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await updateProduct(String(req.params.id), req.body);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function removeProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteProduct(String(req.params.id));
    successResponse(res, { message: "Product deleted" });
  } catch (err) {
    next(err);
  }
}
