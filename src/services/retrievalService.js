import { PGVectorStore } from "@langchain/pgvector";
import pool from "../config/db.js";

// Initialize LangChain PGVectorStore with existing PostgreSQL pool
const vectorStore = new PGVectorStore(
  {},
  {
    pool,
    tableName: "document_chunks",
    columns: {
      idColumnName: "id",
      vectorColumnName: "embedding",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
  }
);

// Retrieve top relevant chunks given an embedding vector
export async function retrieveRelevantChunks(queryVector, documentId = null, k = 5) {
  const filter = documentId ? { document_id: documentId } : undefined;
  const results = await vectorStore.similaritySearchVectorWithScore(queryVector, k, filter);
  return results.map(([doc]) => doc);
}


