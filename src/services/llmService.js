import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `You are a helpful assistant answering questions based only on the provided context.
- Answer using the context.
- Do not make up information.
- If the answer is not in the context, say you don't have enough information.
- Keep the answer clear and concise.`;

export async function generateAnswer(question, context) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  if (!model) throw new Error("LLM_MODEL is required");

  const client = new GoogleGenAI({ apiKey });

  const res = await client.models.generateContent({
    model,
    config: { systemInstruction: SYSTEM_PROMPT },
    contents: `Context:\n${context || "No context available."}\n\nQuestion:\n${question}`,
  });

  return res.text;
}
