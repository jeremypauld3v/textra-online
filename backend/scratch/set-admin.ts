import * as dotenv from "dotenv";
dotenv.config();
import { prisma } from "../src/lib/prisma.js";

async function setAdmin() {
  const email = "jeremypaul0101@gmail.com";
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { isAdmin: true }
    });
    console.log(`✅ Admin status granted to: ${user.email}`);
  } catch (e: any) {
    console.error("❌ FAILED:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

setAdmin();
