import "server-only";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  dailyPingPrisma?: PrismaClient;
};

export function getPrisma() {
  if (!globalForPrisma.dailyPingPrisma) {
    globalForPrisma.dailyPingPrisma = new PrismaClient();
  }

  return globalForPrisma.dailyPingPrisma;
}
