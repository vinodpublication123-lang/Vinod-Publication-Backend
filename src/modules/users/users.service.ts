import bcrypt from "bcryptjs";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { UpdateProfileInput, UpdatePasswordInput } from "./users.schemas";

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) throw new AppError("User not found", 404);
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: input,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      updatedAt: true,
    },
  });
  return user;
}

export async function updatePassword(userId: string, input: UpdatePasswordInput) {
  // Fetch including passwordHash (not in select above)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const match = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!match) throw new AppError("Current password is incorrect", 400);

  if (input.currentPassword === input.newPassword) {
    throw new AppError("New password must differ from current password", 400);
  }

  const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Revoke all refresh tokens to force re-login
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

