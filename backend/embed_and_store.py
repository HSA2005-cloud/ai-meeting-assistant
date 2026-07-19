import os

import chromadb
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

# Gemini embeddings (3072-dim, normalized at the default output size). Runs on
# Google's side, so no local torch / sentence-transformers — that's the other
# half of fitting a 512 MB instance. Uses the GA `gemini-embedding-001`; the
# earlier `gemini-embedding-exp-03-07` was an experimental model and has since
# been retired (404), which failed every embed and marked meetings "failed".
EMBED_MODEL = "gemini-embedding-001"
_BATCH = 100  # max texts per embed_content call

# Consistent absolute path so pipeline (embed) and chat endpoint (query)
# always use the SAME ChromaDB, regardless of working directory.
# On Railway/Render, set CHROMA_DB_PATH to a mounted volume path so data
# persists across redeploys. Falls back to a local directory for dev.
_CHROMA_PATH = os.environ.get("CHROMA_DB_PATH") or os.path.join(os.path.dirname(__file__), "chroma_db")

# NB: new collection name. The previous embedder (all-MiniLM, 384-dim) produced
# incompatible vectors, and a Chroma collection is locked to the dimensionality
# of its first insert — so we start a fresh one rather than clash. Meetings
# embedded under the old model need a re-run (retry) to become searchable again.
_COLLECTION_NAME = "meeting_transcripts_gemini"

_genai = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
_client = chromadb.PersistentClient(path=_CHROMA_PATH)
_collection = _client.get_or_create_collection(_COLLECTION_NAME)


def _embed(texts: list[str], task_type: str) -> list[list[float]]:
    vectors: list[list[float]] = []
    for i in range(0, len(texts), _BATCH):
        batch = texts[i : i + _BATCH]
        resp = _genai.models.embed_content(
            model=EMBED_MODEL,
            contents=batch,
            config=types.EmbedContentConfig(task_type=task_type),
        )
        vectors.extend(e.values for e in resp.embeddings)
    return vectors


def embed_query(question: str) -> list[list[float]]:
    """Embed a chat question for retrieval (returned as ChromaDB expects it:
    a list of query vectors)."""
    return _embed([question], "RETRIEVAL_QUERY")


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
    embeddings = _embed(chunks, "RETRIEVAL_DOCUMENT")
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
