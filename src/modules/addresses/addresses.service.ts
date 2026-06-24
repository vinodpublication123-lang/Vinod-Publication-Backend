import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { CreateAddressInput, UpdateAddressInput } from "./addresses.schemas";

async function assertOwnership(addressId: string, userId: string) {
  const address = await prisma.address.findUnique({
    where: { id: addressId },
    select: { userId: true },
  });
  if (!address) throw new AppError("Address not found", 404);
  if (address.userId !== userId) throw new AppError("Forbidden", 403);
  return address;
}

export async function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function createAddress(userId: string, input: CreateAddressInput) {
  return prisma.$transaction(async (tx) => {
    // If this is default, unset others
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.create({
      data: { ...input, userId },
    });
  });
}

export async function updateAddress(
  addressId: string,
  userId: string,
  input: UpdateAddressInput
) {
  await assertOwnership(addressId, userId);
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.update({
      where: { id: addressId },
      data: input,
    });
  });
}

export async function deleteAddress(addressId: string, userId: string) {
  await assertOwnership(addressId, userId);
  await prisma.address.delete({ where: { id: addressId } });
}
