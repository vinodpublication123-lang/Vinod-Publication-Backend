import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.storeSettings.upsert({
    where: {
      id: "vinverse-default-settings"
    },
    update: {},
    create: {
      id: "vinverse-default-settings",
      storeName: "VINVERSE",
      currency: "INR",
      taxEnabled: true,
      shippingEnabled: true
    }
  });
  console.log("Default store settings seeded/verified.");

  const adminEmail = "admin@vinverse.com";
  const passwordHash = await bcrypt.hash("Admin@123456", 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "System Administrator",
      email: adminEmail,
      passwordHash: passwordHash,
      role: "ADMIN",
      status: "ACTIVE"
    }
  });
  console.log("Default admin user seeded/verified.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
