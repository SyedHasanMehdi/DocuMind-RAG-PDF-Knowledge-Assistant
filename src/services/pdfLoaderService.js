// pdfLoaderService.js
// Reads PDF files from disk and extracts their plain text content.
// Also provides helpers for listing PDF files and creating the docs/ folder.

import fs from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

// Extract all text from a single PDF file.
// Returns { text, totalPages } or throws if the file is not a valid PDF.
export async function extractTextFromPdfFile(filePath) {
  const fileContents = await fs.readFile(filePath);

  // Quick sanity check — every valid PDF starts with the magic bytes "%PDF"
  const fileHeader = fileContents.subarray(0, 5).toString("utf8");
  if (!fileHeader.startsWith("%PDF")) {
    throw new Error("File is not a valid PDF");
  }

  const parser = new PDFParse({ data: fileContents });

  try {
    const parsed = await parser.getText();
    return {
      text: parsed.text,
      totalPages: parsed.pages?.length ?? 0,
    };
  } finally {
    await parser.destroy();
  }
}

// Return a list of PDF filenames found in the given folder (names only, not full paths)
export async function listPdfFilenames(folderPath) {
  const items = await fs.readdir(folderPath, { withFileTypes: true });

  return items
    .filter((item) => item.isFile() && item.name.toLowerCase().endsWith(".pdf"))
    .map((item) => item.name);
}

// Create the folder if it does not already exist (safe to call even if it exists)
export async function ensureDir(folderPath) {
  await fs.mkdir(folderPath, { recursive: true });
}

// Build the full path to a PDF file inside a folder
export function getPdfFilePath(folderPath, filename) {
  return path.join(folderPath, filename);
}

// Async generator that yields { filename, text, totalPages } for each PDF in the folder.
// Uses a generator so only one PDF is loaded into memory at a time.
export async function* lazyLoadPdfs(folderPath) {
  const filenames = await listPdfFilenames(folderPath);
  for (const filename of filenames) {
    const filePath = getPdfFilePath(folderPath, filename);
    const extracted = await extractTextFromPdfFile(filePath);
    yield {
      filename,
      text: extracted.text,
      totalPages: extracted.totalPages,
    };
  }
}
