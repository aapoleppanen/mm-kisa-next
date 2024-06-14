import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

let prisma: PrismaClient;

const initializePrisma = (withLogging: boolean = true) => {
  if (!withLogging) {
    return new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient;
  }

  return new PrismaClient().$extends(withAccelerate()).$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        const start = performance.now();
        const result = await query(args);
        const end = performance.now();
        const time = end - start;
        console.log(
          { model, operation, args, time },
          { showHidden: false, depth: null, colors: true }
        );
        return result;
      },
    },
  }) as unknown as PrismaClient;
};

if (process.env.NODE_ENV === "production") {
  prisma = initializePrisma();
} else {
  let globalWithPrisma = global as typeof globalThis & {
    prisma: PrismaClient;
  };
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = initializePrisma();
  }
  prisma = globalWithPrisma.prisma;
}

export default prisma;
