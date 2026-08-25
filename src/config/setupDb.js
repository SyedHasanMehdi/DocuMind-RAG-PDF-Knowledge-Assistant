import pool from "./db.js";

export async function setupDatabase() {
  try {
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
    `);

    console.log("✅ pgvector extension ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        embedding VECTOR(1536)
      );
    `);

    console.log("✅ document_chunks table ready");
  } catch (error) {
    console.error("❌ Database setup failed");
    console.error(error);

    throw error;
  }
}