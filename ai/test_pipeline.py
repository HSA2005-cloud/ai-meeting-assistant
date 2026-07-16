import sys
from transcribe import transcribe
from summarize import summarize

text = transcribe(sys.argv[1])
print(f"Transcript length: {len(text)} chars\n")

result = summarize(text)

print(f"Summary: {result['summary']}\n")
print(f"Key points: {result['key_points']}\n")
print(f"Action items: {result['action_items']}\n")
print(f"Decisions: {result['decisions']}")