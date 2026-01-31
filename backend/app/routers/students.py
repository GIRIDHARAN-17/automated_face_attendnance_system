from fastapi import APIRouter, Form, UploadFile, File, HTTPException, Depends
from typing import List
import cv2
import numpy as np
from datetime import datetime
from ..models.student import StudentCreate, StudentResponse
from ..database.mongodb import get_database
from ..services.face_detection import FaceDetectionService
from ..services.face_embedding import FaceEmbeddingService
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/students", tags=["students"])

face_detector = FaceDetectionService()
embedding_service = FaceEmbeddingService()


@router.post("/register", response_model=StudentResponse)
async def register_student(
    student_id: str = Form(...),
    name: str = Form(...),
    images: List[UploadFile] = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Register a new student with 100 face images
    
    Args:
        student_id: Unique student identifier
        name: Student name
        images: List of face images (should be 100)
    
    Returns:
        Registered student information
    """
    if len(images) < 10:  # Minimum 10 images required
        raise HTTPException(status_code=400, detail="At least 10 images required for registration")
    
    # Check if student already exists
    existing = await db.students.find_one({"student_id": student_id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Student {student_id} already exists")
    
    # Process images
    face_images = []
    embeddings = []
    valid_images = 0
    
    for image_file in images:
        try:
            # Read image
            contents = await image_file.read()
            nparr = np.frombuffer(contents, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                continue
            
            # Detect face
            faces = face_detector.detect_faces(frame, force_detect=True)
            
            if len(faces) == 0:
                continue
            
            # Use first detected face
            face_bbox = faces[0]['bbox']
            face_roi = face_detector.extract_face_roi(frame, face_bbox)
            
            # Extract embedding
            embedding = embedding_service.extract_embedding(face_roi)
            
            face_images.append(face_roi.tolist())  # Store as list for JSON serialization
            embeddings.append(embedding.tolist())
            valid_images += 1
            
        except Exception as e:
            print(f"Error processing image {image_file.filename}: {e}")
            continue
    
    if valid_images < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Only {valid_images} valid face images detected. Need at least 10."
        )
    
    # Create student document
    student_doc = {
        "student_id": student_id,
        "name": name,
        "registration_date": datetime.now(),
        "face_images_paths": [],  # Store embeddings instead of paths
        "embeddings": embeddings
    }
    
    # Save to database
    await db.students.insert_one(student_doc)
    
    return StudentResponse(
        student_id=student_id,
        name=name,
        registration_date=student_doc["registration_date"],
        face_images_count=valid_images,
        embeddings_count=len(embeddings)
    )


@router.get("", response_model=List[StudentResponse])
async def list_students(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get list of all registered students"""
    students = await db.students.find().to_list(None)
    
    return [
        StudentResponse(
            student_id=s["student_id"],
            name=s["name"],
            registration_date=s["registration_date"],
            face_images_count=len(s.get("face_images_paths", [])),
            embeddings_count=len(s.get("embeddings", []))
        )
        for s in students
    ]


@router.delete("/{student_id}")
async def delete_student(
    student_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a student and their data"""
    result = await db.students.delete_one({"student_id": student_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Student {student_id} not found")
    
    # Also delete attendance records
    await db.attendance.delete_many({"student_id": student_id})
    
    return {"status": "success", "message": f"Student {student_id} deleted"}





