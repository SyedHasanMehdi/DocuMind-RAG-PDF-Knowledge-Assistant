// retrievalService.js
// Finds the most relevant text chunks for a given question using vector similarity search.
// Optionally filters results to a single document when a document_id is provided.

import { getDocumentById } from "../repositories/documentRepository.js";
import { getVectorStore } from "./vectorStore.js";
import { hasUsefulReadableText } from "../utils/textQuality.js";

// Custom error thrown when a caller requests a document that does not exist
export class DocumentNotFoundError extends Error {
  constructor(documentId) {
    super(`Document not found: ${documentId}`);
    this.name = "DocumentNotFoundError";
    this.statusCode = 404;
  }
}

// Search the vector store for chunks similar to the question.
// Returns an array of chunk objects sorted by relevance (most relevant first).
export async function retrieveRelevantChunks(
  question,
  documentId = null,
  maxRelevantChunks = 5
) {
  // If a specific document is requested, verify it exists before searching
  let metadataFilter;
  if (documentId) {
    const document = await getDocumentById(documentId);
    if (!document) {
      throw new DocumentNotFoundError(documentId);
    }
    metadataFilter = { document_id: documentId };
  }

  // Fetch more candidates than needed so we have room to filter out low-quality chunks
  const vectorStore = await getVectorStore();
  const searchResults = await vectorStore.similaritySearchWithScore(
    question,
    Math.max(maxRelevantChunks * 3, 15),
    metadataFilter
  );

  // Keep only chunks that contain enough real words, then trim to the requested count
  return searchResults
    .filter(([chunk]) => hasUsefulReadableText(chunk.pageContent))
    .slice(0, maxRelevantChunks)
    .map(([chunk, distance]) => ({
      id: chunk.id,
      content: chunk.pageContent,
      distance,
      document_id: chunk.metadata?.document_id ?? documentId ?? null,
      filename: chunk.metadata?.filename ?? null,
      chunk_index: chunk.metadata?.chunk_index ?? null,
    }));
}
