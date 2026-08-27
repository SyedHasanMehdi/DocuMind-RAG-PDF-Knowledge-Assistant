// embeddingService.js
// Converts text into numerical vectors (embeddings) using the Gemini API.
// Embeddings are stored in the database and used to find semantically similar chunks
// when a user asks a question.

import { Embeddings } from "@langchain/core/embeddings";
import { GoogleGenAI } from "@google/genai";

// The embedding model always outputs vectors of this fixed length
const EMBEDDING_VECTOR_SIZE = 1536;

// How many text chunks to embed in a single API call (Gemini supports up to 100)
const EMBED_BATCH_SIZE = 50;

// Create a Gemini API client using the key from environment variables
function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  return new GoogleGenAI({ apiKey });
}

// Pause execution for a given number of milliseconds
// Used to respect API rate limits between batches
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Call the Gemini embedding API with automatic retry logic.
// Retries on temporary errors (rate limits, server errors) but not permanent ones (auth, bad input).
async function embedWithRetry(geminiClient, modelName, batch, outputSize, retries = 5, backoffMs = 10000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await geminiClient.models.embedContent({
        model: modelName,
        contents: batch,
        config: { outputDimensionality: outputSize },
      });
      return response;
    } catch (error) {
      // These status codes mean the request itself is wrong — no point retrying
      const isPermanentError =
        error.status === 400 ||
        error.status === 401 ||
        error.status === 403 ||
        error.status === 404 ||
        error.message?.includes("400") ||
        error.message?.includes("401") ||
        error.message?.includes("403") ||
        error.message?.includes("404");

      if (!isPermanentError && attempt < retries) {
        // Honour the "retry in Xs" hint from the API if present, otherwise use exponential backoff
        let waitTime = backoffMs * attempt;
        if (error.message) {
          const match = error.message.match(/retry in (\d+\.?\d*)s/i);
          if (match && match[1]) {
            waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1000;
          }
        }
        console.warn(`⚠️ Temporary error (${error.message}). Retrying in ${Math.round(waitTime / 1000)}s (attempt ${attempt}/${retries})...`);
        await sleep(waitTime);
      } else {
        throw error;
      }
    }
  }
}

// GeminiEmbeddings wraps the Gemini API into the LangChain Embeddings interface
// so it can be used transparently with any LangChain component (e.g. PGVectorStore).
export class GeminiEmbeddings extends Embeddings {
  constructor() {
    super({});
    this.geminiClient = createGeminiClient();
    this.modelName = process.env.EMBEDDING_MODEL;
    this.vectorSize = EMBEDDING_VECTOR_SIZE;

    if (!this.modelName) {
      throw new Error("EMBEDDING_MODEL is required");
    }
  }

  // Embed a single query string (used at search time)
  async embedQuery(text) {
    const response = await this.geminiClient.models.embedContent({
      model: this.modelName,
      contents: text,
      config: { outputDimensionality: this.vectorSize },
    });

    const vector = response.embeddings?.[0]?.values;

    if (!vector?.length) {
      throw new Error("Embedding API returned an empty vector");
    }

    if (vector.length !== this.vectorSize) {
      throw new Error(
        `Embedding size mismatch: expected ${this.vectorSize}, got ${vector.length}`
      );
    }

    return vector;
  }

  // Embed multiple text chunks in batches (used at ingestion time)
  async embedDocuments(chunks) {
    const allVectors = [];

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);

      const response = await embedWithRetry(
        this.geminiClient,
        this.modelName,
        batch,
        this.vectorSize
      );

      const embeddings = response.embeddings;
      if (!embeddings?.length) {
        throw new Error("Embedding API returned an empty list of embeddings");
      }

      for (const embedding of embeddings) {
        if (!embedding.values?.length) {
          throw new Error("Embedding API returned an empty vector in batch");
        }
        allVectors.push(embedding.values);
      }

      // Wait 2 seconds between batches to stay within the API rate limit
      if (i + EMBED_BATCH_SIZE < chunks.length) {
        await sleep(2000);
      }
    }

    return allVectors;
  }
}

// Module-level singleton — only one instance is created and reused across requests
let embeddingsInstance;

export function getEmbeddings() {
  if (!embeddingsInstance) {
    embeddingsInstance = new GeminiEmbeddings();
  }
  return embeddingsInstance;
}
