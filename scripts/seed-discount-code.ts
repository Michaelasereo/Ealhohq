import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.discountCode.upsert({
    where: { code: "ASEREMICHAEL" },
    update: {
      discountType: "full",
      discountValue: 100,
      isActive: true,
      maxUses: null,
    },
    create: {
      code: "ASEREMICHAEL",
      discountType: "full",
      discountValue: 100,
      maxUses: null,
      isActive: true,
    },
  });
  console.log("Discount code ASEREMICHAEL ready (100% off, unlimited uses).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
