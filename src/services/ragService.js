import { embedText } from "./embeddingService.js";
import { retrieveRelevantChunks } from "./retrievalService.js";
import { generateAnswer } from "./llmService.js";

export async function answerQuestion(question, documentId = null) {
  const queryVector = await embedText(question);
  const chunks = await retrieveRelevantChunks(queryVector, documentId);
  const context = chunks.map((c) => c.pageContent || c.content).join("\n\n");
  const answer = await generateAnswer(question, context);

  return answer;
}
