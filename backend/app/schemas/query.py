from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


class Citation(BaseModel):
    filename: str
    chunk_index: int


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
