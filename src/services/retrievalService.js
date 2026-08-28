import pool from "../config/db.js";
import { embedText } from "./embeddingService.js";
import { getDocumentById } from "../repositories/documentRepository.js";
import { hasUsefulReadableText } from "../utils/textQuality.js";

export class DocumentNotFoundError extends Error {
  constructor(documentId) {
    super(`Document not found: ${documentId}`);
    this.name = "DocumentNotFoundError";
    this.statusCode = 404;
  }
}

export async function retrieveRelevantChunks(question, documentId = null, maxChunks = 5) {
  if (documentId) {
    const doc = await getDocumentById(documentId);
    if (!doc) throw new DocumentNotFoundError(documentId);
  }

  const queryVector = await embedText(question);
  const fetchCount = Math.max(maxChunks * 3, 15);

  const whereClause = documentId
    ? `WHERE metadata->>'document_id' = $2`
    : "";

  const params = documentId
    ? [JSON.stringify(queryVector), documentId, fetchCount]
    : [JSON.stringify(queryVector), fetchCount];

  const limitParam = documentId ? "$3" : "$2";

  const result = await pool.query(
    `SELECT content, metadata, 1 - (embedding <=> $1::vector) AS score
     FROM document_chunks
     ${whereClause}
     ORDER BY embedding <=> $1::vector
     LIMIT ${limitParam}`,
    params
  );

  return result.rows
    .filter(row => hasUsefulReadableText(row.content))
    .slice(0, maxChunks)
    .map(row => ({
      content: row.content,
      score: row.score,
      document_id: row.metadata?.document_id ?? null,
      filename: row.metadata?.filename ?? null,
      chunk_index: row.metadata?.chunk_index ?? null,
    }));
}
