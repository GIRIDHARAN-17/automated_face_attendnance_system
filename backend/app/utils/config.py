from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "face_attendance"
    
    # Face Recognition
    CONFIDENCE_THRESHOLD: float = 0.7
    FRAMES_FOR_ATTENDANCE: int = 5
    ATTENDANCE_WINDOW_SECONDS: int = 10
    LATE_ARRIVAL_THRESHOLD_HOURS: int = 9  # 9 AM default
    
    # Model paths
    MODEL_DIR: str = "./models"
    SVM_MODEL_PATH: str = "./models/svm_classifier.pkl"
    
    # Face detection optimization
    DETECTION_FRAME_SKIP: int = 3  # Detect every 3rd frame
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()





