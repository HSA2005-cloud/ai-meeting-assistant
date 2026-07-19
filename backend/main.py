import os

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from auth import get_current_user
from meetings import router as meetings_router
from chat import router as chat_router

app = FastAPI()

# Local dev origins are always allowed. Set FRONTEND_ORIGIN in production to your
# deployed frontend URL (comma-separated for multiple, e.g. prod + preview).
_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]
_frontend_origin = os.getenv("FRONTEND_ORIGIN")
if _frontend_origin:
    _origins.extend(o.strip() for o in _frontend_origin.split(",") if o.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings_router)
app.include_router(chat_router)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/me")
def me(user_id: str = Depends(get_current_user)):
    return {"user_id": user_id}
