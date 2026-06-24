import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * HTTP request logger middleware.
 * Logs method, path, status code, and response time.
 */
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 500 ? "error"
        : res.statusCode >= 400 ? "warn"
        : "info";

      logger.log(level, `${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      });
    });

    next();
  };
}
