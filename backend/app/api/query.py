import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.db.models import Chunk
from app.db.session import get_db
from app.schemas.query import Citation, QueryRequest, QueryResponse
from app.services.generation import generate_answer
from app.services.retrieval import retrieve_chunks


router = APIRouter(tags=["query"])


@router.post("/query", response_model=QueryResponse)
async def query_knowledge_base(request: QueryRequest, session: AsyncSession = Depends(get_db)):
    try:
        if request.question.strip().lower() in {"hi", "hello", "hey", "yo", "ji", "salut", "salam"}:
            return QueryResponse(answer="Hello. Ask me something about your indexed documents.", citations=[])
        chunks = await retrieve_chunks(session, request.question)
        if not chunks:
            return QueryResponse(answer="The information was not found in the provided knowledge.", citations=[])
        chunks = list((await session.execute(select(Chunk).where(Chunk.id.in_([chunk.id for chunk in chunks])).options(selectinload(Chunk.document)))).scalars().all())
        context = "\n\n".join(f"[{chunk.document.filename} / chunk {chunk.chunk_index}] {chunk.content}" for chunk in chunks)
        try:
            answer = await asyncio.wait_for(generate_answer(request.question, context), timeout=60)
        except asyncio.TimeoutError:
            # Return a grounded extractive passage instead of leaving the workspace waiting.
            answer = f"Relevant passage from the document: {chunks[0].content[:600]}"
        unique_chunks = {(chunk.document.filename, chunk.chunk_index): chunk for chunk in chunks}
        return QueryResponse(
            answer=answer,
            citations=[Citation(filename=filename, chunk_index=chunk_index) for filename, chunk_index in unique_chunks],
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="The local RAG services are unavailable.") from exc
