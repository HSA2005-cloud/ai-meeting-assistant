import os

from google import genai
from dotenv import load_dotenv

from embed_and_store import _collection, _embedder

load_dotenv()
_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

MODEL_NAME = "gemini-2.5-flash"
TOP_K = 5
NOT_COVERED = "That wasn't covered in this meeting."

_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "prompts", "answer_prompt.txt")

with open(_PROMPT_PATH) as f:
    _PROMPT_TEMPLATE = f.read().strip()


def _retrieve(meeting_id: str, question: str) -> list[str]:
    query_embedding = _embedder.encode([question]).tolist()
    result = _collection.query(
        query_embeddings=query_embedding,
        n_results=TOP_K,
        where={"meeting_id": meeting_id},
    )
    documents = result.get("documents") or [[]]
    return documents[0]


def answer_question(meeting_id: str, question: str) -> str:
    question = (question or "").strip()
    if not question:
        return NOT_COVERED

    chunks = _retrieve(meeting_id, question)
    if not chunks:
        return NOT_COVERED

    excerpts = "\n\n---\n\n".join(chunks)
    prompt = f"{_PROMPT_TEMPLATE}\n{excerpts}\n\nQuestion: {question}"

    try:
        response = _client.models.generate_content(model=MODEL_NAME, contents=prompt)
        return response.text.strip()
    except (ValueError, AttributeError, TypeError):
        return NOT_COVERED