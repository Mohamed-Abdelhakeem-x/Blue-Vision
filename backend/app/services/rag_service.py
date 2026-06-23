import time
import chromadb
from sentence_transformers import SentenceTransformer
from groq import Groq
from typing import Any

from app.core.config import get_settings

settings = get_settings()

GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama3-8b-8192"
]

import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# 🧠 Embedding model (SEPARATE)
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# 📦 Chroma DB
try:
    client = chromadb.PersistentClient(path=settings.chroma_db_path)
    collection = client.get_or_create_collection("docs")
except Exception as e:
    print(f"Warning: Failed to initialize Chroma DB at {settings.chroma_db_path}: {e}")
    client = None
    collection = None

def retrieve(query: str, top_k: int = 3):
    if collection is None:
        return []
    query_embedding = embed_model.encode([query]).tolist()
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k
    )
    if not results or not results.get("documents") or not results["documents"][0]:
        return []
    return results["documents"][0]

def generate_with_fallback(messages: list[Any]):
    last_error = None
    if not settings.groq_api_key:
        return "Error: Groq API key is not configured."
        
    groq_client = Groq(api_key=settings.groq_api_key)
    for model_name in GROQ_MODELS:
        try:
            chat_completion = groq_client.chat.completions.create(
                messages=messages,
                model=model_name,
            )
            response_text = chat_completion.choices[0].message.content
            if response_text:
                return response_text
        except Exception as e:
            last_error = str(e)
            time.sleep(2)
    return f"All models failed. Last error: {last_error}"

def generate_answer(question: str, docs: list[str], history: list[Any] | None = None):
    if history is None:
        history = []
        
    system_prompt = "You are an aquaculture expert. Answer the user's questions clearly and concisely. If the question is conversational (e.g. hello, thanks), respond naturally."
    
    if docs and len("".join(docs).strip()) > 50:
        context = "\n\n".join(docs)
        prompt = f"""
Answer the user's question using the provided reference material if it is relevant.

Reference Material:
{context}

Question:
{question}
"""
    else:
        prompt = question

    messages = [{"role": "system", "content": system_prompt}] + history + [
        {"role": "user", "content": prompt}
    ]
    return generate_with_fallback(messages)

def get_answer(question: str, history: list[Any] | None = None) -> dict[str, str]:
    if not settings.groq_api_key:
        return {"answer": "Error: Groq API key is not configured."}
    
    docs = []
    if collection is not None:
        docs = retrieve(question, top_k=5)

    answer = generate_answer(question, docs, history)
    return {"answer": answer}
