import * as dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
async function resetPassword() {
    const email = "jeremypaul0101@gmail.com";
    const newPassword = "admin123";
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const user = await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                isAdmin: true // Also ensuring admin status is set if column exists
            }
        });
        console.log(`✅ Password reset successfully for: ${user.email}`);
        console.log(`🔑 Your temporary password is: ${newPassword}`);
    }
    catch (e) {
        if (e.message.includes("isAdmin")) {
            // Fallback if the column still doesn't exist in DB
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({
                where: { email },
                data: { password: hashedPassword }
            });
            console.log(`✅ Password reset successfully (without isAdmin flag) for: ${email}`);
            console.log(`🔑 Your temporary password is: ${newPassword}`);
        }
        else {
            console.error("❌ FAILED:", e.message);
        }
    }
    finally {
        await prisma.$disconnect();
    }
}
resetPassword();
//# sourceMappingURL=reset-password.js.map