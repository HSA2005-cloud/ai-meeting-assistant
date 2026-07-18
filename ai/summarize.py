import json
import os

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

MODEL_NAME = "gemini-2.5-flash"
MIN_TRANSCRIPT_CHARS = 50

_PROMPT_PATH = os.path.join(os.path.dirname(__file__), "prompts", "summarize_prompt.txt")

with open(_PROMPT_PATH) as f:
    _PROMPT_TEMPLATE = f.read().strip()

_CONFIG = types.GenerateContentConfig(response_mime_type="application/json")

_EMPTY = {"summary": "", "key_points": [], "action_items": [], "decisions": []}


def _coerce(data: dict) -> dict:
    result = dict(_EMPTY)
    result["summary"] = str(data.get("summary") or "")
    for key in ("key_points", "action_items", "decisions"):
        value = data.get(key) or []
        result[key] = [str(item) for item in value] if isinstance(value, list) else []
    return result


def summarize(transcript_text: str) -> dict:
    transcript_text = (transcript_text or "").strip()

    if len(transcript_text) < MIN_TRANSCRIPT_CHARS:
        return dict(_EMPTY)

    response = _client.models.generate_content(
        model=MODEL_NAME,
        contents=f"{_PROMPT_TEMPLATE}\n{transcript_text}",
        config=_CONFIG,
    )

    try:
        return _coerce(json.loads(response.text))
    except (json.JSONDecodeError, ValueError, AttributeError, TypeError):
        return dict(_EMPTY)