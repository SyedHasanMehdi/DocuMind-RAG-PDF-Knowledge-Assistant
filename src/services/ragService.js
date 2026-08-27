// ragService.js
// Orchestrates the full RAG (Retrieval-Augmented Generation) pipeline:
//   1. Find the most relevant text chunks for the question (retrieval)
//   2. Build a context string from those chunks
//   3. Pass the context and question to the LLM to generate an answer

import { retrieveRelevantChunks } from "./retrievalService.js";
import { generateAnswer } from "./llmService.js";

// Format the retrieved chunks into a numbered list with source labels
function buildContext(chunks) {
  return chunks
    .map((chunk, index) => {
      const sourceLabel = chunk.filename ? ` [Source: ${chunk.filename}]` : "";
      return `[${index + 1}]${sourceLabel} ${chunk.content}`;
    })
    .join("\n\n");
}

// Main entry point for the chat endpoint.
// Returns the AI answer together with the source chunks used to generate it.
export async function answerQuestion(
  question,
  documentId = null,
  { maxRelevantChunks = 5 } = {}
) {
  const chunks = await retrieveRelevantChunks(question, documentId, maxRelevantChunks);

  // If no usable chunks were found, return a helpful message instead of an empty answer
  if (chunks.length === 0) {
    return {
      answer:
        "No readable text was found for this question. If the PDF is scanned images, export it as a text PDF and ingest it again. To search one file only, send document_id in the request body.",
      document_id: documentId || "all",
      sources: [],
    };
  }

  const context = buildContext(chunks);
  const answer = await generateAnswer(question, context);

  return {
    answer,
    document_id: documentId || "all",
    sources: chunks,
  };
}
