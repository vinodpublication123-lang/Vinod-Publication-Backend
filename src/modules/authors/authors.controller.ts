import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import { listAuthors, getAuthorById, updateAuthor, deleteAuthor } from "./authors.service";

export async function getAuthors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await listAuthors(req.query as never);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getAuthor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getAuthorById(String(req.params.id));
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function patchAuthor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await updateAuthor(String(req.params.id), req.body);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function removeAuthor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteAuthor(String(req.params.id));
    successResponse(res, { message: "Author deleted" });
  } catch (err) {
    next(err);
  }
}
