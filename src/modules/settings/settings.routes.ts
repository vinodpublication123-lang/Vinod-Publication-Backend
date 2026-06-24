import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { updateSettingsSchema } from "./settings.schemas";
import { fetchSettings, patchSettings } from "./settings.controller";

export const settingsRouter = Router();

// GET /api/v1/settings — public (or authenticated — per spec, no auth requirement on GET)
settingsRouter.get("/", fetchSettings);

// PATCH /api/v1/settings — ADMIN only
settingsRouter.patch(
  "/",
  authenticate(),
  authorize("ADMIN"),
  validate({ body: updateSettingsSchema }),
  patchSettings
);
