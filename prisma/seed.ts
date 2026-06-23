import { PrismaClient } from "@prisma/client";

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
