import pickle
import numpy as np
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder
from typing import Tuple, Optional, List
import os
from ..utils.config import settings
from ..database.mongodb import get_database


class FaceRecognitionService:
    """SVM-based face recognition service"""
    
    def __init__(self):
        self.svm_model: Optional[SVC] = None
        self.label_encoder: Optional[LabelEncoder] = None
        self.is_trained = False
        self.model_path = settings.SVM_MODEL_PATH
        self._load_model()
    
    def _load_model(self):
        """Load trained SVM model from disk"""
        os.makedirs(settings.MODEL_DIR, exist_ok=True)
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    model_data = pickle.load(f)
                    self.svm_model = model_data['model']
                    self.label_encoder = model_data['label_encoder']
                    self.is_trained = True
                print(f"Loaded trained SVM model with {len(self.label_encoder.classes_)} classes")
            except Exception as e:
                print(f"Error loading model: {e}")
    
    def _save_model(self):
        """Save trained SVM model to disk"""
        if self.svm_model and self.label_encoder:
            os.makedirs(settings.MODEL_DIR, exist_ok=True)
            model_data = {
                'model': self.svm_model,
                'label_encoder': self.label_encoder
            }
            with open(self.model_path, 'wb') as f:
                pickle.dump(model_data, f)
            print(f"Saved SVM model to {self.model_path}")
    
    async def train_model(self) -> dict:
        """
        Train SVM classifier on all student embeddings from database
        
        Returns:
            Training result with number of students and samples
        """
        db = await get_database()
        
        # Fetch all students with embeddings
        students = await db.students.find({"embeddings": {"$exists": True, "$ne": []}}).to_list(None)
        
        if not students:
            raise ValueError("No students with embeddings found in database")
        
        # Prepare training data
        X = []  # Embeddings
        y = []  # Student IDs
        
        for student in students:
            student_id = student['student_id']
            embeddings = student.get('embeddings', [])
            
            for embedding in embeddings:
                if len(embedding) == 512:  # Validate embedding dimension
                    X.append(embedding)
                    y.append(student_id)
        
        if len(X) == 0:
            raise ValueError("No valid embeddings found for training")
        
        X = np.array(X)
        
        # Encode labels
        self.label_encoder = LabelEncoder()
        y_encoded = self.label_encoder.fit_transform(y)
        
        # Train SVM
        self.svm_model = SVC(kernel='rbf', probability=True, C=1.0, gamma='scale')
        self.svm_model.fit(X, y_encoded)
        
        self.is_trained = True
        self._save_model()
        
        return {
            "status": "success",
            "num_students": len(students),
            "num_samples": len(X),
            "classes": list(self.label_encoder.classes_)
        }
    
    def predict(self, embedding: np.ndarray) -> Tuple[Optional[str], float]:
        """
        Predict student identity from embedding
        
        Args:
            embedding: 512-D FaceNet embedding
            
        Returns:
            Tuple of (student_id, confidence_score) or (None, 0.0) if low confidence
        """
        if not self.is_trained or self.svm_model is None:
            return None, 0.0
        
        # Reshape for single prediction
        embedding = embedding.reshape(1, -1)
        
        # Predict
        probabilities = self.svm_model.predict_proba(embedding)[0]
        predicted_class_idx = np.argmax(probabilities)
        confidence = probabilities[predicted_class_idx]
        
        # Check confidence threshold
        if confidence < settings.CONFIDENCE_THRESHOLD:
            return None, float(confidence)
        
        # Decode student ID
        student_id = self.label_encoder.inverse_transform([predicted_class_idx])[0]
        
        return student_id, float(confidence)
    
    def predict_batch(self, embeddings: List[np.ndarray]) -> List[Tuple[Optional[str], float]]:
        """
        Predict student identities for multiple embeddings
        
        Args:
            embeddings: List of 512-D embeddings
            
        Returns:
            List of (student_id, confidence) tuples
        """
        if not embeddings:
            return []
        
        results = []
        for embedding in embeddings:
            result = self.predict(embedding)
            results.append(result)
        
        return results





