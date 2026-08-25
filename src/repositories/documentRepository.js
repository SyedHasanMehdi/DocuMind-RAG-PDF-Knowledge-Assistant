import pool from "../config/db.js";

export async function insertDocumentChunk(content, embedding) {
  const result = await pool.query(
    `
      INSERT INTO document_chunks (content, embedding)
      VALUES ($1, $2)
      RETURNING id, content;
    `,
    [content, JSON.stringify(embedding)]
  );

  return result.rows[0];
}

export async function searchSimilarChunks(queryEmbedding, limit = 5) {
  const result = await pool.query(
    `
      SELECT
        id,
        content,
        embedding <=> $1::vector AS distance
      FROM document_chunks
      ORDER BY embedding <=> $1::vector
      LIMIT $2;
    `,
    [JSON.stringify(queryEmbedding), limit]
  );

  return result.rows;
}