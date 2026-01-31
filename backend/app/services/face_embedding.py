import torch
import numpy as np
from facenet_pytorch import InceptionResnetV1
from PIL import Image
import cv2
from typing import List, Optional
import hashlib
import pickle
import os
from ..utils.config import settings


class FaceEmbeddingService:
    """FaceNet-based face embedding service with caching"""
    
    def __init__(self):
        # Load FaceNet model
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
        
        # Embedding cache: {face_hash: embedding}
        self.cache = {}
        self.cache_file = os.path.join(settings.MODEL_DIR, "embedding_cache.pkl")
        self._load_cache()
    
    def _load_cache(self):
        """Load embedding cache from disk"""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'rb') as f:
                    self.cache = pickle.load(f)
                print(f"Loaded {len(self.cache)} cached embeddings")
            except Exception as e:
                print(f"Error loading cache: {e}")
    
    def _save_cache(self):
        """Save embedding cache to disk"""
        os.makedirs(settings.MODEL_DIR, exist_ok=True)
        try:
            with open(self.cache_file, 'wb') as f:
                pickle.dump(self.cache, f)
        except Exception as e:
            print(f"Error saving cache: {e}")
    
    def _get_face_hash(self, face_image: np.ndarray) -> str:
        """Generate hash for face image to use as cache key"""
        # Resize to small size for hashing
        small = cv2.resize(face_image, (64, 64))
        return hashlib.md5(small.tobytes()).hexdigest()
    
    def extract_embedding(self, face_image: np.ndarray, use_cache: bool = True) -> np.ndarray:
        """
        Extract 512-D FaceNet embedding from face image
        
        Args:
            face_image: Face image (BGR format from OpenCV)
            use_cache: Whether to use caching
            
        Returns:
            512-D embedding vector
        """
        # Check cache
        if use_cache:
            face_hash = self._get_face_hash(face_image)
            if face_hash in self.cache:
                return self.cache[face_hash]
        
        # Preprocess image
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
        
        # Resize to 160x160 (FaceNet input size)
        resized = cv2.resize(rgb_image, (160, 160))
        
        # Convert to PIL Image
        pil_image = Image.fromarray(resized)
        
        # Normalize and convert to tensor
        img_tensor = torch.tensor(np.array(pil_image)).float()
        img_tensor = img_tensor.permute(2, 0, 1).unsqueeze(0)  # [1, 3, 160, 160]
        img_tensor = (img_tensor - 127.5) / 128.0  # Normalize to [-1, 1]
        img_tensor = img_tensor.to(self.device)
        
        # Extract embedding
        with torch.no_grad():
            embedding = self.model(img_tensor)
            embedding = embedding.cpu().numpy().flatten()
        
        # Cache embedding
        if use_cache:
            face_hash = self._get_face_hash(face_image)
            self.cache[face_hash] = embedding
            self._save_cache()
        
        return embedding
    
    def extract_embeddings_batch(self, face_images: List[np.ndarray]) -> List[np.ndarray]:
        """
        Extract embeddings for multiple face images
        
        Args:
            face_images: List of face images
            
        Returns:
            List of 512-D embedding vectors
        """
        embeddings = []
        for face_image in face_images:
            embedding = self.extract_embedding(face_image)
            embeddings.append(embedding)
        return embeddings

