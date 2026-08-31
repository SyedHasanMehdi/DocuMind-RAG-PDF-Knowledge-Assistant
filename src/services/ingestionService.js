import fs from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import pool from "../config/db.js";
import { chunkText } from "../utils/chunkText.js";
import { embedBatch } from "./embeddingService.js";
import {
    createDocument,
    getDocumentByFilename,
    getDocumentChunksCount,
} from "../repositories/documentRepository.js";

async function extractTextFromPdf(filePath) {
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

async function getPdfFiles(folderPath) {
    const items = await fs.readdir(folderPath, { withFileTypes: true });
    return items
        .filter((item) => item.isFile() && item.name.toLowerCase().endsWith(".pdf"))
        .map((item) => item.name);
}

async function ingestDocument(text, filename) {
    const chunks = await chunkText(text);
    if (!chunks.length) throw new Error("No chunks produced");

    const vectors = await embedBatch(chunks);
    const doc = await createDocument({ filename });

    for (let i = 0; i < chunks.length; i++) {
        await pool.query(
            `INSERT INTO document_chunks (content, embedding, metadata)
       VALUES ($1, $2::vector, $3)`,
            [
                chunks[i],
                JSON.stringify(vectors[i]),
                JSON.stringify({
                    document_id: doc.id,
                    filename: doc.filename,
                    chunk_index: i,
                }),
            ]
        );
    }

    console.log(`✅ Ingested "${filename}" → ${chunks.length} chunks (${doc.id})`);
    return { document_id: doc.id, filename: doc.filename, totalChunks: chunks.length };
}

export async function syncDocsFolder(folderPath = "docs") {
    await fs.mkdir(folderPath, { recursive: true });

    const pdfFiles = await getPdfFiles(folderPath);

    if (!pdfFiles.length) {
        console.log(`📭 No PDFs found in "${folderPath}/".`);
        return [];
    }

    const ingested = [];

    for (const filename of pdfFiles) {
        const existing = await getDocumentByFilename(filename);
        if (existing) {
            const count = await getDocumentChunksCount(existing.id);
            if (count > 0) {
                console.log(`⏭️  "${filename}" already ingested. Skipping.`);
                continue;
            }
        }

        try {
            const text = await extractTextFromPdf(path.join(folderPath, filename));

            if (!text.trim()) {
                console.warn(`⚠️  "${filename}" has no extractable text. Skipping.`);
                continue;
            }

            const result = await ingestDocument(text, filename);
            ingested.push(result);
        } catch (err) {
            console.error(`❌ Failed to ingest "${filename}":`, err.message);
        }
    }

    if (!ingested.length) console.log(`📭 No new PDFs to ingest.`);
    return ingested;
}
