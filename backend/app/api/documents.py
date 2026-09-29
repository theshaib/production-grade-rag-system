from pathlib import PurePath

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Document
from app.db.session import get_db
from app.services.ingestion import ingest_pdf


router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("")
async def list_documents(session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(Document, func.count(Document.chunks))
        .outerjoin(Document.chunks)
        .group_by(Document.id)
        .order_by(Document.created_at.desc())
    )
    documents = result.all()
    seen_filenames: set[str] = set()
    summaries = []
    for document, chunk_count in documents:
        if document.filename in seen_filenames:
            continue
        seen_filenames.add(document.filename)
        summaries.append({"id": str(document.id), "filename": document.filename, "status": "indexed", "chunks": chunk_count})
    return summaries


@router.post("/upload", status_code=status.HTTP_200_OK)
async def upload_document(file: UploadFile = File(...), session: AsyncSession = Depends(get_db)):
    # Validate both the MIME type and extension before accepting the upload.
    if file.content_type != "application/pdf" or PurePath(file.filename or "").suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    try:
        document = await ingest_pdf(file, session)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Document ingestion is unavailable.") from exc
    return {"id": str(document.id), "filename": document.filename, "status": "indexed", "chunks": len(document.chunks)}
