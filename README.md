# **AI-Powered RAG Document Chatbot**
A backend application that allows users to store documents, convert their content into vector embeddings, store those embeddings in PostgreSQL using pgvector, retrieve semantically relevant content, and generate answers using Google's Gemini models.

The project is being built step-by-step to understand how a Retrieval-Augmented Generation (RAG) system works.

Express, routes, and controllers stay ours. The RAG pieces (chunking, embeddings, pgvector store, retrieval, prompt, LLM) now use LangChain so we do not maintain that pipeline by hand.

## **📌 What is RAG?**
RAG = Retrieval-Augmented Generation.

A normal LLM answers questions from the information it learned during training.

A RAG application instead gives the LLM relevant information from your own documents at question time.

For example, suppose we store a resume:

Syed Hasan Mehdi
Software Development Engineer
Skills: React, Next.js, Node.js, Express.js...
Experience: Cywift, MountBlue...

A user asks:

What work did Syed do at MountBlue?

The application doesn't simply ask the LLM to answer.

It performs:

User Question
      ↓
Convert question into embedding
      ↓
Search database for similar vectors
      ↓
Retrieve relevant document chunks
      ↓
Give those chunks to Gemini
      ↓
Generate answer

This allows the application to answer questions based on the documents stored in our database.

## **🚀 Current Project Status**
The following parts are currently working:

 Node.js backend
 Express server
 PostgreSQL database
 pgvector extension
 Database initialization
 Document ingestion API
 Text chunking
 Gemini embeddings
 1536-dimensional vectors
 Vector storage in PostgreSQL
 Semantic similarity search
 Gemini LLM response generation
 LangChain RAG pipeline
 Chat API (requires document_id)
 Retrieval-only API for debugging
 Multiple documents via document_id metadata
 Document metadata
 PDF/file upload
 Production-ready validation
 Authentication
 Chat history
 Frontend
 Deployment
## **🏗️ Architecture**
Currently the application has two major pipelines.

### **1. Document Ingestion Pipeline**
When a document is uploaded:

Document/Text
     ↓
Document API
     ↓
Controller
     ↓
Ingestion Service
     ↓
LangChain RecursiveCharacterTextSplitter
     ↓
LangChain Gemini embeddings (1536 dims)
     ↓
LangChain PGVectorStore
     ↓
PostgreSQL + pgvector
(metadata.document_id stored with each chunk)
### **2. Question Answering Pipeline**
When the user asks a question:

User Question + document_id
     ↓
Chat API
     ↓
Chat Controller
     ↓
RAG Service
     ↓
LangChain retriever
(filter: metadata.document_id)
     ↓
Relevant chunks from THAT document only
     ↓
ChatPromptTemplate
     ↓
ChatGoogleGenerativeAI
     ↓
Final Answer + sources
## **📂 Current Project Structure**
rag-chatbot/
│
├── src/
│   │
│   ├── config/
│   │   ├── db.js
│   │   └── setupDb.js
│   │
│   ├── controllers/
│   │   ├── documentController.js
│   │   └── chatController.js
│   │
│   ├── repositories/
│   │   └── documentRepository.js
│   │
│   ├── routes/
│   │   ├── documentRoutes.js
│   │   └── chatRoutes.js
│   │
│   ├── services/
│   │   ├── embeddingService.js
│   │   ├── vectorStore.js
│   │   ├── pdfLoaderService.js
│   │   ├── ingestionService.js
│   │   ├── retrievalService.js
│   │   ├── llmService.js
│   │   └── ragService.js
│   │
│   ├── utils/
│   │   └── chunkText.js          # RecursiveCharacterTextSplitter
│   │
│   └── server.js
│
├── .env
├── .env.example
├── package.json
├── package-lock.json
└── README.md
## **🧩 Understanding Every Folder**
### **src/server.js**
This is the entry point of the application.

It:

Loads environment variables.
Creates the Express application.
Enables JSON request parsing.
Registers routes.
Initializes the database.
Starts the server.

Example:

app.use(express.json());

app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);

This means:

/api/documents → document routes
/api/chat      → chat routes
## **⚙️ src/config/**
This folder contains configuration and database-related code.

### **db.js**
Responsible for creating the PostgreSQL connection pool.

