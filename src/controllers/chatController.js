import { answerQuestion } from "../services/ragService.js";

export async function chat(req, res) {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        error: "Query is required",
      });
    }

    const result = await answerQuestion(query);

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ Chat error:", error);

    res.status(500).json({
      error: "Failed to generate answer",
    });
  }
}