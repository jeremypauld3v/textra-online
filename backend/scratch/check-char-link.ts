import * as dotenv from "dotenv";
dotenv.config();
import { prisma } from "../src/lib/prisma.js";

async function check() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "jeremypaul0101@gmail.com" },
      include: { characters: true }
    });

    console.log("--- USER CHARACTER AUDIT ---");
    console.log(`User ID: ${user?.id}`);
    console.log(`Character Count: ${user?.characters?.length || 0}`);
    
    if (user?.characters && user.characters.length > 0) {
      const char = user.characters[0];
      if (char) {
        console.log(`Character Name: ${char.name}`);
        console.log(`Character ID: ${char.id}`);
        console.log(`Current Depth: ${char.currentDepth}km`);
        console.log(`Status: ${char.actionStatus}`);
        console.log(`Pending Encounter: ${JSON.stringify(char.pendingEncounter)}`);
        console.log(`Dungeon Progress: ${char.dungeonProgress}`);
      }
    } else {
      console.log("⚠️ WARNING: User has NO characters linked!");
    }
    console.log("----------------------------");
  } catch (e: any) {
    console.error("AUDIT FAILED:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
