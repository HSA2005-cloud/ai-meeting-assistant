import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from auth import get_current_user
from db import supabase

router = APIRouter(prefix="/meetings", tags=["meetings"])

BUCKET = "recordings"

@router.post("/upload")
async def upload_meeting(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    # Read the uploaded file's bytes
    file_bytes = await file.read()

    # Build a unique storage path: <user_id>/<random>_<filename>
    storage_path = f"{user_id}/{uuid.uuid4()}_{file.filename}"

    # Upload the file to Supabase Storage
    try:
        supabase.storage.from_(BUCKET).upload(
            storage_path,
            file_bytes,
            {"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    # Create a meetings row with status 'uploaded'
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