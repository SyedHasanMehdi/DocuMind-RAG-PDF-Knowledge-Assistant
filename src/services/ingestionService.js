// ingestionService.js
// Handles the full pipeline for turning text or PDF files into searchable chunks.
// Steps: split text → create document record → embed chunks → save to vector store.
// Also manages syncing the docs/ folder on startup.

import { Document } from "@langchain/core/documents";
import { chunkText } from "../utils/chunkText.js";
import { getVectorStore } from "./vectorStore.js";
import {
  createDocument,
  getDocumentByFilename,
  getAllDocuments,
  deleteDocument,
  getDocumentChunksCount,
} from "../repositories/documentRepository.js";
import { lazyLoadPdfs, ensureDir, listPdfFilenames } from "./pdfLoaderService.js";

// Internal helper: split text into chunks, store a document record, and save the embeddings.
// Used by both ingestText() and syncDocsFolder().
async function ingestChunks(text, { filename } = {}) {
  const chunks = await chunkText(text);

  if (chunks.length === 0) {
    throw new Error("No text chunks were produced from the document");
  }

  // Create the parent document record in the database
  const document = await createDocument({ filename });

  console.log(`📄 Created ${chunks.length} chunks for "${filename ?? "untitled"}" (${document.id})`);

  // Wrap each chunk in a LangChain Document so PGVectorStore can embed and store it
  const langchainDocs = chunks.map(
    (chunk, index) =>
      new Document({
        pageContent: chunk,
        metadata: {
          document_id: document.id,
          filename: document.filename,
          chunk_index: index,
        },
      })
  );

  try {
    const vectorStore = await getVectorStore();
    await vectorStore.addDocuments(langchainDocs);
  } catch (error) {
    // If embedding fails, remove the orphaned document record so the DB stays clean
    console.error(`Failed to save chunks for "${filename ?? "untitled"}". Cleaning up document record.`);
    await deleteDocument(document.id);
    throw error;
  }

  return {
    document_id: document.id,
    filename: document.filename,
    totalChunks: chunks.length,
  };
}

// Ingest raw text directly via the API (POST /api/documents/ingest)
export async function ingestText(text, { filename } = {}) {
  return ingestChunks(text, { filename });
}

// Scan the docs/ folder and ingest any PDFs that have not been processed yet.
// Called automatically on server startup.
// Uses an async generator so only one PDF is held in memory at a time.
export async function syncDocsFolder(folderPath = "docs") {
  // Create the folder if it does not exist yet
  await ensureDir(folderPath);

  // Remove database records for PDFs that have been deleted from disk
  try {
    const diskFilenames = await listPdfFilenames(folderPath);
    const storedDocuments = await getAllDocuments();

    for (const doc of storedDocuments) {
      if (doc.filename && doc.filename.toLowerCase().endsWith(".pdf")) {
        if (!diskFilenames.includes(doc.filename)) {
          console.log(`Pruning deleted PDF from database: "${doc.filename}" (ID: ${doc.id})`);
          await deleteDocument(doc.id);
        }
      }
    }
  } catch (error) {
    console.error("Failed to prune deleted PDFs from database:", error.message);
  }

  const ingested = [];

  for await (const pdf of lazyLoadPdfs(folderPath)) {
    // Skip PDFs that are already stored (unless their chunks are missing)
    const existing = await getDocumentByFilename(pdf.filename);
    if (existing) {
      const chunkCount = await getDocumentChunksCount(existing.id);
      if (chunkCount > 0) {
        console.log(`ℹ️ "${pdf.filename}" already ingested (${chunkCount} chunks). Skipping.`);
        continue;
      } else {
        console.log(`⚠️ "${pdf.filename}" has 0 chunks in database. Re-ingesting...`);
        await deleteDocument(existing.id);
      }
    }

    // Skip PDFs that contain no extractable text (e.g. scanned images)
    if (!pdf.text.trim()) {
      console.warn(`⚠️ "${pdf.filename}" has no extractable text. Skipping.`);
      continue;
    }

    try {
      const result = await ingestChunks(pdf.text, { filename: pdf.filename });
      ingested.push(result);
      console.log(`✅ Ingested "${pdf.filename}" (${result.totalChunks} chunks)`);
    } catch (err) {
      console.error(`❌ Failed to ingest "${pdf.filename}":`, err.message);
    }
  }

  if (ingested.length === 0) {
    console.log(`📂 No new PDFs to ingest in "${folderPath}/".`);
  }

  return ingested;
}
