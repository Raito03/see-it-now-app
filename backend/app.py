
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import cv2
import numpy as np
from PIL import Image
import io
import os
from models.yolo_detector import YOLODetector
from utils.image_processing import decode_base64_image, encode_image_to_base64
from utils.response_helpers import success_response, error_response

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize YOLO detector
detector = YOLODetector()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Check if the model is loaded and ready"""
    try:
        is_loaded = detector.is_model_loaded()
        return success_response({
            'status': 'healthy' if is_loaded else 'model_not_loaded',
            'model_loaded': is_loaded,
            'message': 'YOLOv8 detector is ready' if is_loaded else 'Model not loaded'
        })
    except Exception as e:
        return error_response(f'Health check failed: {str(e)}', 500)

@app.route('/api/model/info', methods=['GET'])
def get_model_info():
    """Get model information including classes"""
    try:
        info = detector.get_model_info()
        return success_response(info)
    except Exception as e:
        return error_response(f'Failed to get model info: {str(e)}', 500)

@app.route('/api/detect', methods=['POST'])
def detect_objects():
    """Detect objects in the provided image"""
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return error_response('No image data provided', 400)
        
        # Decode base64 image
        image = decode_base64_image(data['image'])
        
        # Get optional parameters
        confidence_threshold = data.get('confidence_threshold', 0.5)
        iou_threshold = data.get('iou_threshold', 0.4)
        
        # Run detection
        detections = detector.detect(
            image, 
            confidence_threshold=confidence_threshold,
            iou_threshold=iou_threshold
        )
        
        return success_response({
            'detections': detections,
            'count': len(detections)
        })
        
    except Exception as e:
        return error_response(f'Detection failed: {str(e)}', 500)

@app.route('/api/detect/stream', methods=['POST'])
def detect_stream():
    """Optimized endpoint for video stream detection"""
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return error_response('No image data provided', 400)
        
        # Decode base64 image
        image = decode_base64_image(data['image'])
        
        # Use lower thresholds for real-time detection
        confidence_threshold = data.get('confidence_threshold', 0.3)
        iou_threshold = data.get('iou_threshold', 0.5)
        
        # Run detection with optimizations for speed
        detections = detector.detect_fast(
            image, 
            confidence_threshold=confidence_threshold,
            iou_threshold=iou_threshold
        )
        
        return success_response({
            'detections': detections,
            'count': len(detections),
            'timestamp': data.get('timestamp', None)
        })
        
    except Exception as e:
        return error_response(f'Stream detection failed: {str(e)}', 500)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
