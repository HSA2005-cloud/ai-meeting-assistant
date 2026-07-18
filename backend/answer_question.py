import os

from google import genai
from dotenv import load_dotenv

from embed_and_store import _collection, _embedder

load_dotenv()
_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

# Separate model = separate free-tier daily quota from the gemini-2.5-flash
# bucket summarize.py uses, so chat keeps working after summaries burn it.
MODEL_NAME = "gemini-3.1-flash-lite"
TOP_K = 5
NOT_COVERED = "That wasn't covered in this meeting."

_PROMPT_TEMPLATE = """You are answering questions about a single meeting, using only the transcript excerpts provided below.

Rules:
- Answer ONLY from the excerpts. Do not use outside knowledge.
- If the excerpts do not contain the answer, say exactly: "That wasn't covered in this meeting."
- Do not guess, infer beyond what is stated, or fill gaps with plausible-sounding detail.
- Answer in 1-3 sentences, plainly. No preamble.

Transcript excerpts:"""


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
        if not response.text:
            return NOT_COVERED
        return response.text.strip()
    except Exception as e:
        # Rate limits / transient API failures shouldn't 500 the chat endpoint.
        print(f"answer_question failed for {meeting_id}: {e}")
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            return "The AI service is rate-limited right now — please try again in a minute."
        return NOT_COVERED
