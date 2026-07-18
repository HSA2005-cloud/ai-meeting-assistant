import os
import uuid
import shutil
import hashlib
import tempfile
import subprocess
import traceback
from collections import Counter
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel
from auth import get_current_user
from db import supabase
from transcribe import transcribe
from summarize import summarize
from embed_and_store import embed_and_store, delete_embeddings

router = APIRouter(prefix="/meetings", tags=["meetings"])

BUCKET = "recordings"

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".flv"}
CHUNK_SIZE = 1024 * 1024  # 1 MB chunks for streaming


def _resolve_ffmpeg() -> str:
    """Path to an ffmpeg binary.

    Prefer the one bundled by the `imageio-ffmpeg` pip package so hosts without a
    system ffmpeg (e.g. Render's native Python runtime) can still extract audio.
    Fall back to a `ffmpeg` on PATH for local dev.
    """
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


FFMPEG = _resolve_ffmpeg()


def extract_audio(input_path: str) -> str:
    """FFmpeg: extract audio from a video into a compact mp3. Returns the mp3 path."""
    audio_path = input_path + ".mp3"
    result = subprocess.run(
        [
            FFMPEG, "-y",
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


def set_stage(meeting_id: str, stage):
    """Best-effort update of a meeting's fine-grained pipeline stage.

    The `stage` column is additive and optional — if it hasn't been added to
    the table yet, we log and carry on rather than break processing. The
    frontend falls back to a timed walk-through when no stage is reported.
    """
    try:
        supabase.table("meetings").update(
            {"stage": stage}
        ).eq("id", meeting_id).execute()
    except Exception as e:
        print(f"Could not set stage={stage!r} for {meeting_id}: {e}")


def find_duplicate(user_id: str, content_hash: str):
    """Return an existing meeting for this user with the same file content, if any.

    Matches on `content_hash` (SHA-256 of the original uploaded bytes) so the
    same recording is caught even if it was renamed. Best-effort: if the
    optional `content_hash` column hasn't been added yet, we skip dedup rather
    than block uploads.
    """
    try:
        result = (
            supabase.table("meetings")
            .select("id, title, status")
            .eq("user_id", user_id)
            .eq("content_hash", content_hash)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Duplicate check skipped (content_hash unavailable?): {e}")
        return None


def transcribe_meeting(meeting_id: str, audio_storage_path: str):
    """Background task: download audio, transcribe, summarize, save everything."""
    tmp_dir = tempfile.mkdtemp()
    local_audio = None
    try:
        # Keep the status update separate from the stage update so a missing
        # `stage` column can never prevent the meeting from entering processing.
        supabase.table("meetings").update(
            {"status": "processing"}
        ).eq("id", meeting_id).execute()
        set_stage(meeting_id, "transcribing")

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
        set_stage(meeting_id, "chunking")
        print(f">>> ABOUT TO EMBED {meeting_id}")
        embed_and_store(meeting_id, transcript_text)
        print(f">>> EMBED FINISHED {meeting_id}")

        # 3. Summarize the transcript (Gemini)
        set_stage(meeting_id, "summarizing")
        summary_data = summarize(transcript_text)

        # 4. Persist the summary
        set_stage(meeting_id, "delivering")
        supabase.table("summaries").insert({
            "meeting_id": meeting_id,
            "version": 1,
            "content": summary_data,
        }).execute()

        # 5. Mark as completed and clear the working stage
        supabase.table("meetings").update(
            {"status": "completed"}
        ).eq("id", meeting_id).execute()
        set_stage(meeting_id, None)
        print(f">>> ALL DONE {meeting_id} completed")

    except Exception as e:
        # Distinguish Gemini rate-limit errors from other failures so the
        # frontend can show "Token limit reached" instead of a generic "Failed".
        from google.genai.errors import ClientError
        if isinstance(e, ClientError) and e.code == 429:
            status = "quota_exceeded"
        else:
            status = "failed"
        supabase.table("meetings").update(
            {"status": status}
        ).eq("id", meeting_id).execute()
        set_stage(meeting_id, None)
        print(f"Processing {status} for {meeting_id}: {e}")
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
        # Stream to disk and hash the original bytes in one pass so we can
        # detect a re-upload of the same recording (even if it was renamed).
        hasher = hashlib.sha256()
        with open(local_input, "wb") as f:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                hasher.update(chunk)
                f.write(chunk)
        content_hash = hasher.hexdigest()

        # If this exact recording already exists for the user, skip all the
        # expensive extraction/upload/processing and point them at it.
        existing = find_duplicate(user_id, content_hash)
        if existing:
            return {
                "meeting_id": existing["id"],
                "status": existing["status"],
                "duplicate": True,
            }

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

        meeting_row = {
            "user_id": user_id,
            "title": original_name,
            "audio_url": audio_storage_path,
            "status": "uploaded",
            "content_hash": content_hash,
        }
        try:
            result = supabase.table("meetings").insert(meeting_row).execute()
        except Exception:
            # `content_hash` column not present yet — insert without it so
            # uploads keep working; dedup just won't trigger until it's added.
            meeting_row.pop("content_hash", None)
            result = supabase.table("meetings").insert(meeting_row).execute()
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


def _parse_ts(ts: str) -> datetime:
    """Parse a Supabase timestamptz string into an aware UTC datetime."""
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


# NOTE: must be declared before "/{meeting_id}" so the static path isn't
# swallowed by the dynamic route.
@router.get("/analytics")
def get_analytics(user_id: str = Depends(get_current_user)):
    """Aggregate dashboard metrics for the current user in a single call.

    Counts cover *all* meetings regardless of status. The richer "insights"
    (action items / decisions / key points) come from each meeting's latest
    summary — data the plain /meetings list doesn't expose.
    """
    meetings = (
        supabase.table("meetings")
        .select("id, title, status, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
        .data
    ) or []

    total = len(meetings)
    completed = sum(1 for m in meetings if m["status"] == "completed")
    in_progress = sum(1 for m in meetings if m["status"] in ("uploaded", "processing"))
    failed = sum(1 for m in meetings if m["status"] in ("failed", "quota_exceeded"))

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    this_week = sum(1 for m in meetings if _parse_ts(m["created_at"]) >= week_ago)

    status_breakdown = [
        {"status": s, "count": c} for s, c in Counter(m["status"] for m in meetings).items()
    ]

    # Weekly buckets: 8 windows of 7 days each, ending today (UTC).
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    buckets = []
    for i in range(7, -1, -1):
        end = today - timedelta(days=i * 7)
        start = end - timedelta(days=6)
        buckets.append({"start": start, "end": end + timedelta(days=1), "count": 0})
    for m in meetings:
        d = _parse_ts(m["created_at"])
        for b in buckets:
            if b["start"] <= d < b["end"]:
                b["count"] += 1
                break
    weekly = [{"week_start": b["start"].date().isoformat(), "count": b["count"]} for b in buckets]

    # Insights from each meeting's latest summary. Rows come back sorted by
    # version desc, so the first time we see a meeting_id is its newest summary.
    action_items = decisions = key_points = 0
    meetings_summarized = 0
    ids = [m["id"] for m in meetings]
    if ids:
        summaries = (
            supabase.table("summaries")
            .select("meeting_id, version, content")
            .in_("meeting_id", ids)
            .order("version", desc=True)
            .execute()
            .data
        ) or []
        seen = set()
        for s in summaries:
            mid = s["meeting_id"]
            if mid in seen:
                continue
            seen.add(mid)
            content = s.get("content") or {}
            action_items += len(content.get("action_items") or [])
            decisions += len(content.get("decisions") or [])
            key_points += len(content.get("key_points") or [])
        meetings_summarized = len(seen)

    return {
        "totals": {
            "meetings": total,
            "completed": completed,
            "in_progress": in_progress,
            "failed": failed,
            "this_week": this_week,
        },
        "insights": {
            "action_items": action_items,
            "decisions": decisions,
            "key_points": key_points,
            "meetings_summarized": meetings_summarized,
        },
        "status_breakdown": status_breakdown,
        "weekly": weekly,
        "recent": meetings[:5],
    }


@router.get("/{meeting_id}")
def get_meeting(meeting_id: str, user_id: str = Depends(get_current_user)):
    # 1. Fetch the meeting, scoped to this user (security).
    # Try to include the optional `stage` column, but fall back gracefully if
    # it hasn't been added to the table yet.
    try:
        meeting_result = (
            supabase.table("meetings")
            .select("id, title, status, created_at, stage")
            .eq("id", meeting_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception:
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
        "stage": meeting.get("stage"),                  # fine-grained pipeline stage
        "created_at": meeting["created_at"],
        "transcript": transcript,
        "summary": summary_content,                     # nested StructuredSummary object
        "action_items": summary_content.get("action_items", []),
    }


def _require_meeting(meeting_id: str, user_id: str, columns: str = "id"):
    """Fetch a meeting scoped to the user, or 404. Returns the row dict."""
    result = (
        supabase.table("meetings")
        .select(columns)
        .eq("id", meeting_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return result.data[0]


def _purge_derived_data(meeting_id: str):
    """Delete a meeting's transcript, summaries, and embeddings (best-effort).

    Used by both delete (tearing everything down) and retry (clearing a prior
    attempt so reprocessing doesn't leave duplicate rows/embeddings behind).
    """
    for table in ("summaries", "transcripts"):
        try:
            supabase.table(table).delete().eq("meeting_id", meeting_id).execute()
        except Exception as e:
            print(f"Could not delete {table} for {meeting_id}: {e}")
    try:
        delete_embeddings(meeting_id)
    except Exception as e:
        print(f"Could not delete embeddings for {meeting_id}: {e}")


class RenameRequest(BaseModel):
    title: str


@router.patch("/{meeting_id}")
def rename_meeting(meeting_id: str, body: RenameRequest, user_id: str = Depends(get_current_user)):
    title = (body.title or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title cannot be empty.")
    result = (
        supabase.table("meetings")
        .update({"title": title})
        .eq("id", meeting_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"id": meeting_id, "title": title}


@router.delete("/{meeting_id}")
def delete_meeting(meeting_id: str, user_id: str = Depends(get_current_user)):
    meeting = _require_meeting(meeting_id, user_id, columns="id, audio_url")

    # Remove the stored audio file (best-effort — a missing file shouldn't block).
    audio_url = meeting.get("audio_url")
    if audio_url:
        try:
            supabase.storage.from_(BUCKET).remove([audio_url])
        except Exception as e:
            print(f"Could not delete audio {audio_url}: {e}")

    _purge_derived_data(meeting_id)

    supabase.table("meetings").delete().eq("id", meeting_id).eq("user_id", user_id).execute()
    return {"ok": True}


@router.post("/{meeting_id}/retry")
def retry_meeting(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    meeting = _require_meeting(meeting_id, user_id, columns="id, audio_url, status")

    if meeting["status"] not in ("failed", "quota_exceeded"):
        raise HTTPException(
            status_code=400,
            detail="Only failed or token-limited meetings can be retried.",
        )
    if not meeting.get("audio_url"):
        raise HTTPException(status_code=400, detail="This meeting has no stored audio to reprocess.")

    # Clear any partial output from the previous attempt so the redo is clean.
    _purge_derived_data(meeting_id)
    supabase.table("meetings").update({"status": "uploaded"}).eq("id", meeting_id).execute()
    set_stage(meeting_id, None)

    background_tasks.add_task(transcribe_meeting, meeting_id, meeting["audio_url"])
    return {"meeting_id": meeting_id, "status": "uploaded"}
