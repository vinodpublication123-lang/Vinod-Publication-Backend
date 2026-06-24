import { Router } from "express";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/auth";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from "./auth.schemas";
import {
  register,
  login,
  refresh,
  logout,
  getMe,
} from "./auth.controller";

export const authRouter = Router();

// POST /api/v1/auth/register
authRouter.post("/register", validate({ body: registerSchema }), register);

// POST /api/v1/auth/login
authRouter.post("/login", validate({ body: loginSchema }), login);

// POST /api/v1/auth/refresh
authRouter.post("/refresh", validate({ body: refreshSchema }), refresh);

// POST /api/v1/auth/logout
authRouter.post(
  "/logout",
  validate({ body: refreshSchema }),
  logout
);

// GET /api/v1/auth/me
authRouter.get("/me", authenticate(), getMe);
