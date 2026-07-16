import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from auth import get_current_user
from db import supabase
from stubs.ai_stubs import transcribe_stub

router = APIRouter(prefix="/meetings", tags=["meetings"])

BUCKET = "recordings"


def process_meeting(meeting_id: str, storage_path: str):
    """Runs in the background after upload. Transcribes and updates status."""
    try:
        supabase.table("meetings").update(
            {"status": "processing"}
        ).eq("id", meeting_id).execute()

        transcript_text = transcribe_stub(storage_path)

        supabase.table("transcripts").insert({
            "meeting_id": meeting_id,
            "full_text": transcript_text,
        }).execute()

        supabase.table("meetings").update(
            {"status": "done"}
        ).eq("id", meeting_id).execute()

    except Exception as e:
        supabase.table("meetings").update(
            {"status": "failed"}
        ).eq("id", meeting_id).execute()
        print(f"Processing failed for {meeting_id}: {e}")


@router.post("/upload")
async def upload_meeting(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    file_bytes = await file.read()
    storage_path = f"{user_id}/{uuid.uuid4()}_{file.filename}"

    try:
        supabase.storage.from_(BUCKET).upload(
            storage_path,
            file_bytes,
            {"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    try:
        result = supabase.table("meetings").insert({
            "user_id": user_id,
            "title": file.filename,
            "audio_url": storage_path,
            "status": "uploaded",
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB insert failed: {e}")

    meeting_id = result.data[0]["id"]

    background_tasks.add_task(process_meeting, meeting_id, storage_path)

    return {"meeting_id": meeting_id, "status": "uploaded"}


@router.get("")
def list_meetings(user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("meetings")
        .select("id, title, status, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data
