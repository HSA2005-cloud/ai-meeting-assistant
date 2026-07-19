"""One-time script to re-embed all existing transcripts into the new Gemini collection."""
from embed_and_store import embed_and_store
from db import supabase

rows = supabase.table("transcripts").select("meeting_id, full_text").execute().data
print(f"Found {len(rows)} transcript(s) to embed")

for r in rows:
    mid = r["meeting_id"]
    text = r["full_text"]
    print(f"  Embedding {mid} ({len(text)} chars)...")
    embed_and_store(mid, text)

print("Done!")
