
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Square, Zap, Cpu, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService, ApiDetection } from '@/services/api';
import { captureFrameAsBase64 } from '@/utils/imageUtils';
import { MODEL_CONFIG } from '@/config/model';

interface Detection {
  label: string;
  confidence: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ModelStats {
  fps: number;
  inferenceTime: number;
  detectionsCount: number;
}

const ObjectDetection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [modelStats, setModelStats] = useState<ModelStats>({
    fps: 0,
    inferenceTime: 0,
    detectionsCount: 0
  });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // Check backend health and load model
  const loadModel = useCallback(async () => {
    setIsModelLoading(true);
    setBackendStatus('connecting');
    
    try {
      // Check backend health
      const healthData = await apiService.healthCheck();
      setBackendStatus('connected');
      
      if (healthData.model_loaded) {
        setIsModelLoaded(true);
        toast({
          title: "Model Loaded Successfully",
          description: "YOLOv8 model is ready for object detection",
        });
      } else {
        toast({
          title: "Model Not Found",
          description: "Please ensure your best.pt file is in the backend/models/ directory",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
      setBackendStatus('error');
      toast({
        title: "Backend Connection Failed",
        description: "Please ensure the Flask backend is running on port 5000",
        variant: "destructive",
      });
    } finally {
      setIsModelLoading(false);
    }
  }, [toast]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: MODEL_CONFIG.camera.width },
          height: { ideal: MODEL_CONFIG.camera.height },
          facingMode: MODEL_CONFIG.camera.facingMode
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraActive(true);
        
        toast({
          title: "Camera Access Granted",
          description: "Ready to start object detection",
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera permissions to use object detection",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
      setIsDetecting(false);
      setDetections([]);
    }
  }, [stream]);

  // Real object detection using API
  const runDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded || !isCameraActive) return;

    setIsDetecting(true);
    const startTime = performance.now();
    
    try {
      // Capture frame as base64
      const imageBase64 = captureFrameAsBase64(videoRef.current);
      
      // Send to backend for detection
      const apiDetections = await apiService.detectStream(
        imageBase64,
        MODEL_CONFIG.confidence_threshold,
        MODEL_CONFIG.iou_threshold,
        Date.now()
      );

      // Convert API detections to frontend format
      const frontendDetections: Detection[] = apiDetections.map((det: ApiDetection) => ({
        label: det.label,
        confidence: det.confidence,
        box: det.box
      }));

      const inferenceTime = performance.now() - startTime;
      
      setDetections(frontendDetections);
      setModelStats(prev => ({
        fps: Math.round(1000 / inferenceTime),
        inferenceTime: Math.round(inferenceTime),
        detectionsCount: frontendDetections.length
      }));

      // Draw bounding boxes
      drawDetections(frontendDetections);
      
    } catch (error) {
      console.error('Detection failed:', error);
      // Don't show toast for every failed detection to avoid spam
    } finally {
      setIsDetecting(false);
    }
  }, [isModelLoaded, isCameraActive]);

  const drawDetections = (detections: Detection[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bounding boxes and labels
    detections.forEach(detection => {
      const { box, label, confidence } = detection;
      
      // Draw bounding box
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      
      // Draw label background
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(box.x, box.y - 25, 150, 25);
      
      // Draw label text
      ctx.fillStyle = '#000';
      ctx.font = '14px Arial';
      ctx.fillText(`${label} ${(confidence * 100).toFixed(1)}%`, box.x + 5, box.y - 8);
    });
  };

  // Run detection loop
  useEffect(() => {
    if (!isCameraActive || !isModelLoaded) return;

    const interval = setInterval(runDetection, 1000 / MODEL_CONFIG.camera.fps);
    return () => clearInterval(interval);
  }, [isCameraActive, isModelLoaded, runDetection]);

  // Handle video loaded
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

  // Auto-load model on component mount
  useEffect(() => {
    loadModel();
  }, [loadModel]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-2">
            <Zap className="w-8 h-8 text-yellow-400" />
            YOLOv8 Object Detection
          </h1>
          <p className="text-slate-300">Real-time object detection using your trained model</p>
          
          {/* Backend Status */}
          <div className="flex items-center justify-center gap-2">
            {backendStatus === 'connecting' && (
              <>
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-yellow-400 text-sm">Connecting to backend...</span>
              </>
            )}
            {backendStatus === 'connected' && (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm">Backend connected</span>
              </>
            )}
            {backendStatus === 'error' && (
              <>
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">Backend connection failed</span>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-slate-700 p-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-slate-300 text-sm">FPS</p>
                <p className="text-2xl font-bold text-white">{modelStats.fps}</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700 p-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-slate-300 text-sm">Inference Time</p>
                <p className="text-2xl font-bold text-white">{modelStats.inferenceTime}ms</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700 p-4">
            <div className="flex items-center gap-2">
              <Square className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-slate-300 text-sm">Detections</p>
                <p className="text-2xl font-bold text-white">{modelStats.detectionsCount}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700 p-6">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg bg-black"
                  style={{ maxHeight: '480px' }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full rounded-lg pointer-events-none"
                />
                
                {!isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-300">Camera not active</p>
                    </div>
                  </div>
                )}
                
                {isDetecting && (
                  <div className="absolute top-2 right-2 bg-blue-500/80 text-white px-2 py-1 rounded text-sm">
                    Detecting...
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Controls & Detections */}
          <div className="space-y-6">
            {/* Controls */}
            <Card className="bg-slate-800/50 border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Controls</h3>
              <div className="space-y-3">
                <Button
                  onClick={loadModel}
                  disabled={isModelLoading || (isModelLoaded && backendStatus === 'connected')}
                  className="w-full"
                  variant={isModelLoaded && backendStatus === 'connected' ? "secondary" : "default"}
                >
                  {isModelLoading ? "Connecting..." : 
                   isModelLoaded && backendStatus === 'connected' ? "Model Ready" : "Connect to Backend"}
                </Button>
                
                <Button
                  onClick={isCameraActive ? stopCamera : startCamera}
                  disabled={!isModelLoaded || backendStatus !== 'connected'}
                  className="w-full"
                  variant={isCameraActive ? "destructive" : "default"}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {isCameraActive ? "Stop Camera" : "Start Camera"}
                </Button>
              </div>
            </Card>

            {/* Live Detections */}
            <Card className="bg-slate-800/50 border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Live Detections</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {detections.length > 0 ? (
                  detections.map((detection, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                      <span className="text-white font-medium">{detection.label}</span>
                      <Badge variant="secondary">
                        {(detection.confidence * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-4">No objects detected</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Instructions */}
        <Card className="bg-slate-800/50 border-slate-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-3">Setup Instructions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-300">
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">1</div>
              <p>Place your best.pt file in backend/models/ directory</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">2</div>
              <p>Start the Flask backend server (python app.py)</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">3</div>
              <p>Grant camera permissions and start detection</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ObjectDetection;
