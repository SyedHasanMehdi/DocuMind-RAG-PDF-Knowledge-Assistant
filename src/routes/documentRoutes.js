// documentRoutes.js
// Defines the document management endpoints:
//   POST   /api/documents/ingest — ingest raw text as a new document
//   DELETE /api/documents/:id    — delete a document and all its chunks

import express from "express";
import { ingestDocument, deleteDocument } from "../controllers/documentController.js";

const router = express.Router();

router.post("/ingest", ingestDocument);
router.delete("/:id", deleteDocument);

export default router;
