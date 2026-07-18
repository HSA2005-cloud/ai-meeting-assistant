from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user
from db import supabase
from answer_question import answer_question

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str


def _verify_meeting_owner(meeting_id: str, user_id: str):
    result = (
        supabase.table("meetings")
        .select("id")
        .eq("id", meeting_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")


@router.post("/{meeting_id}")
def chat(meeting_id: str, body: ChatRequest, user_id: str = Depends(get_current_user)):
    _verify_meeting_owner(meeting_id, user_id)

    # Save the user's question
    supabase.table("chat_messages").insert({
        "meeting_id": meeting_id,
        "role": "user",
        "content": body.question,
    }).execute()

    # Grounded answer: retrieve this meeting's chunks from ChromaDB, ask Gemini
    answer = answer_question(meeting_id, body.question)

    # Save the assistant's answer
    supabase.table("chat_messages").insert({
        "meeting_id": meeting_id,
        "role": "assistant",
        "content": answer,
    }).execute()

    return {"answer": answer}


@router.get("/{meeting_id}/history")
def chat_history(meeting_id: str, user_id: str = Depends(get_current_user)):
    _verify_meeting_owner(meeting_id, user_id)
    result = (
        supabase.table("chat_messages")
        .select("role, content, created_at")
        .eq("meeting_id", meeting_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data
