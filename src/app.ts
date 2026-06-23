import cors from "cors";
import express from "express";
import helmet from "helmet";
import { healthRouter } from "./modules/health/health.routes.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({
    name: "VINVERSE Backend",
    phase: "Phase 1",
    status: "running"
  });
});

app.use("/health", healthRouter);

app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(error);

    res.status(500).json({
      message: "Internal server error"
    });
  }
);
