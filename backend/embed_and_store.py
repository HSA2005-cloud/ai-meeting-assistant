import os

import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

load_dotenv()

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

# Use ChromaDB's default sentence-transformers embedding (all-MiniLM-L6-v2).
# Runs 100% locally — no Gemini API calls, so no rate-limit issues.
_default_ef = embedding_functions.DefaultEmbeddingFunction()

# Consistent absolute path so pipeline (embed) and chat endpoint (query)
# always use the SAME ChromaDB, regardless of working directory.
# On Railway/Render, set CHROMA_DB_PATH to a mounted volume path so data
# persists across redeploys. Falls back to a local directory for dev.
_CHROMA_PATH = os.environ.get("CHROMA_DB_PATH") or os.path.join(os.path.dirname(__file__), "chroma_db")

# Use the original collection which already has embedded data from the
# all-MiniLM model (384-dim). The "meeting_transcripts_gemini" collection
# was created for Gemini embeddings but was never populated due to API limits.
_COLLECTION_NAME = "meeting_transcripts"

_client = chromadb.PersistentClient(path=_CHROMA_PATH)
_collection = _client.get_or_create_collection(
    _COLLECTION_NAME,
    embedding_function=_default_ef,
)


def embed_query(question: str) -> list[list[float]]:
    """Embed a chat question for retrieval (returned as ChromaDB expects it:
    a list of query vectors)."""
    return [_default_ef([question])[0]]



def _chunk_text(text: str) -> list[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + CHUNK_SIZE
        chunks.append(" ".join(words[start:end]))
        start = end - CHUNK_OVERLAP
    return chunks


def embed_and_store(meeting_id: str, transcript_text: str) -> None:
    chunks = _chunk_text(transcript_text)
    if not chunks:
        return
    embeddings = _default_ef(chunks)
    ids = [f"{meeting_id}_{i}" for i in range(len(chunks))]
    metadatas = [{"meeting_id": meeting_id} for _ in chunks]
    _collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )


def delete_embeddings(meeting_id: str) -> None:
    """Remove all embedded chunks for a meeting (used on delete/retry)."""
    _collection.delete(where={"meeting_id": meeting_id})
