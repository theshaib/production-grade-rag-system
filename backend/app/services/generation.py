import asyncio
import json
import urllib.error
import urllib.request

from app.core.config import settings

OLLAMA_GENERATE_URL = "http://127.0.0.1:11434/api/generate"
GENERATION_MODEL = "qwen3:8b"


def _generate_sync(prompt: str) -> str:
    if settings.ai_api_key:
        try:
            return _generate_groq_sync(prompt)
        except urllib.error.HTTPError:
            # Keep local generation available when the optional hosted key is invalid or unavailable.
            pass

    payload = json.dumps({
        "model": GENERATION_MODEL,
        "prompt": prompt,
        "stream": False,
        "think": False,
        "keep_alive": -1,
        "options": {"temperature": 0, "num_predict": 96},
    }).encode()
    request = urllib.request.Request(
        OLLAMA_GENERATE_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        return json.load(response)["response"].strip()


def _generate_groq_sync(prompt: str) -> str:
    payload = json.dumps({
        "model": settings.ai_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0,
        "max_tokens": 160,
    }).encode()
    request = urllib.request.Request(
        settings.ai_base_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.ai_api_key}",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)["choices"][0]["message"]["content"].strip()


async def generate_answer(question: str, context: str) -> str:
    prompt = f"""You answer questions using only the supplied document context.
Do not use outside knowledge or invent facts. If the answer is not in the context, say exactly that the information was not found in the provided knowledge.
Keep the answer concise and useful.

Context:
{context}

Question: {question}
Answer:"""
    return await asyncio.to_thread(_generate_sync, prompt)
