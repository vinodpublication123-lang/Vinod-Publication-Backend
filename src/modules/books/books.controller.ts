import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import { listBooks, getBookById, updateBook, deleteBook } from "./books.service";

export async function getBooks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await listBooks(req.query as never);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getBook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getBookById(String(req.params.id));
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function patchBook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await updateBook(String(req.params.id), req.body);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function removeBook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteBook(String(req.params.id));
    successResponse(res, { message: "Book and associated product deleted" });
  } catch (err) {
    next(err);
  }
}
