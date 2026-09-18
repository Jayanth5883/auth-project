// Import dotenv so we can read the Redis details
// from the .env file.
import dotenv from "dotenv";

dotenv.config();

// Import the Redis connection class from BullMQ.
import { Redis } from "ioredis";

// Create a Redis connection using the credentials
// stored in the .env file.
const redisConnection = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,

    // BullMQ requires this setting for its Redis connection.
    maxRetriesPerRequest: null,
});

// Export the connection so queues and workers
// can use the same Redis configuration.
export default redisConnection;