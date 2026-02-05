from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import students, training, recognition, attendance
from app.database.mongodb import init_database, close_database
from app.utils.config import settings
import uvicorn

app = FastAPI(
    title="Face Attendance System API",
    description="AI-based face recognition attendance system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins= ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(students.router, prefix=settings.API_V1_PREFIX)
app.include_router(training.router, prefix=settings.API_V1_PREFIX)
app.include_router(recognition.router, prefix=settings.API_V1_PREFIX)
app.include_router(attendance.router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await init_database()


@app.on_event("shutdown")
async def shutdown_event():
    """Close database on shutdown"""
    await close_database()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Face Attendance System API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

