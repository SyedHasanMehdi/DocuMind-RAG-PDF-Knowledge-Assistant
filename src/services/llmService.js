// llmService.js
// Calls the Gemini chat model to generate an answer for a user's question
// given a block of retrieved context text.

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// The system prompt tells the model to answer only from the provided context
const answerPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful assistant answering questions based only on the provided context.

Rules:
- Answer the user's question using the context.
- Do not make up information.
- If the answer cannot be found in the context, say that you don't have enough information.
- Keep the answer clear and concise.`,
  ],
  [
    "human",
    `Context:
{context}

Question:
{question}`,
  ],
]);

// Singleton LangChain chain: prompt → Gemini model → plain string output
let qaChain;

function getQaChain() {
  if (qaChain) {
    return qaChain;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.LLM_MODEL;

  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  if (!modelName) throw new Error("LLM_MODEL is required");

  const chatModel = new ChatGoogleGenerativeAI({
    apiKey,
    model: modelName,
  });

  // Chain the prompt, the model, and an output parser together
  qaChain = answerPrompt
    .pipe(chatModel)
    .pipe(new StringOutputParser());

  return qaChain;
}

// Generate a plain-text answer for the given question using the provided context
export async function generateAnswer(question, context) {
  return getQaChain().invoke({
    question,
    context: context || "No relevant context was retrieved.",
  });
}
