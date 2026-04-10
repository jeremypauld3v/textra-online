import { Queue } from "bullmq";
import { Redis } from "ioredis";
const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const travelQueue = new Queue("TravelQueue", { connection });
async function kickstartAdmin() {
    const adminId = "edb466e2-caec-4f28-9d86-1795e2d0361b";
    console.log(`Kickstarting travel for Admin (${adminId})...`);
    await travelQueue.add("pulse", { characterId: adminId }, {
        delay: 1000,
        jobId: `pulse-${adminId}`,
        removeOnComplete: true,
        removeOnFail: true
    });
    console.log("Job added. Movement should resume in 1s.");
    process.exit(0);
}
kickstartAdmin();
//# sourceMappingURL=kickstart-admin.js.map