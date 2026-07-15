# API Contract

## AI Engineer exposes (Python functions, called by Backend)
def transcribe(audio_path: str) -> str
def summarize(transcript_text: str) -> dict  # {summary, key_points, action_items, decisions}
def embed_and_store(meeting_id: str, transcript_text: str) -> None
def answer_question(meeting_id: str, question: str) -> str

## Backend exposes (REST endpoints, called by Frontend)
POST /meetings/upload          -> {meeting_id, status}
GET  /meetings                 -> [{id, title, status, created_at}]
GET  /meetings/:id              -> {transcript, summary, action_items}
POST /chat/:meeting_id          -> {answer}