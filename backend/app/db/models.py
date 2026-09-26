# Import UUID utilities for generating unique identifiers.
import uuid

# Import pgvector's SQLAlchemy type for storing embeddings.
from pgvector.sqlalchemy import Vector

# Import SQLAlchemy database types and relationship tools.
from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Import the shared database model base.
from app.db.base import Base


# Represents one source document ingested into the RAG system.
class Document(Base):
    __tablename__ = "documents"

    # Unique identifier for the document.
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Original name of the uploaded document.
    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # Type of source such as PDF, TXT, Markdown, or web content.
    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    # Optional original source location or URL.
    source: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Timestamp automatically created by PostgreSQL.
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Access all chunks that belong to this document.
    chunks: Mapped[list["Chunk"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
    )


# Represents one searchable piece of an ingested document.
class Chunk(Base):
    __tablename__ = "chunks"

    # Unique identifier for the chunk.
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Reference to the original document.
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Position of this chunk inside the original document.
    chunk_index: Mapped[int] = mapped_column(
        nullable=False,
    )

    # Text content used during retrieval and generation.
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Semantic vector representation of the chunk.
    # 1536 dimensions will match our planned embedding model.
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(1536),
        nullable=True,
    )

    # Access the original document from this chunk.
    document: Mapped["Document"] = relationship(
        back_populates="chunks",
    )