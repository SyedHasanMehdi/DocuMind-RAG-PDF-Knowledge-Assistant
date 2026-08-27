// documentController.js
// Handles HTTP requests related to document management.
// Calls the ingestion service and repository layer — no DB logic lives here.

import { ingestText } from "../services/ingestionService.js";
import { deleteDocument as deleteDocumentFromDb } from "../repositories/documentRepository.js";

// POST /api/documents/ingest
// Accepts { text, filename } in the request body and stores the document.
export async function ingestDocument(req, res) {
  try {
    const { text, filename } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text is required" });
    }

    const savedDocument = await ingestText(text, {
      filename: typeof filename === "string" ? filename : undefined,
    });

    res.status(201).json({
      message: "Document ingested successfully",
      document_id: savedDocument.document_id,
      filename: savedDocument.filename,
      totalChunks: savedDocument.totalChunks,
    });
  } catch (error) {
    console.error("Document ingestion failed:", error);
    res.status(500).json({ error: "Failed to ingest document" });
  }
}

// DELETE /api/documents/:id
// Deletes the document and all of its chunks from the database.
export async function deleteDocument(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Document ID is required" });
    }

    const deletedDocument = await deleteDocumentFromDb(id);

    if (!deletedDocument) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.status(200).json({
      message: "Document deleted successfully",
      document_id: deletedDocument.id,
      filename: deletedDocument.filename,
    });
  } catch (error) {
    console.error("Document deletion failed:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
}
