from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Chunk, Document
from app.services.embeddings import embed_texts


async def retrieve_chunks(session: AsyncSession, question: str, limit: int = 3) -> list[Chunk]:
    [query_vector] = await embed_texts([question])
    distance = Chunk.embedding.cosine_distance(query_vector)
    result = await session.execute(
        select(Chunk)
        .join(Document)
        .where(Chunk.embedding.is_not(None), distance < 0.65)
        .order_by(distance)
        .limit(limit)
    )
    return list(result.scalars().all())
