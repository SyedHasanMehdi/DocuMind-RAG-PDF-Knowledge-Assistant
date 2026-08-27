# Documents Folder

Drop your `.pdf` files into this directory (`docs/`).

When the server starts (or restarts), it will automatically:
1. Detect any `.pdf` files in this folder.
2. Check if they have already been ingested (to avoid re-processing).
3. Load, parse, split, and generate vector embeddings for all chunks.
4. Store the vectors in PostgreSQL with `pgvector`.

Once ingested, you can query your documents directly via:
```bash
POST /api/chat
Content-Type: application/json

{
  "query": "What is discussed in the document?"
}
```
*(No `document_id` needed!)*
