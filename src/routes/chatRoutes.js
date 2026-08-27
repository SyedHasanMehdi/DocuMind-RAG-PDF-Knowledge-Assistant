// chatRoutes.js
// Defines the two chat endpoints:
//   POST /api/chat          — send a question and get an AI-generated answer
//   POST /api/chat/retrieve — get the raw matching text chunks without the AI step

import express from "express";
import { chat, retrieve } from "../controllers/chatController.js";

const router = express.Router();

router.post("/retrieve", retrieve);
router.post("/", chat);

export default router;
