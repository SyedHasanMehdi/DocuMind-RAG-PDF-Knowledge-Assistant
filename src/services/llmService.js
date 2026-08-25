import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function generateAnswer(query, context) {
  const prompt = `
You are a helpful assistant answering questions based only on the provided context.

Rules:
- Answer the user's question using the context.
- Do not make up information.
- If the answer cannot be found in the context, say that you don't have enough information.
- Keep the answer clear and concise.

Context:
${context}

Question:
${query}
`;

  const response = await ai.models.generateContent({
    model: process.env.LLM_MODEL,
    contents: prompt,
  });

  return response.text;
}