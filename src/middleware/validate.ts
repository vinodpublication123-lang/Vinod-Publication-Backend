import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../lib/errors";

interface ValidateSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export function validate(schemas: ValidateSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as Record<string, string>;
      }
      next();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errors" in err) {
        const zodErr = err as { errors: Array<{ path: (string | number)[]; message: string }> };
        const message = zodErr.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
        next(new AppError(message, 422));
      } else {
        next(err);
      }
    }
  };
}
