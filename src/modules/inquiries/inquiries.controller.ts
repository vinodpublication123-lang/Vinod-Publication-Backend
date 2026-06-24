import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import {
  createInquiry,
  listInquiries,
  getInquiryById,
  updateInquiry,
} from "./inquiries.service";

export async function postInquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await createInquiry(req.body);
    successResponse(res, data, 201);
  } catch (err) {
    next(err);
  }
}

export async function getInquiries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await listInquiries(req.query as never);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getInquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getInquiryById(String(req.params.id));
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function patchInquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await updateInquiry(String(req.params.id), req.body);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}
