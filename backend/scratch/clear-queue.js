import { Queue } from "bullmq";
import { Redis } from "ioredis";
const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const travelQueue = new Queue("TravelQueue", { connection });
async function clearStaleJobs() {
    console.log("Cleaning stale jobs...");
    await travelQueue.clean(0, 1000, "completed");
    await travelQueue.clean(0, 1000, "failed");
    console.log("Done. Stale job IDs released.");
    process.exit(0);
}
clearStaleJobs();
//# sourceMappingURL=clear-queue.js.map