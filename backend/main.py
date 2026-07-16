from fastapi import FastAPI, Depends
from auth import get_current_user
from meetings import router as meetings_router

app = FastAPI()

app.include_router(meetings_router)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/me")
def me(user_id: str = Depends(get_current_user)):
    return {"user_id": user_id}
