import { ingestText } from "../services/ingestionService.js";

export async function ingestDocument(req, res) {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: "text is required",
      });
    }

    const chunks = await ingestText(text);

    res.status(201).json({
      message: "Document ingested successfully",
      totalChunks: chunks.length,
      chunks,
    });
  } catch (error) {
    console.error("❌ Document ingestion failed:", error);

    res.status(500).json({
      error: "Failed to ingest document",
    });
  }
}