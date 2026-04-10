import { prisma } from "../src/lib/prisma.js";

async function test() {
  try {
    const count = await (prisma as any).chatMessage.count();
    console.log("✅ Runtime check passed. chatMessage property exists. Count:", count);
  } catch (err: any) {
    console.error("❌ Runtime check failed:", err.message);
  } finally {
    process.exit();
  }
}

test();
