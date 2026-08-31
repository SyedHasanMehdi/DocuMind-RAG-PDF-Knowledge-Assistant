// server.js
// Entry point of the application.
// Sets up the Express server, registers API routes, initialises the database,
// and auto-ingests any PDF files found in the docs/ folder on startup.

import "dotenv/config";
import express from "express";
import chatRoutes from "./routes/chatRoutes.js";
import { setupDatabase } from "./config/setupDb.js";
import { syncDocsFolder } from "./services/ingestionService.js";

const app = express();

// Parse incoming JSON request bodies
app.use(express.json());

// Register route groups
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Create/migrate database tables
    await setupDatabase();

    // Ingest any new PDFs sitting in the docs/ folder
    try {
      await syncDocsFolder("docs");
    } catch (error) {
      console.error("PDF folder sync failed. Server will still start:", error.message);
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
