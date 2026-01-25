from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.tasks_router import router as tasks_router

app = FastAPI(title="Spinodyne API")

# Configure CORS
origins = [
    "http://localhost:25320",
    "http://localhost",  # Just in case
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(tasks_router, prefix="/api/tasks", tags=["tasks"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
