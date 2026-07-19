import os
import time
import subprocess
import tempfile

from google import genai
from dotenv import load_dotenv

load_dotenv()

_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

# A multimodal model that accepts audio input. Transcription runs entirely on
# Google's side, so the backend carries NO local ML model — that's what lets the
# service fit a 512 MB (Render free-tier) instance. It's also multilingual: it
# transcribes non-English audio in the original language (the summary step then
# translates to English).
MODEL_NAME = "gemini-2.5-flash"

_PROMPT = (
    "Transcribe this meeting audio verbatim. Output ONLY the spoken words as "
    "plain text, in the original language spoken — do NOT translate. Do not add "
    "timestamps, speaker labels, headings, or any commentary. If there is no "
    "intelligible speech, output nothing."
)


def _resolve_ffmpeg() -> str:
    # Prefer the pip-bundled binary (imageio-ffmpeg) so hosts without a system
    # ffmpeg still work; fall back to a `ffmpeg` on PATH for local dev.
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def _to_audio(src_path: str) -> str:
    """Convert any input (webm / mp4 / mov / …) to 16 kHz mono FLAC — a format
    Gemini reliably accepts, and small enough for long meetings."""
    fd, out_path = tempfile.mkstemp(suffix=".flac")
    os.close(fd)
    subprocess.run(
        [_resolve_ffmpeg(), "-y", "-i", src_path,
         "-vn", "-ac", "1", "-ar", "16000", out_path],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return out_path


def transcribe(audio_path: str) -> str:
    flac_path = _to_audio(audio_path)
    uploaded = None
    try:
        uploaded = _client.files.upload(file=flac_path)

        # A freshly uploaded file may be PROCESSING for a moment before it can be
        # used in a prompt. Poll until it's ACTIVE (or give up after ~60s).
        for _ in range(60):
            state = getattr(uploaded.state, "name", str(uploaded.state))
            if state == "ACTIVE":
                break
            if state == "FAILED":
                raise RuntimeError("Gemini failed to process the uploaded audio.")
            time.sleep(1)
            uploaded = _client.files.get(name=uploaded.name)

        response = _client.models.generate_content(
            model=MODEL_NAME,
            contents=[uploaded, _PROMPT],
        )
        return (response.text or "").strip()
    finally:
        if uploaded is not None:
            try:
                _client.files.delete(name=uploaded.name)
            except Exception:
                pass
        try:
            os.remove(flac_path)
        except OSError:
            pass
