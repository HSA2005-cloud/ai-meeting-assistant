from faster_whisper import WhisperModel

MODEL_SIZE = "base"

# Loaded once when the module is imported. First run downloads the model (~140MB).
_model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")


def transcribe(audio_path: str) -> str:
    segments, _info = _model.transcribe(audio_path)
    return " ".join(segment.text.strip() for segment in segments)
