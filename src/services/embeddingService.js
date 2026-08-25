import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function createEmbedding(text) {
  const result = await ai.models.embedContent({
    model: process.env.EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: 1536,
    },
  });

  return result.embeddings[0].values;
}