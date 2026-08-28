import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Embed a single text string — used at query time
export async function embedText(text) {
  const res = await ai.models.embedContent({
    model: process.env.EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: 1536 },
  });
  return res.embeddings[0].values;
}

// Embed multiple chunks in a single API call — used at ingestion time
export async function embedBatch(chunks) {
  const res = await ai.models.embedContent({
    model: process.env.EMBEDDING_MODEL,
    contents: chunks,
    config: { outputDimensionality: 1536 },
  });
  return res.embeddings.map(e => e.values);
}
