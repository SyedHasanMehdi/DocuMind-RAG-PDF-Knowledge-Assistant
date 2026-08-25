import { retrieveRelevantChunks } from "./retrievalService.js";
import { generateAnswer } from "./llmService.js";

export async function answerQuestion(query) {
  const chunks = await retrieveRelevantChunks(query, 5);

  const context = chunks
    .map((chunk) => chunk.content)
    .join("\n\n");

  const answer = await generateAnswer(query, context);

  return {
    answer,
    sources: chunks,
  };
}