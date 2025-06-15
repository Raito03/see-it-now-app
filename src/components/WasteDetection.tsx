
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Upload, Video, History, Trash2, Play, Square, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
// import { apiService, Detection, DetectionResult, HistoryItem } from '@/services/api';
import { captureFrameAsBase64 } from '@/utils/imageUtils';

// Helper to convert base64 data URL to Blob
const dataURLtoBlob = (dataurl: string) => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const API_BASE = 'http://localhost:8000';

// Define detection interface
type Detection = {
  class_name: string;          // matches API
  confidence: number;
  bbox: [number, number, number, number];
}


// API response for detection
interface DetectionResult {
  detections: Detection[];
  processed_image?: string;    // matches back-end
  annotated_image?: string;     // if you still want both
  videoUrl?: string;
}


// History item from backend
interface HistoryItem {
  timestamp: string | number | Date;
  id: string;
  processed_image: string; // base64 JPEG
  detections: Detection[];
}

const WasteDetection = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [activeTab, setActiveTab] = useState('live');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLiveDetecting, setIsLiveDetecting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history?limit=50&offset=0`);
      const data = await res.json();
      setHistory(data.records as HistoryItem[]);
    } catch (err) {
      console.error(err);
    }
  };

  // Start camera and set canvas dimensions once
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: isMobile ? 'environment' : 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
        // Once metadata loaded, size canvas
        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
        };
        setStream(mediaStream);
        setIsCameraActive(true);
        toast({ title: 'Camera Started', description: 'Camera is ready' });
      }
    } catch {
      toast({ title: 'Camera Access Denied', description: 'Allow permissions', variant: 'destructive' });
    }
  };
  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setIsCameraActive(false);
    setIsLiveDetecting(false);
    setCurrentDetections([]);
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Run detection but do not resize canvas repeatedly
  const runLiveDetection = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isCameraActive || isDetecting) return;
    setIsDetecting(true);
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // drawImage uses existing canvas size
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      const blob = dataURLtoBlob(dataUrl);
      const form = new FormData(); form.append('file', blob, 'frame.jpg');
      const res = await fetch(`${API_BASE}/detect`, { method: 'POST', body: form });
      const result = (await res.json()) as DetectionResult;
      setCurrentDetections(result.detections);
      drawDetections(result.detections);
      await loadHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDetecting(false);
    }
  }, [isCameraActive, isDetecting]);

  // Live detection loop
  useEffect(() => {
    if (!isLiveDetecting || !isCameraActive) return;

    const interval = setInterval(runLiveDetection, 1000); // 1 FPS for live detection
    return () => clearInterval(interval);
  }, [isLiveDetecting, isCameraActive, runLiveDetection]);

  // Draw boxes overlay
  const drawDetections = (detections: Detection[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    // clear only overlay, preserving video
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    detections.forEach(d => {
      const [x1, y1, x2, y2] = d.bbox;
      const w = x2 - x1;
      const h = y2 - y1;
      ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, w, h);
      ctx.fillStyle = '#ff4444'; ctx.fillRect(x1, y1 - 20, 120, 20);
      ctx.fillStyle = '#fff'; ctx.font = '12px Arial';
      ctx.fillText(`${d.class_name} ${(d.confidence * 100).toFixed(1)}%`, x1 + 4, y1 - 6);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsDetecting(true);
    try {
      const form = new FormData(); form.append('file', file);
      const res = await fetch(`${API_BASE}/detect`, { method: 'POST', body: form });
      const result = await res.json();
      setDetectionResult(result);
      const reader = new FileReader(); reader.onload = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
      await loadHistory();
      toast({ title: 'Detection Complete', description: `Found ${result.detections.length} objects` });
    } catch {
      toast({ title: 'Detection Failed', variant: 'destructive' });
    } finally { setIsDetecting(false); }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsDetecting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/video`, { method: 'POST', body: form });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDetectionResult(prev => ({ detections: prev.detections, videoUrl: url }));
      toast({ title: 'Video Processed' });
    } catch {
      toast({ title: 'Processing Failed', variant: 'destructive' });
    } finally {
      setIsDetecting(false);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    await fetch(`${API_BASE}/history-delete?detection_id=${id}`, { method: 'DELETE' });
    await loadHistory();
    toast({ title: 'Item Deleted' });
  };
  const clearAllHistory = async () => {
    await fetch(`${API_BASE}/history-delete`, { method: 'DELETE' });
    await loadHistory();
    toast({ title: 'History Cleared' });
  };

  // Handle video loaded metadata
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      const handleLoadedMetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-2 md:p-4">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <Camera className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
            Waste Detection System
          </h1>
          <p className="text-gray-600 text-sm md:text-base">AI-powered waste object detection using YOLO</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} mb-4`}>
            <TabsTrigger value="live" className="flex items-center gap-1 text-xs md:text-sm">
              <Camera className="w-4 h-4" />
              {!isMobile && "Live"}
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-1 text-xs md:text-sm">
              <Upload className="w-4 h-4" />
              {!isMobile && "Image"}
            </TabsTrigger>
            {!isMobile && (
              <TabsTrigger value="video" className="flex items-center gap-1 text-xs md:text-sm">
                <Video className="w-4 h-4" />
                Video
              </TabsTrigger>
            )}
            <TabsTrigger value="history" className="flex items-center gap-1 text-xs md:text-sm">
              <History className="w-4 h-4" />
              {!isMobile && "History"}
            </TabsTrigger>
          </TabsList>

          {/* Live Detection Tab */}
          <TabsContent value="live" className="space-y-4">
            <Card className="p-4 md:p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    onClick={isCameraActive ? stopCamera : startCamera}
                    variant={isCameraActive ? "destructive" : "default"}
                    className="w-full sm:w-auto"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {isCameraActive ? "Stop Camera" : "Start Camera"}
                  </Button>
                  
                  {isCameraActive && (
                    <Button
                      onClick={() => setIsLiveDetecting(!isLiveDetecting)}
                      variant={isLiveDetecting ? "secondary" : "default"}
                      className="w-full sm:w-auto"
                    >
                      {isLiveDetecting ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      {isLiveDetecting ? "Stop Detection" : "Start Detection"}
                    </Button>
                  )}
                </div>

                <div className="relative w-full h-[65%]" style={{ paddingTop: '0' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg top-0 left-0 h-full object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full rounded-lg pointer-events-none"
                  />
                  
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                      <div className="text-center text-white">
                        <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Camera not active</p>
                      </div>
                    </div>
                  )}
                  
                  {isDetecting && (
                    <div className="absolute top-2 right-2 bg-red-500/80 text-white px-2 py-1 rounded text-sm">
                      Detecting...
                    </div>
                  )}
                </div>

                {/* Live Detections */}
                {currentDetections.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-800">Live Detections ({currentDetections.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentDetections.map((detection, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                          <span className="font-medium">{detection.class_name}</span>
                          <Badge variant="secondary">
                            {(detection.confidence * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Image Detection Tab */}
          <TabsContent value="image" className="space-y-4">
            <Card className="p-4 md:p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isDetecting}
                    className="w-full sm:w-auto"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isDetecting ? "Processing..." : "Upload Image"}
                  </Button>
                </div>

                {selectedImage && (
                  <div className="space-y-4">
                    <img
                      src={selectedImage}
                      alt="Uploaded"
                      className="w-full max-h-[50vh] object-contain rounded-lg"
                    />
                    
                    {detectionResult && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-800">
                          Detections ({detectionResult.detections.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {detectionResult.detections.map((detection, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                              <span className="font-medium">{detection.class_name}</span>
                              <Badge variant="secondary">
                                {(detection.confidence * 100).toFixed(1)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Video Detection Tab */}
          {!isMobile && (
            <TabsContent value="video" className="space-y-4">
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => videoFileInputRef.current?.click()}
                      disabled={isDetecting}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      {isDetecting ? "Processing..." : "Upload Video"}
                    </Button>
                  </div>

                  {detectionResult && (
                    <div className="space-y-4">
                      {detectionResult.processed_image && (
                        <img
                          src={`data:image/jpeg;base64,${detectionResult.processed_image}`}
                          alt="Processed"
                          className="w-full max-h-[50vh] object-contain rounded-lg"
                        />
                      )}
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-800">
                          Detections ({detectionResult.detections.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {detectionResult.detections.map((detection, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                              <span className="font-medium">{detection.class_name}</span>
                              <Badge variant="secondary">
                                {(detection.confidence * 100).toFixed(1)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          )}

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card className="p-4 md:p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-800">Detection History</h3>
                  {history.length > 0 && (
                    <Button
                      onClick={clearAllHistory}
                      variant="destructive"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No detection history available</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {history.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="text-sm text-gray-600">
                            {new Date(item.timestamp).toLocaleString()}
                          </div>
                          <Button
                            onClick={() => deleteHistoryItem(item.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {item.processed_image && (
                          <img
                            src={`data:image/jpeg;base64,${item.processed_image}`}
                            alt="Detection result"
                            className="w-full max-h-48 object-contain rounded"
                          />
                        )}
                        
                        <div className="space-y-2">
                          <p className="font-medium">Detections ({item.detections.length})</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.detections.map((detection, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm font-medium">{detection.class_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {(detection.confidence * 100).toFixed(1)}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WasteDetection;
