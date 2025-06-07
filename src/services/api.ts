
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ApiDetection {
  label: string;
  confidence: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  class_id: number;
}

export interface DetectionResponse {
  success: boolean;
  data?: {
    detections: ApiDetection[];
    count: number;
    timestamp?: number;
  };
  error?: {
    message: string;
    code: string;
  };
}

export interface ModelInfo {
  model_loaded: boolean;
  device: string;
  classes: string[];
  num_classes: number;
  model_path: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async healthCheck(): Promise<{ status: string; model_loaded: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Health check failed');
      }
      
      return result.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  async getModelInfo(): Promise<ModelInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/model/info`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get model info');
      }
      
      return result.data;
    } catch (error) {
      console.error('Failed to get model info:', error);
      throw error;
    }
  }

  async detectObjects(
    imageBase64: string, 
    confidenceThreshold: number = 0.5, 
    iouThreshold: number = 0.4
  ): Promise<ApiDetection[]> {
    try {
      const response = await fetch(`${this.baseUrl}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
          confidence_threshold: confidenceThreshold,
          iou_threshold: iouThreshold,
        }),
      });

      const result: DetectionResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Detection failed');
      }
      
      return result.data?.detections || [];
    } catch (error) {
      console.error('Detection failed:', error);
      throw error;
    }
  }

  async detectStream(
    imageBase64: string, 
    confidenceThreshold: number = 0.3, 
    iouThreshold: number = 0.5,
    timestamp?: number
  ): Promise<ApiDetection[]> {
    try {
      const response = await fetch(`${this.baseUrl}/detect/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
          confidence_threshold: confidenceThreshold,
          iou_threshold: iouThreshold,
          timestamp,
        }),
      });

      const result: DetectionResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Stream detection failed');
      }
      
      return result.data?.detections || [];
    } catch (error) {
      console.error('Stream detection failed:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
