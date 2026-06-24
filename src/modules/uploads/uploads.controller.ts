import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import { AppError } from "../../lib/errors";
import {
  uploadBookCover,
  uploadAuthorAvatar,
  uploadProductImage,
  uploadProductGalleryImage,
  uploadAudio,
} from "./uploads.service";

function getFile(req: Request): Express.Multer.File {
  if (!req.file) throw new AppError("No file provided", 400);
  return req.file;
}

export async function handleBookCover(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const result = await uploadBookCover(getFile(req));
    successResponse(res, result, 201);
  } catch (err) { next(err); }
}

export async function handleAuthorAvatar(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const result = await uploadAuthorAvatar(getFile(req));
    successResponse(res, result, 201);
  } catch (err) { next(err); }
}

export async function handleProductImage(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const result = await uploadProductImage(getFile(req));
    successResponse(res, result, 201);
  } catch (err) { next(err); }
}

export async function handleProductGallery(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const result = await uploadProductGalleryImage(getFile(req));
    successResponse(res, result, 201);
  } catch (err) { next(err); }
}

export async function handleAudioUpload(
  req: Request, res: Response, next: NextFunction
): Promise<void> {
  try {
    const result = await uploadAudio(getFile(req));
    successResponse(res, result, 201);
  } catch (err) { next(err); }
}
