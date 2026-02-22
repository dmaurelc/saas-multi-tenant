import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL!;

const sql = neon(connectionString);
const adapter = new PrismaNeon(sql);

export const db = new PrismaClient({
  adapter,
});

export default db;
