import os
import uuid
import shutil
import tempfile
import subprocess
import traceback
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from auth import get_current_user
from db import supabase
from transcribe import transcribe
from summarize import summarize
from embed_and_store import embed_and_store

router = APIRouter(prefix="/meetings", tags=["meetings"])

BUCKET = "recordings"

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".flv"}
CHUNK_SIZE = 1024 * 1024  # 1 MB chunks for streaming


def extract_audio(input_path: str) -> str:
    """FFmpeg: extract audio from a video into a compact mp3. Returns the mp3 path."""
    audio_path = input_path + ".mp3"
    result = subprocess.run(
        [
            "ffmpeg", "-y",
            # Tolerate corrupt packets (e.g. partially-downloaded recordings)
            # instead of aborting — extract whatever audio is decodable.
            "-err_detect", "ignore_err",
            "-fflags", "+discardcorrupt",
            "-i", input_path,
            "-vn",
            "-acodec", "libmp3lame",
            # Mono 16 kHz: what Whisper consumes, and sidesteps unsupported
            # channel layouts (libmp3lame only handles mono/stereo).
            "-ac", "1",
            "-ar", "16000",
            "-b:a", "64k",
            audio_path,
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        # Log ffmpeg's full complaint; put the tail in the raised error.
        print(f"ffmpeg stderr for {input_path}:\n{result.stderr}")
        stderr_tail = (result.stderr or "").strip()[-2000:]
        raise RuntimeError(f"ffmpeg exited {result.returncode}: {stderr_tail}")
    return audio_path


def transcribe_meeting(meeting_id: str, audio_storage_path: str):
    """Background task: download audio, transcribe, summarize, save everything."""
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

        # 1. Transcribe
        transcript_text = transcribe(local_audio)
        print(f">>> TRANSCRIBE DONE for {meeting_id} chars: {len(transcript_text)}")

        supabase.table("transcripts").insert({
            "meeting_id": meeting_id,
            "full_text": transcript_text,
        }).execute()

        # 2. Embed transcript chunks into ChromaDB for the chat endpoint
        print(f">>> ABOUT TO EMBED {meeting_id}")
        embed_and_store(meeting_id, transcript_text)
        print(f">>> EMBED FINISHED {meeting_id}")

        # 3. Summarize the transcript (Gemini)
        summary_data = summarize(transcript_text)

        supabase.table("summaries").insert({
            "meeting_id": meeting_id,
            "version": 1,
            "content": summary_data,
        }).execute()

        # 4. Mark as completed
        supabase.table("meetings").update(
            {"status": "completed"}
        ).eq("id", meeting_id).execute()
        print(f">>> ALL DONE {meeting_id} completed")

    except Exception as e:
        supabase.table("meetings").update(
            {"status": "failed"}
        ).eq("id", meeting_id).execute()
        print(f"Processing failed for {meeting_id}: {e}")
        traceback.print_exc()
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


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
        with open(local_input, "wb") as f:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                f.write(chunk)

        if ext in VIDEO_EXTENSIONS:
            local_audio = extract_audio(local_input)
            audio_to_store = local_audio
            audio_ext = ".mp3"
        else:
            audio_to_store = local_input
            audio_ext = ext

        audio_storage_path = f"{user_id}/{uuid.uuid4()}_audio{audio_ext}"
        with open(audio_to_store, "rb") as f:
            audio_bytes = f.read()
        supabase.storage.from_(BUCKET).upload(
            audio_storage_path,
            audio_bytes,
            {"content-type": "audio/mpeg"},
        )

        result = supabase.table("meetings").insert({
            "user_id": user_id,
            "title": original_name,
            "audio_url": audio_storage_path,
            "status": "uploaded",
        }).execute()
        meeting_id = result.data[0]["id"]

    except RuntimeError as e:
        print(f"Audio extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Audio extraction failed: {e}")
    except Exception as e:
        print(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")
    finally:
        # ignore_errors so cleanup never masks the real exception
        shutil.rmtree(tmp_dir, ignore_errors=True)

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


@router.get("/{meeting_id}")
def get_meeting(meeting_id: str, user_id: str = Depends(get_current_user)):
    # 1. Fetch the meeting, scoped to this user (security)
    meeting_result = (
        supabase.table("meetings")
        .select("id, title, status, created_at")
        .eq("id", meeting_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not meeting_result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")
    meeting = meeting_result.data[0]

    # 2. Fetch the transcript (may not exist yet if still processing)
    transcript_result = (
        supabase.table("transcripts")
        .select("full_text")
        .eq("meeting_id", meeting_id)
        .execute()
    )
    transcript = transcript_result.data[0]["full_text"] if transcript_result.data else ""

    # 3. Fetch the latest summary (content is the StructuredSummary dict)
    summary_result = (
        supabase.table("summaries")
        .select("content")
        .eq("meeting_id", meeting_id)
        .order("version", desc=True)
        .execute()
    )
    empty_summary = {"summary": "", "key_points": [], "action_items": [], "decisions": []}
    summary_content = summary_result.data[0]["content"] if summary_result.data else empty_summary

    # 4. Shape the response to match frontend's MeetingDetailResponse contract
    return {
        "id": meeting["id"],
        "title": meeting["title"],
        "status": meeting["status"],
        "created_at": meeting["created_at"],
        "transcript": transcript,
        "summary": summary_content,                     # nested StructuredSummary object
        "action_items": summary_content.get("action_items", []),
    }
