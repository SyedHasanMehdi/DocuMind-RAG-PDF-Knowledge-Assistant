// db.js
// Creates and exports a single shared PostgreSQL connection pool.
// All database queries in the app go through this pool instead of
// opening a new connection every time (which would be slow).

import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// The connection string is read from the DATABASE_URL environment variable.
// Example: postgresql://user:password@localhost:5432/rag_chatbot
const databasePool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default databasePool;
