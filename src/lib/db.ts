import { PrismaClient } from '@prisma/client';

const legacyLinuxDbUrl = 'file:/home/z/my-project/db/custom.db';

if (process.platform === 'win32' && process.env.DATABASE_URL === legacyLinuxDbUrl) {
  process.env.DATABASE_URL = 'file:../db/custom.db';
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDatabaseUrl?: string;
};

const databaseUrl = process.env.DATABASE_URL || '';

export const db =
  globalForPrisma.prisma && globalForPrisma.prismaDatabaseUrl === databaseUrl
    ? globalForPrisma.prisma
    : new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaDatabaseUrl = databaseUrl;
}
