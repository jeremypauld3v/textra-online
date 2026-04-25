import * as dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
async function run() {
    const email = "jeremypaul0101@gmail.com";
    const newPassword = "admin123";
    try {
        console.log("🛠️ Attempting to fix database schema...");
        // 1. Manually add the column using raw SQL to bypass client checks
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN DEFAULT false;`);
            console.log("✅ Column 'isAdmin' ensured.");
        }
        catch (sqlErr) {
            console.log("ℹ️ Note: Could not add column via SQL (it might already exist or raw execution failed).", sqlErr.message);
        }
        // 2. Hash and update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        // Use raw SQL for the update to avoid "isAdmin" field issues if client is still out of sync
        await prisma.$executeRawUnsafe(`UPDATE "User" SET "password" = $1, "isAdmin" = true WHERE "email" = $2;`, hashedPassword, email);
        console.log(`✅ Password reset and Admin status granted for: ${email}`);
        console.log(`🔑 Your temporary password is: ${newPassword}`);
    }
    catch (e) {
        console.error("❌ FAILED:", e.message);
    }
    finally {
        await prisma.$disconnect();
    }
}
run();
//# sourceMappingURL=fix-db-and-reset.js.map