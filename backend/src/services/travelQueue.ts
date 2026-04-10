import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";

// Redis instance for BullMQ
const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export const travelQueueName = "TravelQueue";

// Initialize the queue
export const travelQueue = new Queue(travelQueueName, { connection });

// Initialize the worker that processes the travel requests
export const travelWorker = new Worker(
  travelQueueName,
  async (job: Job) => {
    // Process the job
    console.log(`Processing travel job for character ID: ${job.data.characterId}`);
    
    // Simulate processing time or perform actual logic here (like triggering an encounter)
    // The delay was handled globally when the job was added, so by the time the worker 
    // picks this up, the character has 'arrived' at the destination.
    
    return { success: true, message: `Character ${job.data.characterId} arrived at ${job.data.destinationId}` };
  },
  { connection }
);

// Event listeners for the worker
travelWorker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

travelWorker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});
