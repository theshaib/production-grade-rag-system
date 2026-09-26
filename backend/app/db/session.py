# Import SQLAlchemy tools for asynchronous PostgreSQL connections.
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# Import the centralized application configuration.
from app.core.config import settings


# Create the asynchronous SQLAlchemy engine.
# This engine manages the connection pool between FastAPI and PostgreSQL.
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
)


# Create a reusable factory for asynchronous database sessions.
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# Provide a database session to FastAPI endpoints when needed.
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session