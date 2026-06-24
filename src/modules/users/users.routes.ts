import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { updateProfileSchema, updatePasswordSchema } from "./users.schemas";
import { getMe, patchMe, patchPassword } from "./users.controller";

export const usersRouter = Router();

usersRouter.use(authenticate());

// GET /api/v1/users/me
usersRouter.get("/me", getMe);

// PATCH /api/v1/users/me
usersRouter.patch("/me", validate({ body: updateProfileSchema }), patchMe);

// PATCH /api/v1/users/password
usersRouter.patch(
  "/password",
  validate({ body: updatePasswordSchema }),
  patchPassword
);
