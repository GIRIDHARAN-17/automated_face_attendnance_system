import cv2
import numpy as np
from mtcnn import MTCNN
from typing import List, Tuple, Optional
import os


class FaceDetectionService:
    """MTCNN-based face detection service"""
    
    def __init__(self):
        self.detector = MTCNN()
        self.frame_count = 0
    
    def detect_faces(self, frame: np.ndarray, force_detect: bool = False) -> List[dict]:
        """
        Detect faces in a frame using MTCNN
        
        Args:
            frame: Input image frame (BGR format)
            force_detect: If True, skip frame counting optimization
            
        Returns:
            List of detected faces with bounding boxes and confidence scores
        """
        # Optimization: detect every 3rd frame
        if not force_detect:
            self.frame_count += 1
            if self.frame_count % 3 != 0:
                return []
        
        # Convert BGR to RGB for MTCNN
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Detect faces
        detections = self.detector.detect_faces(rgb_frame)
        
        # Format results
        faces = []
        for detection in detections:
            if detection['confidence'] > 0.9:  # High confidence threshold
                box = detection['box']
                faces.append({
                    'bbox': [box[0], box[1], box[0] + box[2], box[1] + box[3]],  # [x1, y1, x2, y2]
                    'confidence': detection['confidence'],
                    'keypoints': detection['keypoints']
                })
        
        return faces
    
    def extract_face_roi(self, frame: np.ndarray, bbox: List[int], padding: int = 10) -> np.ndarray:
        """
        Extract face region of interest from frame
        
        Args:
            frame: Input frame
            bbox: Bounding box [x1, y1, x2, y2]
            padding: Padding around face
            
        Returns:
            Cropped face image
        """
        h, w = frame.shape[:2]
        x1, y1, x2, y2 = bbox
        
        # Add padding
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(w, x2 + padding)
        y2 = min(h, y2 + padding)
        
        return frame[y1:y2, x1:x2]





