import time 
from faster_whisper import WhisperModel

_model = WhisperModel("base", device="cpu", compute_type="int8")

audio_path = "/Users/hanishsadhi/Desktop/Projects/ai-meeting-assistant/ai/GlobalNewsPodcast-20260713-TrialsOfNewEbolaVaccineSetToBegin.mp3"  # your real test file

def transcribe(audio_path: str) -> str:
    segments, info = _model.transcribe(audio_path)
    return " ".join(segment.text for segment in segments)