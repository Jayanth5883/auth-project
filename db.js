// Import Pool from the pg package.
// Pool manages multiple PostgreSQL connections for our application.
import pg from "pg";

// Import dotenv so we can read values from .env
import dotenv from "dotenv";

dotenv.config();

// Get Pool from pg
const { Pool } = pg;

// Create a connection pool using our DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Export the pool so other files can use PostgreSQL
export default pool;