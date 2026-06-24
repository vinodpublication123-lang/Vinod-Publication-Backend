import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { UpdateSettingsInput } from "./settings.schemas";

// Singleton: always operate on the first (and only) record, auto-creating if needed.
async function getOrCreateSettings() {
  let settings = await prisma.storeSettings.findFirst();
  if (!settings) {
    settings = await prisma.storeSettings.create({ data: {} });
  }
  return settings;
}

export async function getSettings() {
  return getOrCreateSettings();
}

export async function updateSettings(input: UpdateSettingsInput) {
  const settings = await getOrCreateSettings();
  const { metadata, ...rest } = input;
  return prisma.storeSettings.update({
    where: { id: settings.id },
    data: {
      ...rest,
      ...(metadata !== undefined && {
        metadata: metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue),
      }),
    },
  });
}

