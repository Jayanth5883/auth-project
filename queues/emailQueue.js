// Import Queue from BullMQ.
import { Queue } from "bullmq";

// Import our Redis connection.
import redisConnection from "../config/redis.js";

// Create the email queue.
const emailQueue = new Queue("emailQueue", {
    connection: redisConnection,

    // Default settings for jobs added to this queue.
    defaultJobOptions: {
        // Retry the job up to 3 times if it fails.
        attempts: 3,

        // Wait 2 seconds before retrying.
        backoff: {
            type: "fixed",
            delay: 2000,
        },

        // Remove successfully completed jobs from Redis.
        removeOnComplete: true,

        // Keep failed jobs so we can inspect them.
        removeOnFail: false,
    },
});

// Export the queue.
export default emailQueue;