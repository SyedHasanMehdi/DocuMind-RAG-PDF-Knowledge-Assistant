import fs from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import pool from "../config/db.js";
import { chunkText } from "../utils/chunkText.js";
import { embedBatch } from "./embeddingService.js";
import {
  createDocument,
  getDocumentByFilename,
  deleteDocument,
  getDocumentChunksCount,
} from "../repositories/documentRepository.js";

// Extract plain text from a PDF file on disk
async function extractPdfText(filePath) {
  const buffer = await fs.readFile(filePath);
  if (!buffer.subarray(0, 5).toString("utf8").startsWith("%PDF")) {
    throw new Error(`Not a valid PDF: ${path.basename(filePath)}`);
  }
  const parser = new PDFParse({ data: buffer });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}

// Return the names of all PDF files in a folder
async function listPdfFilenames(folderPath) {
  const items = await fs.readdir(folderPath, { withFileTypes: true });
  return items
    .filter(item => item.isFile() && item.name.toLowerCase().endsWith(".pdf"))
    .map(item => item.name);
}

// Async generator that yields { filename, text } for each PDF in the folder.
// This keeps memory low by loading and parsing only one PDF at a time.
async function* lazyLoadPdfs(folderPath) {
  const filenames = await listPdfFilenames(folderPath);
  for (const filename of filenames) {
    try {
      const text = await extractPdfText(path.join(folderPath, filename));
      yield { filename, text };
    } catch (err) {
      console.error(`? Could not read "${filename}":`, err.message);
    }
  }
}

// Split text into chunks, generate embeddings, and save to database
async function ingest(text, filename) {
  const chunks = await chunkText(text);
  if (!chunks.length) throw new Error("No chunks produced");

  const vectors = await embedBatch(chunks);
  const doc = await createDocument({ filename });

  console.log(`?? ${chunks.length} chunks ? "${filename ?? "untitled"}" (${doc.id})`);

  for (let i = 0; i < chunks.length; i++) {
    await pool.query(
      `INSERT INTO document_chunks (content, embedding, metadata)
       VALUES ($1, $2::vector, $3)`,
      [
        chunks[i],
        JSON.stringify(vectors[i]),
        JSON.stringify({ document_id: doc.id, filename: doc.filename, chunk_index: i }),
      ]
    );
  }

  return { document_id: doc.id, filename: doc.filename, totalChunks: chunks.length };
}

export async function ingestText(text, { filename } = {}) {
  return ingest(text, filename);
}

// Scan the docs/ folder on startup and ingest any new PDFs using lazy loading
export async function syncDocsFolder(folderPath = "docs") {
  await fs.mkdir(folderPath, { recursive: true });

  const ingested = [];

  for await (const { filename, text } of lazyLoadPdfs(folderPath)) {
    const existing = await getDocumentByFilename(filename);
    if (existing) {
      const count = await getDocumentChunksCount(existing.id);
      if (count > 0) {
        console.log(`?? "${filename}" already ingested. Skipping.`);
        continue;
      }
      await deleteDocument(existing.id);
    }

    if (!text.trim()) {
      console.warn(`?? "${filename}" has no extractable text. Skipping.`);
      continue;
    }

    try {
      const result = await ingest(text, filename);
      ingested.push(result);
      console.log(`? Ingested "${filename}" (${result.totalChunks} chunks)`);
    } catch (err) {
      console.error(`? Failed to ingest "${filename}":`, err.message);
    }
  }

  if (!ingested.length) console.log(`?? No new PDFs in "${folderPath}/".`);
  return ingested;
}
