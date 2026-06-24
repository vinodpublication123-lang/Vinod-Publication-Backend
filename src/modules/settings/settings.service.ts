import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { UpdateSettingsInput } from "./settings.schemas";
import { auditLog } from "../audit/audit.service";

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

export async function updateSettings(input: UpdateSettingsInput, actorId?: string) {
  const settings = await getOrCreateSettings();
  const { metadata, ...rest } = input;
  const updated = await prisma.storeSettings.update({
    where: { id: settings.id },
    data: {
      ...rest,
      ...(metadata !== undefined && {
        metadata: metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue),
      }),
    },
  });
  auditLog({
    actorId,
    action: "SETTINGS_UPDATE",
    entityType: "StoreSettings",
    entityId: settings.id,
    metadata: { fields: Object.keys(input) },
  });
  return updated;
}

