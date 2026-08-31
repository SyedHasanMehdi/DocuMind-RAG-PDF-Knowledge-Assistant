import { answerQuestion } from "../services/ragService.js";

// POST /api/chat
export async function chat(req, res) {
  try {
    const { question, documentId } = req.body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    const answer = await answerQuestion(question.trim(), documentId);

    return res.status(200).json({ answer });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: "Failed to generate answer" });
  }
}

