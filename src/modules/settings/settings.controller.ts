import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../lib/response";
import { getSettings, updateSettings } from "./settings.service";

export async function fetchSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSettings();
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}

export async function patchSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await updateSettings(req.body);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
}
