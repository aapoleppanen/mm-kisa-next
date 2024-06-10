import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// seed is used to init
async function main() {
  await prisma.$queryRaw`

  `
}
