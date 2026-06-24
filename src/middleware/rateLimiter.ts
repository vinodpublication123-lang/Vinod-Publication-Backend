import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const isProd = env.NODE_ENV === "production";

// ── Auth rate limiter ─────────────────────────────────────────────────────────
// Strict: prevents brute-force on login/register/refresh
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 20 : 200,    // 20 req per 15min in prod
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again in 15 minutes.",
  },
});

// ── Payment rate limiter ──────────────────────────────────────────────────────
// Prevents automated payment abuse
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProd ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many payment requests, please slow down.",
  },
});

// ── Inquiry rate limiter ──────────────────────────────────────────────────────
// Prevents inquiry spam
export const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProd ? 10 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many inquiries submitted. Please wait before submitting another.",
  },
});

// ── Upload rate limiter ───────────────────────────────────────────────────────
// Prevents upload abuse by admins
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProd ? 30 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many upload requests, please slow down.",
  },
});

// ── General API limiter ───────────────────────────────────────────────────────
// Broad protection for all other endpoints
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProd ? 120 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please slow down.",
  },
});
