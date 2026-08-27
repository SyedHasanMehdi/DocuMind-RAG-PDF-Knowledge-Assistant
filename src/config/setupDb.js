// setupDb.js
// Runs once on server startup to make sure all required database tables exist.
// Uses IF NOT EXISTS so it is safe to run every time — it will not overwrite data.

import databasePool from "./db.js";

export async function setupDatabase() {
  try {
    // Enable the pgvector extension so PostgreSQL can store and search vector embeddings
    await databasePool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("pgvector extension ready");

    // The 'documents' table stores one row per uploaded document (PDF or text)
    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY,
        filename TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("documents table ready");

    // The 'document_chunks' table stores every text chunk along with its vector embedding.
    // Each chunk belongs to a document and is linked via the metadata JSON column.
    await databasePool.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        embedding VECTOR(1536)
      );
    `);

    // Add the metadata column if it does not exist yet (safe to run on an existing table)
    await databasePool.query(`
      ALTER TABLE document_chunks
      ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);

    // Create an index on the document_id field inside the metadata JSON for fast lookups
    await databasePool.query(`
      CREATE INDEX IF NOT EXISTS document_chunks_metadata_document_id_idx
      ON document_chunks ((metadata->>'document_id'));
    `);

    console.log("document_chunks table ready");
  } catch (error) {
    console.error("Database setup failed:", error);
    throw error;
  }
}
