from fastapi import APIRouter, UploadFile, File, HTTPException
from datetime import datetime
import cv2
import numpy as np
from ..services.face_detection import FaceDetectionService
from ..services.face_embedding import FaceEmbeddingService
from ..services.face_recognition import FaceRecognitionService
from ..services.attendance_tracker import AttendanceTracker
from ..database.mongodb import get_database

router = APIRouter(prefix="/recognize", tags=["recognition"])

face_detector = FaceDetectionService()
embedding_service = FaceEmbeddingService()
recognition_service = FaceRecognitionService()
attendance_tracker = AttendanceTracker()


@router.post("")
async def recognize_faces(frame: UploadFile = File(...)):
    """
    Process a frame for face recognition and attendance marking
    
    Args:
        frame: Image frame from camera
    
    Returns:
        Recognition results with detected students
    """
    if not recognition_service.is_trained:
        raise HTTPException(status_code=400, detail="Model not trained. Please train the model first.")
    
    # Read frame
    contents = await frame.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame_image is None:
        raise HTTPException(status_code=400, detail="Invalid image format")
    
    # Detect faces
    faces = face_detector.detect_faces(frame_image)
    
    if not faces:
        return {
            "detected_faces": 0,
            "recognized_students": [],
            "attendance_marked": []
        }
    
    # Process each face
    recognized_students = []
    attendance_marked = []
    db = await get_database()
    
    for face in faces:
        # Extract face ROI
        face_roi = face_detector.extract_face_roi(frame_image, face['bbox'])
        
        # Extract embedding
        embedding = embedding_service.extract_embedding(face_roi)
        
        # Recognize
        student_id, confidence = recognition_service.predict(embedding)
        
        if student_id:
            # Get student name
            student = await db.students.find_one({"student_id": student_id})
            student_name = student["name"] if student else student_id
            
            recognized_students.append({
                "student_id": student_id,
                "name": student_name,
                "confidence": confidence,
                "bbox": face['bbox']
            })
            
            # Add to tracking buffer
            now = datetime.now()
            attendance_tracker.add_detection(student_id, now)
            
            # Check and mark attendance
            attendance = await attendance_tracker.check_and_mark_attendance(student_id, confidence)
            if attendance:
                attendance_marked.append({
                    "student_id": student_id,
                    "name": student_name,
                    "status": attendance["status"],
                    "timestamp": attendance["timestamp"].isoformat()
                })
    
    # Log recognition
    await db.recognition_logs.insert_one({
        "timestamp": datetime.now(),
        "detected_faces": len(faces),
        "recognized_students": [s["student_id"] for s in recognized_students],
        "predictions": recognized_students
    })
    
    return {
        "detected_faces": len(faces),
        "recognized_students": recognized_students,
        "attendance_marked": attendance_marked
    }





