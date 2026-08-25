import dotenv from "dotenv";

dotenv.config();

const CHUNK_SIZE = Number(process.env.CHUNK_SIZE);
const CHUNK_OVERLAP = Number(process.env.CHUNK_OVERLAP);

export function chunkText(text) {
  const words = text.split(/\s+/).filter(Boolean);

  const chunks = [];

  let start = 0;

  while (start < words.length) {
    const end = start + CHUNK_SIZE;

    const chunk = words.slice(start, end).join(" ");

    chunks.push(chunk);

    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}