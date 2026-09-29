import asyncio
import json
import urllib.request


OLLAMA_EMBED_URL = "http://127.0.0.1:11434/api/embed"
EMBEDDING_MODEL = "nomic-embed-text"
EMBEDDING_DIMENSION = 768


def _embed_sync(texts: list[str]) -> list[list[float]]:
    payload = json.dumps({"model": EMBEDDING_MODEL, "input": texts, "keep_alive": -1}).encode()
    request = urllib.request.Request(
        OLLAMA_EMBED_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        result = json.load(response)
    embeddings = result["embeddings"]
    if any(len(vector) != EMBEDDING_DIMENSION for vector in embeddings):
        raise ValueError("The configured embedding model returned an unexpected dimension.")
    return embeddings


async def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    return await asyncio.to_thread(_embed_sync, texts)
