import * as dotenv from "dotenv";
dotenv.config();
import { prisma } from "../src/lib/prisma.js";

async function list() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, isAdmin: true }
    });
    console.log("--- User List ---");
    console.log(JSON.stringify(users, null, 2));
    console.log("-----------------");
  } catch (e: any) {
    console.error("❌ FAILED:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

list();
