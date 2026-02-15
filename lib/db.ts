import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma 7 requires a database adapter
const adapter = new PrismaPg({
  connectionString: process.env.POSTGRES_PRISMA_URL!,
});

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

export const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
