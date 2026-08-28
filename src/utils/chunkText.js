import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const CHUNK_SIZE = Number(process.env.CHUNK_SIZE) || 600;
const CHUNK_OVERLAP = Number(process.env.CHUNK_OVERLAP) || 120;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: Math.min(CHUNK_OVERLAP, CHUNK_SIZE - 1),
});

export async function chunkText(text) {
  return (await splitter.splitText(text)).filter(Boolean);
}
