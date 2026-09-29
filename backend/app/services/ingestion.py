import tempfile
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Chunk, Document
from app.ingestion.chunking import split_text
from app.ingestion.loaders import load_pdf
from app.services.embeddings import embed_texts


async def ingest_pdf(file: UploadFile, session: AsyncSession) -> Document:
    contents = await file.read()
    temporary_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temporary:
            temporary.write(contents)
            temporary_path = temporary.name
        text = load_pdf(temporary_path)
    finally:
        if temporary_path:
            Path(temporary_path).unlink(missing_ok=True)

    chunks = split_text(text)
    if not chunks:
        raise ValueError("The PDF does not contain useful extractable text.")

    vectors = await embed_texts(chunks)
    document = Document(filename=file.filename or "document.pdf", source_type="pdf")
    document.chunks = [
        Chunk(chunk_index=index, content=content, embedding=vector)
        for index, (content, vector) in enumerate(zip(chunks, vectors, strict=True))
    ]
    session.add(document)
    await session.commit()
    return document
