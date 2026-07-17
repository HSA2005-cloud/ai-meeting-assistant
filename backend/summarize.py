import json
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
MODEL_NAME = "gemini-2.5-flash"
MIN_TRANSCRIPT_CHARS = 50

_PROMPT_TEMPLATE = """You are summarizing a meeting transcript. Return ONLY valid JSON, no markdown fences, no preamble.

Schema:
{
  "summary": "2-3 sentence overview",
  "key_points": ["point 1", "point 2"],
  "action_items": ["who does what by when, if stated"],
  "decisions": ["decision made"]
}

If a category has nothing, return an empty array. Do not invent content not in the transcript."""

_LIST_KEYS = ("key_points", "action_items", "decisions")

_generation_config = types.GenerateContentConfig(
    response_mime_type="application/json",
    response_schema={
        "type": "OBJECT",
        "properties": {
            "summary": {"type": "STRING"},
            **{k: {"type": "ARRAY", "items": {"type": "STRING"}} for k in _LIST_KEYS},
        },
        "required": ["summary", *_LIST_KEYS],
    },
)


def _empty() -> dict:
    return {"summary": "", "key_points": [], "action_items": [], "decisions": []}


def _coerce(data) -> dict:
    result = _empty()
    if not isinstance(data, dict):
        return result
    result["summary"] = str(data.get("summary") or "")
    for key in _LIST_KEYS:
        value = data.get(key) or []
        result[key] = [str(item) for item in value] if isinstance(value, list) else []
    return result


def summarize(transcript_text: str) -> dict:
    transcript_text = (transcript_text or "").strip()
    if len(transcript_text) < MIN_TRANSCRIPT_CHARS:
        return _empty()
    response = _client.models.generate_content(
        model=MODEL_NAME,
        contents=f"{_PROMPT_TEMPLATE}\n\nTranscript:\n{transcript_text}",
        config=_generation_config,
    )
    if response.text is None:
        return _empty()
    try:
        return _coerce(json.loads(response.text))
    except ValueError:
        return _empty()
