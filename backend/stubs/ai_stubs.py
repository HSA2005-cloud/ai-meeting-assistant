def transcribe_stub(audio_path: str) -> str:
    return f"[STUB TRANSCRIPT] This is placeholder text for {audio_path}."


def answer_question_stub(meeting_id: str, question: str) -> str:
    # Placeholder for ai's answer_question(). Same signature so swapping is one line.
    return f"[STUB ANSWER] I can't answer '{question}' yet — real RAG coming from AI."
