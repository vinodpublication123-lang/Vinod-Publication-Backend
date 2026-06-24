import { createLogger, format, transports } from "winston";
import { env } from "../config/env";

const { combine, timestamp, printf, errors, colorize, json } = format;

// ── Human-readable format for dev ─────────────────────────────────────────────
const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${ts} [${level}] ${stack ?? message}${extras}`;
  })
);

// ── JSON format for production ────────────────────────────────────────────────
const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  format: env.NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    ...(env.NODE_ENV === "production"
      ? [
          new transports.File({ filename: "logs/error.log", level: "error" }),
          new transports.File({ filename: "logs/app.log" }),
        ]
      : []),
  ],
});
