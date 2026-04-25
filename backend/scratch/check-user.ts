import * as dotenv from "dotenv";
dotenv.config();
import { prisma } from "../src/lib/prisma.js";

async function check() {
  const email = "jeremypaul0101@gmail.com";
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true, isAdmin: true, id: true }
    });
    console.log("--- User Verification ---");
    console.log(JSON.stringify(user, null, 2));
    console.log("-------------------------");
  } catch (e: any) {
    console.error("❌ FAILED:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
