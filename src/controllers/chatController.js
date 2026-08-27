// chatController.js
// Handles HTTP requests for the chat endpoints.
// Validates the incoming request body, calls the RAG or retrieval service,
// and returns the result (or an appropriate error) to the client.

import { answerQuestion } from "../services/ragService.js";
import {
  retrieveRelevantChunks,
  DocumentNotFoundError,
} from "../services/retrievalService.js";

// The maximum number of chunks a caller can request (hard cap to avoid abuse)
const MAX_ALLOWED_CHUNKS = 20;

// Parse and validate the shared fields used by both chat endpoints.
// Returns a structured object on success, or sends a 400 error and returns null.
function parseChatRequest(req, res) {
  const { query, document_id, maxRelevantChunks } = req.body;

  // The question is required
  if (!query || typeof query !== "string" || !query.trim()) {
    res.status(400).json({ error: "Query is required" });
    return null;
  }

  // maxRelevantChunks defaults to 5 when omitted
  const rawLimit = maxRelevantChunks ?? 5;
  const chunkLimit = Number(rawLimit);

  if (!Number.isFinite(chunkLimit) || chunkLimit < 1) {
    res.status(400).json({ error: "maxRelevantChunks must be a positive number" });
    return null;
  }

  return {
    question: query.trim(),
    // document_id is optional — when provided, search is scoped to that document only
    documentId:
      typeof document_id === "string" && document_id.trim()
        ? document_id.trim()
        : null,
    maxRelevantChunks: Math.min(Math.floor(chunkLimit), MAX_ALLOWED_CHUNKS),
  };
}

// POST /api/chat
// Accepts a question and returns an AI-generated answer with source references.
export async function chat(req, res) {
  try {
    const chatRequest = parseChatRequest(req, res);
    if (!chatRequest) return;

    const result = await answerQuestion(
      chatRequest.question,
      chatRequest.documentId,
      { maxRelevantChunks: chatRequest.maxRelevantChunks }
    );

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return res.status(404).json({ error: error.message });
    }

    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to generate answer" });
  }
}

// POST /api/chat/retrieve
// Returns the raw matching text chunks without calling the AI model.
// Useful for debugging or for building custom UIs.
export async function retrieve(req, res) {
  try {
    const chatRequest = parseChatRequest(req, res);
    if (!chatRequest) return;

    const chunks = await retrieveRelevantChunks(
      chatRequest.question,
      chatRequest.documentId,
      chatRequest.maxRelevantChunks
    );

    res.status(200).json({
      query: chatRequest.question,
      document_id: chatRequest.documentId || "all",
      sources: chunks,
    });
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return res.status(404).json({ error: error.message });
    }

    console.error("Retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve chunks" });
  }
}
