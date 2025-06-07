
// Model Configuration
// Update these paths to point to your actual model files

export const MODEL_CONFIG = {
  // Path to your converted model.json file
  modelPath: '/models/model.json',
  
  // Path to your shard files directory (if using sharded models)
  shardsPath: '/models/',
  
  // Your custom classes from your YOLOv8 training
  // Replace this array with your actual class names
  classes: [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
    'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
    'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
    'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
    'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
    'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
    'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
    'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
  ],
  
  // Model inference settings
  confidence_threshold: 0.5,
  iou_threshold: 0.4,
  
  // Camera settings
  camera: {
    width: 640,
    height: 480,
    fps: 10, // Target FPS for detection
    facingMode: 'environment' // 'user' for front camera, 'environment' for back camera
  }
};

// Instructions for setting up your model files:
/* 
1. Create a 'public/models' folder in your project
2. Place your model.json file in 'public/models/model.json'
3. Place your shard files (*.bin) in 'public/models/'
4. Update the MODEL_CONFIG.classes array above with your actual class names
5. Adjust confidence and IoU thresholds as needed for your model
*/
