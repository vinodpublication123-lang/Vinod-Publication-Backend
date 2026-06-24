import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import {
  registerService,
  loginService,
  refreshService,
  logoutService,
  getMeService,
} from "./auth.service";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await registerService(req.body);
    successResponse(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await loginService(req.body);
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await refreshService(req.body);
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    await logoutService(refreshToken);
    successResponse(res, { message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
}

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await getMeService(req.user!.sub);
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
}
