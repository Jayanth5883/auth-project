// Import Worker from BullMQ.
// Worker is responsible for processing jobs from a queue.
import { Worker } from "bullmq";

// Import our Redis connection.
import redisConnection from "../config/redis.js";

// Create a worker for the "emailQueue".
const emailWorker = new Worker(
    "emailQueue",

    // This function runs whenever a job is available.
    async (job) => {

    console.log("Processing job:", job.name);
    console.log("Job data:", job.data);

    // Simulate background work.
    await new Promise((resolve) => {
        setTimeout(resolve, 3000);
    });

    console.log("Background job completed successfully");
},
    // Tell BullMQ which Redis connection to use.
    {
        connection: redisConnection,
    }
);

// Runs when a job is completed successfully.
emailWorker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});

// Runs when a job fails.
emailWorker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
});

console.log("Email worker is running...");
