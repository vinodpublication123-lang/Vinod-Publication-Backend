import { Router } from "express";
import { prisma } from "../../lib/prisma";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, data: { status: "ok", database: "connected" } });
  } catch (error) {
    next(error);
  }
});