Conceptually:

Application
     ↓
db.js
     ↓
PostgreSQL

Instead of opening a completely new database connection for every request, PostgreSQL connections are managed through a connection pool.

### **setupDb.js**
Responsible for preparing the database when the application starts.

It creates the required database structures/extensions if they don't already exist.

The project uses:

PostgreSQL
+
pgvector

pgvector allows PostgreSQL to store and search numerical vectors.

## **🛣️ src/routes/**
Routes define which URL calls which controller.

### **documentRoutes.js**
Handles document ingestion.

Currently:

POST /api/documents/ingest
### **chatRoutes.js**
Handles user questions.

Currently:

POST /api/chat
POST /api/chat/retrieve

Chat needs both the question and document_id so search cannot mix files:

{
  "query": "What work did Syed do at MountBlue?",
  "document_id": "uuid-from-ingest"
}

/retrieve returns chunks + distances only. Use it when the answer looks wrong and you want to see whether retrieval picked the right text.
## **🎮 src/controllers/**
Controllers handle HTTP requests and responses.

They sit between:

Route
 ↓
Controller
 ↓
Service
### **documentController.js**
Receives document text from the client.

For example:

{
  "text": "Syed Hasan Mehdi...",
  "filename": "resume.txt"
}

The controller validates the request and passes the text to the ingestion service.
The response includes document_id. Save it — chat will not work without it.

It does not perform chunking or embedding itself.

That's important because controllers should remain focused on HTTP concerns.

### **chatController.js**
Receives the user's question:

{
  "query": "What work did Syed do at MountBlue?",
  "document_id": "uuid-from-ingest"
}

It passes the question and document_id to ragService.js and returns the generated answer plus sources.

## **🧠 src/services/**
This is where most of the application's business logic lives.

### **embeddingService.js**
Responsible for converting text into a numerical vector using Gemini.

For example:

"What work did Syed do at MountBlue?"

becomes something conceptually like:

[
  -0.01397,
  -0.00969,
  -0.00249,
  ...
]

The project uses:

gemini-embedding-001

and generates:

1536 dimensions

The same embedding process is used for:

Documents
Document chunk
     ↓
Gemini
     ↓
Vector
Questions
User question
     ↓
Gemini
     ↓
Query vector

This is important because both the stored documents and the query must exist in the same vector space for similarity search to work.

### **✂️ utils/chunkText.js**
This handles document chunking.

Large documents should not simply be sent to the embedding model as one giant piece.

Instead:

Large Document
      ↓
Chunk 1
Chunk 2
Chunk 3
Chunk 4

Our configuration currently uses:

CHUNK_SIZE=100
CHUNK_OVERLAP=20

for testing multiple chunks.

Chunk size

Defines approximately how many words are placed into each chunk.

Chunk overlap

Allows neighboring chunks to share some words.

For example:

Chunk 1:
A B C D E F G H I J

Chunk 2:
I J K L M N O P Q R

Here:

I J

are shared between chunks.

The overlap helps prevent important information from being lost at chunk boundaries.

### **📥 ingestionService.js**
This service connects chunking and embeddings.

Its job is essentially:

Raw document
     ↓
chunkText()
     ↓
Multiple chunks
     ↓
getVectorStore().addDocuments()
     ↓
Embeddings + PostgreSQL

For every chunk:

Chunk
 ↓
Embedding
 ↓
Store both
### **🔎 retrievalService.js**
This is responsible for semantic search.

When the user asks:

"What work did Syed do at MountBlue?"

the service:

Converts the question into an embedding.
Sends that vector to PostgreSQL.
Uses pgvector to compare it against stored vectors.
Retrieves the most similar chunks.

The result contains:

id
content
distance
### **🤖 llmService.js**
This service communicates with Gemini's generative model.

The retrieved chunks become the context.

Conceptually:

Context:
Syed worked at MountBlue...
Built reusable UI components...
Used React Query...

Question:
What work did Syed do at MountBlue?

Gemini then generates the final answer.

The important concept is:

The LLM is not directly searching the database. Our application retrieves the information first and then gives the relevant information to the LLM.

### **🔗 ragService.js**
This is the service that combines everything.

It connects:

Retrieval
+
LLM

