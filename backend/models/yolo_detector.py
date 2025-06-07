
import torch
from ultralytics import YOLO
import cv2
import numpy as np
from typing import List, Dict, Any
import os

class YOLODetector:
    def __init__(self, model_path: str = 'models/best.pt'):
        self.model_path = model_path
        self.model = None
        self.class_names = []
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.load_model()
    
    def load_model(self):
        """Load the YOLOv8 model"""
        try:
            if os.path.exists(self.model_path):
                print(f"Loading model from {self.model_path}")
                self.model = YOLO(self.model_path)
                self.model.to(self.device)
                
                # Get class names from the model
                self.class_names = list(self.model.names.values())
                print(f"Model loaded successfully with {len(self.class_names)} classes")
                print(f"Using device: {self.device}")
            else:
                print(f"Model file not found at {self.model_path}")
                print("Please place your best.pt file in the models/ directory")
        except Exception as e:
            print(f"Error loading model: {str(e)}")
    
    def is_model_loaded(self) -> bool:
        """Check if model is successfully loaded"""
        return self.model is not None
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            'model_loaded': self.is_model_loaded(),
            'device': self.device,
            'classes': self.class_names,
            'num_classes': len(self.class_names),
            'model_path': self.model_path
        }
    
    def detect(self, image: np.ndarray, confidence_threshold: float = 0.5, iou_threshold: float = 0.4) -> List[Dict[str, Any]]:
        """Run object detection on image"""
        if not self.is_model_loaded():
            raise Exception("Model not loaded")
        
        try:
            # Run inference
            results = self.model(image, conf=confidence_threshold, iou=iou_threshold, verbose=False)
            
            detections = []
            
            # Process results
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for i in range(len(boxes)):
                        # Get bounding box coordinates
                        x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
                        
                        # Get confidence and class
                        confidence = float(boxes.conf[i].cpu().numpy())
                        class_id = int(boxes.cls[i].cpu().numpy())
                        
                        # Get class name
                        class_name = self.class_names[class_id] if class_id < len(self.class_names) else f"class_{class_id}"
                        
                        detection = {
                            'label': class_name,
                            'confidence': confidence,
                            'box': {
                                'x': float(x1),
                                'y': float(y1),
                                'width': float(x2 - x1),
                                'height': float(y2 - y1)
                            },
                            'class_id': class_id
                        }
                        detections.append(detection)
            
            return detections
            
        except Exception as e:
            print(f"Detection error: {str(e)}")
            return []
    
    def detect_fast(self, image: np.ndarray, confidence_threshold: float = 0.3, iou_threshold: float = 0.5) -> List[Dict[str, Any]]:
        """Optimized detection for real-time streaming"""
        if not self.is_model_loaded():
            raise Exception("Model not loaded")
        
        try:
            # Resize image for faster inference
            height, width = image.shape[:2]
            if width > 640:
                scale = 640 / width
                new_width = 640
                new_height = int(height * scale)
                image = cv2.resize(image, (new_width, new_height))
                scale_factor = 1 / scale
            else:
                scale_factor = 1.0
            
            # Run inference with smaller image size for speed
            results = self.model(image, conf=confidence_threshold, iou=iou_threshold, verbose=False, imgsz=640)
            
            detections = []
            
            # Process results and scale back coordinates
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for i in range(len(boxes)):
                        # Get bounding box coordinates
                        x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
                        
                        # Scale coordinates back to original image size
                        x1 *= scale_factor
                        y1 *= scale_factor
                        x2 *= scale_factor
                        y2 *= scale_factor
                        
                        # Get confidence and class
                        confidence = float(boxes.conf[i].cpu().numpy())
                        class_id = int(boxes.cls[i].cpu().numpy())
                        
                        # Get class name
                        class_name = self.class_names[class_id] if class_id < len(self.class_names) else f"class_{class_id}"
                        
                        detection = {
                            'label': class_name,
                            'confidence': confidence,
                            'box': {
                                'x': float(x1),
                                'y': float(y1),
                                'width': float(x2 - x1),
                                'height': float(y2 - y1)
                            },
                            'class_id': class_id
                        }
                        detections.append(detection)
            
            return detections
            
        except Exception as e:
            print(f"Fast detection error: {str(e)}")
            return []
