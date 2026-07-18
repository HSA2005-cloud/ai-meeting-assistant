from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from auth import get_current_user
from meetings import router as meetings_router
from chat import router as chat_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