The flow is:

Question
   ↓
retrieveRelevantChunks()
   ↓
Relevant chunks
   ↓
Build context
   ↓
generateAnswer()
   ↓
Final answer

This service represents the core RAG pipeline.

## **🗄️ repositories/documentRepository.js**
The repository handles database operations.

It is responsible for things such as:

Insert
chunk
+
embedding
     ↓
PostgreSQL
Search
query embedding
     ↓
pgvector
     ↓
similar chunks

Keeping database operations in the repository prevents SQL from being scattered throughout controllers and services.

## **🐘 Database**
We use:

PostgreSQL

with:

pgvector

The current table is:

document_chunks

Conceptually:

┌────┬───────────────┬─────────────────────┐
│ id │ content       │ embedding           │
├────┼───────────────┼─────────────────────┤
│ 1  │ Resume chunk  │ [1536 values]       │
│ 2  │ Resume chunk  │ [1536 values]       │
│ 3  │ Resume chunk  │ [1536 values]       │
└────┴───────────────┴─────────────────────┘

The important column is:

embedding VECTOR(1536)
## **📐 What is an embedding?**
An embedding represents text as numbers.

For example:

"React developer"

might become:

[0.01, -0.04, 0.08, ...]

The actual vector contains 1536 numbers.

Semantically similar text tends to have vectors that are closer together.

For example:

"Node.js backend development"

and:

"Built REST APIs using Node.js"

should have relatively similar embeddings.

## **🔍 What is pgvector?**
pgvector is a PostgreSQL extension that allows us to work with vector data.

Instead of using a separate vector database, we're using:

PostgreSQL
+
pgvector

This allows us to perform similarity searches directly inside PostgreSQL.

Our retrieval query uses:

embedding <=> query_vector

The <=> operator calculates cosine distance.

Smaller distance means greater similarity.

For example:

Chunk A → 0.15
Chunk B → 0.42
Chunk C → 0.71

Chunk A is more similar to the query than B or C.

## **🧪 Debugging Retrieval**
Use the retrieve-only API instead of old test files.

POST /api/chat/retrieve

{
  "query": "What work did Syed do at MountBlue?",
  "document_id": "PASTE_DOCUMENT_ID"
}

This returns matching chunks and distances without calling the LLM, so you can see if search is wrong or the answer is wrong.

## **🔌 API**
### **Ingest Document**
POST /api/documents/ingest

Request:

{
  "text": "Your document text..."
}

The application:

Text
 ↓
Chunk
 ↓
Embedding
 ↓
Database
### **💬 Chat**
POST /api/chat

Request:

{
  "query": "What work did Syed do at MountBlue?"
}

The application:

Query
 ↓
Embedding
 ↓
Vector search
 ↓
Relevant chunks
 ↓
Gemini
 ↓
Answer

Example response:

{
  "answer": "Syed worked at MountBlue Technologies as a Software Development Engineer...",
  "sources": [
    {
      "id": 4,
      "content": "..."
    }
  ]
}
## **🔐 Environment Variables**
The project uses .env for configuration.

Example:

NODE_ENV=development

PORT=5000

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/rag_chatbot

GEMINI_API_KEY=YOUR_GEMINI_API_KEY

EMBEDDING_MODEL=gemini-embedding-001

LLM_MODEL=gemini-3.6-flash

CHUNK_SIZE=100
CHUNK_OVERLAP=20

MAX_FILE_SIZE_MB=10
### **Important**
Never commit your real API key or database password to GitHub.

Add:

.env

to .gitignore.

Instead commit:

.env.example

with placeholder values.

## **▶️ Running the Project**
Install dependencies:

npm install

Make sure PostgreSQL is running.

Create/configure:

rag_chatbot

Then start the development server:

npm run dev

The API runs on:

http://localhost:5000
## **🧪 Testing the Application**
### **Step 1 — Ingest a document**
POST /api/documents/ingest
{
  "text": "Syed Hasan Mehdi Software Development Engineer..."
}
### **Step 2 — Ask a question**
POST /api/chat
{
  "query": "What work did Syed do at MountBlue?"
}
### **Step 3 — Check PostgreSQL**
SELECT
    id,
    content,
    vector_dims(embedding) AS dimensions
