# Import FastAPI, the framework used to build our backend API.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# SQLAlchemy text() allows us to execute a simple SQL statement.
from sqlalchemy import text

# Import centralized application configuration.
from app.core.config import settings

# Import the database engine.
from app.db.session import engine


# Create the main FastAPI application.
app = FastAPI(
    title=settings.app_name,
    description="Knowledge retrieval and grounded generation infrastructure.",
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


# Basic health check for the FastAPI service.
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "rag-backend",
        "environment": settings.environment,
    }


# Database health check.
# This endpoint executes a real query against PostgreSQL.
@app.get("/health/database")
async def database_health_check():
    # Open a connection from the SQLAlchemy connection pool.
    async with engine.connect() as connection:
        # Execute a minimal query to verify PostgreSQL is reachable.
        result = await connection.execute(text("SELECT 1"))

        # Read the value returned by PostgreSQL.
        database_response = result.scalar()

    return {
        "status": "ok",
        "database": "postgresql",
        "connected": database_response == 1,
    }
