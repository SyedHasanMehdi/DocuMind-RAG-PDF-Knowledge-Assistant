import express from "express";
import { ingestDocument } from "../controllers/documentController.js";

const router = express.Router();

router.post("/ingest", ingestDocument);

export default router;