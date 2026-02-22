import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL!;

const sql = neon(connectionString);
const adapter = new PrismaNeon(sql);

const prismaClient = new PrismaClient({
  adapter,
});

// Extend Prisma Client with $setTenantId method for RLS
export const db = prismaClient.$extends({
  async $setTenantId(tenantId: string) {
    await prismaClient.$executeRawUnsafe(`SET app.current_tenant = '${tenantId}'`);
    return prismaClient;
  },
}) as typeof prismaClient & {
  $setTenantId: (tenantId: string) => Promise<typeof prismaClient>;
};

export default db;
