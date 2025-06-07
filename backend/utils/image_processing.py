
import base64
import cv2
import numpy as np
from PIL import Image
import io

def decode_base64_image(base64_string: str) -> np.ndarray:
    """Decode base64 string to OpenCV image"""
    try:
        # Remove data:image/jpeg;base64, prefix if present
        if base64_string.startswith('data:image'):
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_data))
        
        # Convert to OpenCV format (BGR)
        opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        return opencv_image
        
    except Exception as e:
        raise Exception(f"Failed to decode base64 image: {str(e)}")

def encode_image_to_base64(image: np.ndarray, format: str = 'JPEG') -> str:
    """Encode OpenCV image to base64 string"""
    try:
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Convert to PIL Image
        pil_image = Image.fromarray(rgb_image)
        
        # Save to bytes
        buffer = io.BytesIO()
        pil_image.save(buffer, format=format)
        
        # Encode to base64
        base64_string = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return f"data:image/{format.lower()};base64,{base64_string}"
        
    except Exception as e:
        raise Exception(f"Failed to encode image to base64: {str(e)}")

def resize_image(image: np.ndarray, target_width: int = 640) -> np.ndarray:
    """Resize image while maintaining aspect ratio"""
    height, width = image.shape[:2]
    
    if width <= target_width:
        return image
    
    # Calculate new dimensions
    scale = target_width / width
    new_width = target_width
    new_height = int(height * scale)
    
    # Resize image
    resized_image = cv2.resize(image, (new_width, new_height))
    
    return resized_image

def preprocess_image_for_detection(image: np.ndarray) -> np.ndarray:
    """Preprocess image for YOLO detection"""
    # Resize if too large
    image = resize_image(image, target_width=640)
    
    # Ensure image is in correct format
    if len(image.shape) == 3 and image.shape[2] == 3:
        # Image is already in BGR format (OpenCV default)
        return image
    elif len(image.shape) == 3 and image.shape[2] == 4:
        # Convert RGBA to BGR
        return cv2.cvtColor(image, cv2.COLOR_RGBA2BGR)
    else:
        # Convert grayscale to BGR
        return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
