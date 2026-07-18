import os
import chromadb
from sentence_transformers import SentenceTransformer

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

# Consistent absolute path so pipeline (embed) and chat endpoint (query)
# always use the SAME ChromaDB, regardless of working directory.
_CHROMA_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")

_embedder = SentenceTransformer("all-MiniLM-L6-v2")
_client = chromadb.PersistentClient(path=_CHROMA_PATH)
_collection = _client.get_or_create_collection("meeting_transcripts")


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
    embeddings = _embedder.encode(chunks).tolist()
    ids = [f"{meeting_id}_{i}" for i in range(len(chunks))]
    metadatas = [{"meeting_id": meeting_id} for _ in chunks]
    _collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )
