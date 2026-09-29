# Production RAG System

A small end-to-end Retrieval-Augmented Generation workspace.

## Architecture

```text
PDF upload → text extraction → chunks → local embeddings
                                      ↓
                              PostgreSQL + pgvector
                                      ↓
Question → retrieval → grounded answer → citations
```

## Project structure

- `frontend/` — Next.js workspace for uploads, questions, answers, and citations.
- `backend/app/api/` — FastAPI routes for health, documents, and queries.
- `backend/app/ingestion/` — PDF loading and deterministic chunking.
- `backend/app/services/embeddings.py` — Ollama `nomic-embed-text` embeddings.
- `backend/app/services/retrieval.py` — pgvector similarity search.
- `backend/app/services/generation.py` — Groq when configured, otherwise local Ollama `qwen3:8b`.
- `backend/app/db/` — SQLAlchemy models and async database session.
- `backend/alembic/` — database migrations.

## Core concepts

- **Chunk:** a small searchable part of a document.
- **Embedding:** a numeric vector representing text meaning.
- **Retrieval:** finding chunks similar to the question.
- **Generation:** answering from retrieved context only.
- **Citation:** the source filename and chunk index.

## Run locally

```powershell
docker compose up -d
ollama serve
ollama pull nomic-embed-text
ollama pull qwen3:8b
```

Backend:

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Frontend, in another terminal:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:3000`.

## Optional hosted generation

Embeddings remain local. To use a hosted OpenAI-compatible provider such as Groq, keep the key only in `backend/.env`:

```env
AI_API_KEY=your-valid-key
AI_MODEL=llama-3.1-8b-instant
```

If the provider is unavailable, the backend falls back to local Ollama generation.
