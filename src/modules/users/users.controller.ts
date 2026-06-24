import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import { getProfile, updateProfile, updatePassword } from "./users.service";

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getProfile(req.user!.sub);
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
}

export async function patchMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await updateProfile(req.user!.sub, req.body);
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
}

export async function patchPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await updatePassword(req.user!.sub, req.body);
    successResponse(res, { message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
}
