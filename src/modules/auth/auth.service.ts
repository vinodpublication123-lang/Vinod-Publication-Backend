import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { AuthPayload } from "../../middleware/auth";
import { RegisterInput, LoginInput, RefreshInput } from "./auth.schemas";
import { sendWelcomeEmail } from "../email/email.service";

function generateAccessToken(payload: Omit<AuthPayload, "type">): string {
  return jwt.sign(
    { ...payload, type: "access" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions
  );
}

function generateRefreshToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(40).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function refreshExpiryDate(): Date {
  const str = env.JWT_REFRESH_EXPIRES_IN;
  const match = str.match(/^(\d+)([smhd])$/);
  const amount = match ? parseInt(match[1], 10) : 7;
  const unit = match ? match[2] : "d";
  const ms: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return new Date(Date.now() + amount * (ms[unit] ?? 86400000));
}

export async function registerService(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new AppError("Email already in use", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  // Create user — passwordHash is a real field on the model
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, phone: input.phone, passwordHash },
  });

  const accessToken = generateAccessToken({ sub: user.id, role: user.role });
  const { raw, hash } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { tokenHash: hash, userId: user.id, expiresAt: refreshExpiryDate() },
  });

  // Send welcome email (fire-and-forget — never blocks registration response)
  sendWelcomeEmail(user.email, user.name);

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    accessToken,
    refreshToken: raw,
  };
}

export async function loginService(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || user.status !== "ACTIVE") {
    throw new AppError("Invalid credentials", 401);
  }

  const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError("Invalid credentials", 401);
  }

  const accessToken = generateAccessToken({ sub: user.id, role: user.role });
  const { raw, hash } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { tokenHash: hash, userId: user.id, expiresAt: refreshExpiryDate() },
  });

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken: raw,
  };
}

export async function refreshService(input: RefreshInput) {
  const hash = crypto.createHash("sha256").update(input.refreshToken).digest("hex");

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash: hash },
    include: { user: { select: { id: true, role: true, status: true } } },
  });

  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  if (tokenRecord.user.status !== "ACTIVE") {
    throw new AppError("User is inactive", 401);
  }

  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revokedAt: new Date() },
  });

  const accessToken = generateAccessToken({
    sub: tokenRecord.user.id,
    role: tokenRecord.user.role,
  });
  const { raw, hash: newHash } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { tokenHash: newHash, userId: tokenRecord.user.id, expiresAt: refreshExpiryDate() },
  });

  return { accessToken, refreshToken: raw };
}

export async function logoutService(refreshToken: string) {
  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getMeService(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, status: true, createdAt: true, updatedAt: true,
    },
  });
  if (!user) throw new AppError("User not found", 404);
  return user;
}
