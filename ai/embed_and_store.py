import chromadb
from sentence_transformers import SentenceTransformer

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

_embedder = SentenceTransformer("all-MiniLM-L6-v2")
_client = chromadb.PersistentClient(path="chroma_db")
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