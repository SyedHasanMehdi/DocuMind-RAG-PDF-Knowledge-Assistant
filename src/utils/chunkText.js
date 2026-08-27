// chunkText.js
// Splits a long string of text into smaller overlapping chunks so that each
// chunk fits within the embedding model's input size limit.
// Chunk size and overlap can be tuned via environment variables.

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// How many characters to put in each chunk (default: 600)
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE) || 600;

// How many characters the next chunk should re-use from the end of the previous
// one. Overlap helps preserve context at chunk boundaries (default: 120).
const CHUNK_OVERLAP = Number(process.env.CHUNK_OVERLAP) || 120;

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: Math.min(CHUNK_OVERLAP, CHUNK_SIZE - 1),
});

// Split text into an array of non-empty string chunks
export async function chunkText(text) {
  const chunks = await textSplitter.splitText(text);
  return chunks.filter(Boolean);
}
