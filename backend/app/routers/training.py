from fastapi import APIRouter, HTTPException
from ..services.face_recognition import FaceRecognitionService

router = APIRouter(prefix="/training", tags=["training"])

recognition_service = FaceRecognitionService()


@router.post("/train")
async def train_model():
    """
    Train SVM classifier on all student embeddings
    
    Returns:
        Training result with statistics
    """
    try:
        result = await recognition_service.train_model()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/status")
async def get_training_status():
    """Get current training status"""
    return {
        "is_trained": recognition_service.is_trained,
        "num_classes": len(recognition_service.label_encoder.classes_) if recognition_service.label_encoder else 0
    }





