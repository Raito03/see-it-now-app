
# YOLOv8 Flask Backend

This Flask backend provides API endpoints for YOLOv8 object detection using your trained model.

## Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Add Your Model**
   - Create a `models/` directory in the backend folder
   - Place your `best.pt` file in `backend/models/best.pt`

3. **Run the Server**
   ```bash
   python app.py
   ```

The server will start on `http://localhost:5000`

## API Endpoints

### GET /api/health
Check if the model is loaded and ready.

### GET /api/model/info
Get model information including class names.

### POST /api/detect
Detect objects in a single image.
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "confidence_threshold": 0.5,
  "iou_threshold": 0.4
}
```

### POST /api/detect/stream
Optimized endpoint for video stream detection (faster inference).

## Model Requirements

- Place your trained YOLOv8 model (`best.pt`) in the `models/` directory
- The model should be compatible with ultralytics YOLO format
- GPU acceleration will be used automatically if available

## Dependencies

- Flask: Web framework
- ultralytics: YOLOv8 implementation
- OpenCV: Image processing
- PyTorch: Deep learning framework
- Pillow: Image handling
