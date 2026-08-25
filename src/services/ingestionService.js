import { chunkText } from "../utils/chunkText.js";
import { createEmbedding } from "./embeddingService.js";
import { insertDocumentChunk } from "../repositories/documentRepository.js";

export async function ingestText(text) {
  // 1. Break document into chunks
  const chunks = chunkText(text);

  console.log(`📄 Created ${chunks.length} chunks`);

  const storedChunks = [];

  // 2. Generate embedding for each chunk
  // 3. Store chunk + embedding
  for (const chunk of chunks) {
    const embedding = await createEmbedding(chunk);

    const storedChunk = await insertDocumentChunk(
      chunk,
      embedding
    );

    storedChunks.push(storedChunk);
  }

  return storedChunks;
}