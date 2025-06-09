
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Upload, Video, History, Trash2, Play, Square, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiService, Detection, DetectionResult, HistoryItem } from '@/services/api';
import { captureFrameAsBase64 } from '@/utils/imageUtils';

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
      const historyData = await apiService.getHistory();
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: isMobile ? 480 : 640 },
          height: { ideal: isMobile ? 640 : 480 },
          facingMode: isMobile ? 'environment' : 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraActive(true);
        
        toast({
          title: "Camera Started",
          description: "Camera is ready for waste detection",
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera permissions",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
      setIsLiveDetecting(false);
      setCurrentDetections([]);
    }
  };

  const runLiveDetection = useCallback(async () => {
    if (!videoRef.current || !isCameraActive || isDetecting) return;

    setIsDetecting(true);
    
    try {
      const imageBase64 = captureFrameAsBase64(videoRef.current);
      const result = await apiService.detectLive(imageBase64);
      
      setCurrentDetections(result.detections || []);
      drawDetections(result.detections || []);
      
    } catch (error) {
      console.error('Live detection failed:', error);
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

  const drawDetections = (detections: Detection[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach(detection => {
      const [x1, y1, x2, y2] = detection.bbox;
      const width = x2 - x1;
      const height = y2 - y1;
      
      // Scale coordinates to canvas size
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;
      
      const scaledX = x1 * scaleX;
      const scaledY = y1 * scaleY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;
      
      // Draw bounding box
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
      
      // Draw label
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(scaledX, scaledY - 25, 150, 25);
      ctx.fillStyle = '#fff';
      ctx.font = '14px Arial';
      ctx.fillText(`${detection.label} ${(detection.confidence * 100).toFixed(1)}%`, scaledX + 5, scaledY - 8);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsDetecting(true);
    try {
      const result = await apiService.detectWithHistory(file);
      setDetectionResult(result);
      
      // Create preview URL for the uploaded image
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      await loadHistory(); // Refresh history
      
      toast({
        title: "Detection Complete",
        description: `Found ${result.detections.length} waste objects`,
      });
    } catch (error) {
      console.error('Image detection failed:', error);
      toast({
        title: "Detection Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsDetecting(true);
    try {
      const result = await apiService.detectVideo(file);
      setDetectionResult(result);
      
      toast({
        title: "Video Processing Complete",
        description: `Detected waste objects in video`,
      });
    } catch (error) {
      console.error('Video detection failed:', error);
      toast({
        title: "Video Processing Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      await apiService.deleteHistoryItem(id);
      await loadHistory();
      toast({
        title: "Item Deleted",
        description: "History item removed successfully",
      });
    } catch (error) {
      console.error('Failed to delete history item:', error);
      toast({
        title: "Delete Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const clearAllHistory = async () => {
    try {
      await apiService.clearHistory();
      await loadHistory();
      toast({
        title: "History Cleared",
        description: "All history items removed",
      });
    } catch (error) {
      console.error('Failed to clear history:', error);
      toast({
        title: "Clear Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
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

                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg bg-black max-h-[60vh] object-contain"
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
                          <span className="font-medium">{detection.label}</span>
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
                              <span className="font-medium">{detection.label}</span>
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
                              <span className="font-medium">{detection.label}</span>
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
                                <span className="text-sm font-medium">{detection.label}</span>
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
