// vectorStore.js
// Initialises and provides a shared instance of PGVectorStore.
// PGVectorStore stores text chunk embeddings in PostgreSQL and lets us
// search for the most semantically similar chunks using cosine distance.

import { PGVectorStore } from "@langchain/pgvector";
import databasePool from "../config/db.js";
import { getEmbeddings } from "./embeddingService.js";

// Singleton — the store is created once and reused for every query
let vectorStoreInstance;

export async function getVectorStore() {
  if (!vectorStoreInstance) {
    vectorStoreInstance = await PGVectorStore.initialize(getEmbeddings(), {
      pool: databasePool,
      tableName: "document_chunks",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "content",
        metadataColumnName: "metadata",
      },
      distanceStrategy: "cosine",
      // The table is created by setupDb.js so we skip the built-in check
      skipInitializationCheck: true,
    });
  }

  return vectorStoreInstance;
}
