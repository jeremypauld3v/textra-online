import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/textra_db?schema=public",
});
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
//# sourceMappingURL=prisma.js.map