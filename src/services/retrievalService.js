import { createEmbedding } from "./embeddingService.js";
import { searchSimilarChunks } from "../repositories/documentRepository.js";

export async function retrieveRelevantChunks(query, limit = 5) {
  const queryEmbedding = await createEmbedding(query);

  const chunks = await searchSimilarChunks(
    queryEmbedding,
    limit
  );

  return chunks;
}