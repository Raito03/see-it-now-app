
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Detection {
  id?: string;
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  timestamp?: string;
}

export interface DetectionResult {
  detections: Detection[];
  image_path?: string;
  processed_image?: string; // base64 encoded
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  detections: Detection[];
  image_path?: string;
  processed_image?: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async detectImage(imageFile: File): Promise<DetectionResult> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${this.baseUrl}/detect`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Detection failed: ${response.statusText}`);
    }

    return response.json();
  }

  async detectVideo(videoFile: File): Promise<DetectionResult> {
    const formData = new FormData();
    formData.append('video', videoFile);

    const response = await fetch(`${this.baseUrl}/video`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Video detection failed: ${response.statusText}`);
    }

    return response.json();
  }

  async detectLive(imageBase64: string): Promise<DetectionResult> {
    const response = await fetch(`${this.baseUrl}/detect/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        save_to_history: false
      }),
    });

    if (!response.ok) {
      throw new Error(`Live detection failed: ${response.statusText}`);
    }

    return response.json();
  }

  async detectWithHistory(imageFile: File): Promise<DetectionResult> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${this.baseUrl}/detect-history`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Detection with history failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getHistory(): Promise<HistoryItem[]> {
    const response = await fetch(`${this.baseUrl}/history`);
    
    if (!response.ok) {
      throw new Error(`Failed to get history: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteHistoryItem(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/history-delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete history item: ${response.statusText}`);
    }
  }

  async clearHistory(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/history-delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clear_all: true }),
    });

    if (!response.ok) {
      throw new Error(`Failed to clear history: ${response.statusText}`);
    }
  }
}

export const apiService = new ApiService();
