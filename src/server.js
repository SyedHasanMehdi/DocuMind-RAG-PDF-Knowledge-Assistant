import "dotenv/config";
import express from "express";
import documentRoutes from "./routes/documentRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

import { setupDatabase } from "./config/setupDb.js";

const app = express();

app.use(express.json());

app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await setupDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed");
    process.exit(1);
  }
}

startServer();