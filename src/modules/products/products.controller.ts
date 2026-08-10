import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./products.service";
import { auditLog } from "../audit/audit.service";

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
    auditLog({
      actorId: req.user?.sub,
      action: "PRODUCT_CREATE",
      entityType: "Product",
      entityId: (data as { id: string })?.id ?? "unknown",
      metadata: { name: req.body.name, category: req.body.category },
    });
    successResponse(res, data, 201);
  } catch (err) {
    next(err);
  }
}

export async function patchProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await updateProduct(String(req.params.id), req.body);
    auditLog({
      actorId: req.user?.sub,
      action: "PRODUCT_UPDATE",
      entityType: "Product",
      entityId: String(req.params.id),
      metadata: { fields: Object.keys(req.body) },
    });
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function removeProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await deleteProduct(String(req.params.id));
    auditLog({
      actorId: req.user?.sub,
      action: "PRODUCT_DELETE",
      entityType: "Product",
      entityId: String(req.params.id),
      metadata: { softDeleted: result.softDeleted },
    });
    successResponse(res, {
      message: result.softDeleted
        ? "Product deactivated (it has existing orders and cannot be permanently deleted)"
        : "Product deleted",
      softDeleted: result.softDeleted,
    });
  } catch (err) {
    next(err);
  }
}
