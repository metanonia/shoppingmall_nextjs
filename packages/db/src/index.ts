import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/client/index";

declare global {
  // eslint-disable-next-line no-var
  var __shoppingmallPrisma: PrismaClient | undefined;
}

function createClient() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__shoppingmallPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__shoppingmallPrisma = prisma;
}

export * from "../generated/client/index";
