// documentRepository.js
// All database queries related to documents and their chunks live here.
// Keeping database logic in one place makes the rest of the app easier to read.

import databasePool from "../config/db.js";
import { randomUUID } from "node:crypto";

// Insert a new document record and return the saved row
export async function createDocument({ filename } = {}) {
  const documentId = randomUUID();

  const result = await databasePool.query(
    `INSERT INTO documents (id, filename)
     VALUES ($1, $2)
     RETURNING id, filename, created_at;`,
    [documentId, filename ?? null]
  );

  return result.rows[0];
}

// Find a document by its UUID. Returns null if not found.
export async function getDocumentById(documentId) {
  const result = await databasePool.query(
    `SELECT id, filename, created_at
     FROM documents
     WHERE id = $1;`,
    [documentId]
  );

  return result.rows[0] ?? null;
}

// Find a document by its filename (e.g. "resume.pdf"). Returns null if not found.
export async function getDocumentByFilename(filename) {
  const result = await databasePool.query(
    `SELECT id, filename, created_at
     FROM documents
     WHERE filename = $1
     LIMIT 1;`,
    [filename]
  );

  return result.rows[0] ?? null;
}

// Return all documents in the database
export async function getAllDocuments() {
  const result = await databasePool.query(
    `SELECT id, filename, created_at
     FROM documents;`
  );
  return result.rows;
}

// Delete a document and all of its chunks in a single atomic transaction.
// Returns the deleted document row, or null if the document did not exist.
export async function deleteDocument(documentId) {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");

    // Remove every chunk that belongs to this document
    await client.query(
      `DELETE FROM document_chunks
       WHERE metadata->>'document_id' = $1;`,
      [documentId]
    );

    // Remove the document record itself
    const result = await client.query(
      `DELETE FROM documents
       WHERE id = $1
       RETURNING id, filename;`,
      [documentId]
    );

    await client.query("COMMIT");
    return result.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Count how many chunks are stored for a given document
export async function getDocumentChunksCount(documentId) {
  const result = await databasePool.query(
    `SELECT COUNT(*) as count
     FROM document_chunks
     WHERE metadata->>'document_id' = $1;`,
    [documentId]
  );
  return Number(result.rows[0]?.count ?? 0);
}
