import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // ── Database ───────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().url(),

  // ── JWT ───────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().int().positive().default(12),

  // ── AWS S3 ────────────────────────────────────────────────────────────────
  AWS_REGION: z.string().min(1).default("ap-south-1"),
  AWS_ACCESS_KEY_ID: z.string().min(1).default(""),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).default(""),
  AWS_S3_BUCKET: z.string().min(1).default(""),

  // ── Razorpay ─────────────────────────────────────────────────────────────
  RAZORPAY_KEY_ID: z.string().min(1).default(""),
  RAZORPAY_KEY_SECRET: z.string().min(1).default(""),

  // ── Resend ────────────────────────────────────────────────────────────────
  RESEND_API_KEY: z.string().min(1).default(""),
  EMAIL_FROM: z.string().default("noreply@vinverse.in"),
  ADMIN_EMAIL: z.string().default("admin@vinverse.in"),

  // ── CORS ──────────────────────────────────────────────────────────────────
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  ADMIN_URL: z.string().default("http://localhost:3001"),
});

export const env = envSchema.parse(process.env);