FROM document_chunks;

Expected:

dimensions = 1536
## **🧭 What We Are Going to Build Next**
The current version works, but it is still an early version of the RAG application.

### **Phase 1 — Multiple Documents**
Currently:

All chunks
   ↓
One table

Next we will introduce a documents table:

documents
────────────────
id
filename
created_at

and connect it to:

document_chunks
────────────────
id
document_id
content
embedding

This allows the application to know which chunks belong to which document.

### **📄 Phase 2 — File Upload**
Currently we send text manually through Postman.

Next:

PDF / DOCX / TXT
      ↓
File Upload API
      ↓
Extract text
      ↓
Chunk text
      ↓
Generate embeddings
      ↓
Store in PostgreSQL

This turns the project into a real document-based application.

### **🎯 Phase 3 — Better Retrieval**
We will improve retrieval by adding:

configurable topK
similarity thresholds
metadata filtering
document filtering
better chunking
potentially hybrid search

Instead of blindly returning five chunks, we can return only chunks that are sufficiently relevant.

### **🧠 Phase 4 — Better RAG Prompting**
We'll improve how retrieved context is passed to Gemini.

The prompt will enforce rules such as:

Answer using the provided context.

Do not invent information.

If the answer is not present in the context,
say that the information is unavailable.

This helps reduce hallucinations.

### **💬 Phase 5 — Chat History**
Currently every question is independent.

Later:

User:
What did Syed do at MountBlue?

AI:
He worked on...

User:
When was that?

AI:
He worked there from Nov 2024 to May 2025.

The application will understand the conversation context.

### **👤 Phase 6 — Authentication**
Add:

Register
Login
JWT
Protected APIs

Users will have their own documents.

For example:

User A
 ├── Resume.pdf
 └── Project.pdf

User B
 ├── Resume.pdf
 └── CompanyPolicy.pdf
### **🖥️ Phase 7 — Frontend**
Build a frontend where users can:

Upload documents
       ↓
View documents
       ↓
Open chat
       ↓
Ask questions
       ↓
See answers
       ↓
See sources

Potential frontend stack:

React / Next.js
### **🚀 Phase 8 — Production**
Finally we will prepare the application for production:

Frontend
   ↓
Backend API
   ↓
PostgreSQL + pgvector
   ↓
Gemini API

We will add:

proper validation
centralized error handling
logging
security
rate limiting
database indexes
environment configuration
Docker
deployment
health checks
## **🧠 Complete RAG Architecture**
The final architecture will look like:

                         ┌───────────────┐
                         │    Client     │
                         │ React / Next  │
                         └───────┬───────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
             Upload Document            Ask Question
                    │                         │
                    ▼                         ▼
             Document API                 Chat API
                    │                         │
                    ▼                         ▼
            Document Controller        Chat Controller
                    │                         │
                    ▼                         ▼
           Ingestion Service             RAG Service
                    │                         │
             ┌──────┴──────┐          ┌───────┴────────┐
             ▼             ▼          ▼                ▼
          Chunking      Embedding  Retrieval          LLM
             │             │          │                │
             └──────┬──────┘          │                │
                    ▼                 ▼                │
              PostgreSQL       Gemini Embedding       │
                    │                 │                │
                    │                 ▼                │
                    │            Query Vector          │
                    │                 │                │
                    └─────────► pgvector ◄─────────────┘
                                      │
                                      ▼
                              Relevant Chunks
                                      │
                                      ▼
                                  Gemini LLM
                                      │
                                      ▼
                                 Final Answer
## **🎯 Project Goal**
The ultimate goal is to build a complete production-ready RAG document chatbot where users can upload their own documents and ask questions about them.

The system will:

1. Accept documents
2. Extract their text
3. Split text into chunks
4. Generate embeddings
5. Store chunks + embeddings
6. Convert questions into embeddings
7. Perform semantic vector search
8. Retrieve relevant information
9. Give that information to Gemini
10. Generate a grounded answer
11. Return the answer and sources

The important part of this project is that every major component is implemented explicitly:

Node.js → Express → PostgreSQL → pgvector → Gemini Embeddings → Vector Search → Gemini LLM → RAG API

rather than hiding the entire process behind a high-level RAG library.