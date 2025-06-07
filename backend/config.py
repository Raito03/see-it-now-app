
import os

class Config:
    # Model configuration
    MODEL_PATH = os.path.join('models', 'best.pt')
    
    # Detection settings
    DEFAULT_CONFIDENCE_THRESHOLD = 0.5
    DEFAULT_IOU_THRESHOLD = 0.4
    STREAM_CONFIDENCE_THRESHOLD = 0.3
    STREAM_IOU_THRESHOLD = 0.5
    
    # Image processing
    MAX_IMAGE_WIDTH = 640
    MAX_IMAGE_HEIGHT = 640
    
    # API settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # CORS settings
    CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

# Default configuration
config = DevelopmentConfig()
