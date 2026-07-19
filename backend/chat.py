import re
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user
from db import supabase
from answer_question import answer_question
from embed_and_store import embed_and_store, delete_embeddings

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


# ── Name-correction detection ────────────────────────────────────────────────
# Patterns like:
#   "change prognon to pragna"
#   "replace prognon with pragna"
#   "rename prognon to pragna"
#   "update prognon to pragna"
_NAME_CHANGE_RE = re.compile(
    r"(?:change|replace|rename|update|correct|fix)\s+"
    r"(?:the\s+name\s+)?(?:of\s+)?"
    r"[\"']?(.+?)[\"']?\s+"
    r"(?:to|with|->|=>)\s+"
    r"[\"']?(.+?)[\"']?\s*$",
    re.IGNORECASE,
)


def _detect_name_change(question: str):
    """Return (old_name, new_name) if the question looks like a name correction, else None."""
    m = _NAME_CHANGE_RE.match(question.strip())
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return None


def _apply_name_change(meeting_id: str, old_name: str, new_name: str) -> dict:
    """Find-and-replace old_name → new_name in the transcript & summary.

    Returns {"transcript_hits": N, "summary_hits": N} with the replacement counts.
    """
    hits = {"transcript_hits": 0, "summary_hits": 0}

    # 1. Update transcript
    tx_result = (
        supabase.table("transcripts")
        .select("id, full_text")
        .eq("meeting_id", meeting_id)
        .execute()
    )
    if tx_result.data:
        row = tx_result.data[0]
        old_text = row["full_text"]
        # Case-insensitive replacement
        new_text = re.sub(re.escape(old_name), new_name, old_text, flags=re.IGNORECASE)
        count = len(re.findall(re.escape(old_name), old_text, flags=re.IGNORECASE))
        if count > 0:
            supabase.table("transcripts").update(
                {"full_text": new_text}
            ).eq("id", row["id"]).execute()
            hits["transcript_hits"] = count

            # Re-embed the updated transcript
            try:
                delete_embeddings(meeting_id)
                embed_and_store(meeting_id, new_text)
            except Exception as e:
                print(f"Re-embed after name change failed for {meeting_id}: {e}")

    # 2. Update summary (JSON blob — walk all string values)
    sum_result = (
        supabase.table("summaries")
        .select("id, content")
        .eq("meeting_id", meeting_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    if sum_result.data:
        row = sum_result.data[0]
        content = row["content"]
        content_str = json.dumps(content)
        count = len(re.findall(re.escape(old_name), content_str, flags=re.IGNORECASE))
        if count > 0:
            new_content_str = re.sub(
                re.escape(old_name), new_name, content_str, flags=re.IGNORECASE
            )
            new_content = json.loads(new_content_str)
            supabase.table("summaries").update(
                {"content": new_content}
            ).eq("id", row["id"]).execute()
            hits["summary_hits"] = count

    return hits


@router.post("/{meeting_id}")
def chat(meeting_id: str, body: ChatRequest, user_id: str = Depends(get_current_user)):
    _verify_meeting_owner(meeting_id, user_id)

    question = (body.question or "").strip()

    # Save the user's question
    supabase.table("chat_messages").insert({
        "meeting_id": meeting_id,
        "role": "user",
        "content": question,
    }).execute()

    # Check for a name-correction command
    name_change = _detect_name_change(question)
    updated = False

    if name_change:
        old_name, new_name = name_change
        hits = _apply_name_change(meeting_id, old_name, new_name)
        total = hits["transcript_hits"] + hits["summary_hits"]
        if total > 0:
            answer = (
                f'Done! Replaced "{old_name}" with "{new_name}" '
                f"({hits['transcript_hits']} in transcript, {hits['summary_hits']} in summary). "
                f"The page will refresh to show the changes."
            )
            updated = True
        else:
            answer = f'Could not find "{old_name}" in the transcript or summary.'
    else:
        # Normal grounded Q&A
        answer = answer_question(meeting_id, question)

    # Save the assistant's answer
    supabase.table("chat_messages").insert({
        "meeting_id": meeting_id,
        "role": "assistant",
        "content": answer,
    }).execute()

    return {"answer": answer, "updated": updated}


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
