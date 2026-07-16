import os
import uuid
import tempfile
import subprocess
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from auth import get_current_user
from db import supabase
from transcribe import transcribe

router = APIRouter(prefix="/meetings", tags=["meetings"])

BUCKET = "recordings"

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".flv"}
CHUNK_SIZE = 1024 * 1024  # 1 MB chunks for streaming


def extract_audio(input_path: str) -> str:
    """FFmpeg: extract audio from a video into a compact mp3. Returns the mp3 path."""
    audio_path = input_path + ".mp3"
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", input_path,
            "-vn",                    # no video
            "-acodec", "libmp3lame",
            "-b:a", "128k",           # 128kbps keeps audio small
            audio_path,
        ],
        check=True,
        capture_output=True,
    )
    return audio_path


def transcribe_meeting(meeting_id: str, audio_storage_path: str):
    """Background task: download the (small) audio from Supabase, transcribe, save."""
    tmp_dir = tempfile.mkdtemp()
    local_audio = None
    try:
        supabase.table("meetings").update(
            {"status": "processing"}
        ).eq("id", meeting_id).execute()

        filename = os.path.basename(audio_storage_path)
        local_audio = os.path.join(tmp_dir, filename)
        audio_bytes = supabase.storage.from_(BUCKET).download(audio_storage_path)
        with open(local_audio, "wb") as f:
            f.write(audio_bytes)

        transcript_text = transcribe(local_audio)

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
        print(f"Transcription failed for {meeting_id}: {e}")
    finally:
        if local_audio and os.path.exists(local_audio):
            os.remove(local_audio)
        if os.path.exists(tmp_dir):
            os.rmdir(tmp_dir)


@router.post("/upload")
async def upload_meeting(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    tmp_dir = tempfile.mkdtemp()
    original_name = file.filename
    ext = os.path.splitext(original_name)[1].lower()
    local_input = os.path.join(tmp_dir, f"{uuid.uuid4()}{ext}")
    local_audio = None

    try:
        # 1. Stream the upload to disk in chunks (never load whole file into RAM)
        with open(local_input, "wb") as f:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                f.write(chunk)

        # 2. If video, extract audio locally with FFmpeg. Otherwise use as-is.
        if ext in VIDEO_EXTENSIONS:
            local_audio = extract_audio(local_input)
            audio_to_store = local_audio
            audio_ext = ".mp3"
        else:
            audio_to_store = local_input
            audio_ext = ext

        # 3. Upload ONLY the (small) audio to Supabase
        audio_storage_path = f"{user_id}/{uuid.uuid4()}_audio{audio_ext}"
        with open(audio_to_store, "rb") as f:
            audio_bytes = f.read()
        supabase.storage.from_(BUCKET).upload(
            audio_storage_path,
            audio_bytes,
            {"content-type": "audio/mpeg"},
        )

        # 4. Create the meetings row
        result = supabase.table("meetings").insert({
            "user_id": user_id,
            "title": original_name,
            "audio_url": audio_storage_path,
            "status": "uploaded",
        }).execute()
        meeting_id = result.data[0]["id"]

    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Audio extraction failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")
    finally:
        # Always delete the big local video + temp audio
        for path in (local_input, local_audio):
            if path and os.path.exists(path):
                os.remove(path)
        if os.path.exists(tmp_dir):
            os.rmdir(tmp_dir)

    # 5. Kick off transcription in the background
    background_tasks.add_task(transcribe_meeting, meeting_id, audio_storage_path)

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
