
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Square, Zap, Cpu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [detections, setDetections] = useState<Detection[]>([]);
  const [modelStats, setModelStats] = useState<ModelStats>({
    fps: 0,
    inferenceTime: 0,
    detectionsCount: 0
  });
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Placeholder for model - in real implementation you'd load your model.json here
  const loadModel = useCallback(async () => {
    setIsModelLoading(true);
    try {
      // Simulate model loading - replace with actual model loading
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Model Loaded Successfully",
        description: "YOLOv8 model is ready for object detection",
      });
      
      setIsModelLoaded(true);
    } catch (error) {
      console.error('Error loading model:', error);
      toast({
        title: "Model Loading Failed",
        description: "Please check if your model files are accessible",
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
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment' // Use back camera on mobile
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
      setDetections([]);
    }
  }, [stream]);

  // Simulate object detection - replace with actual YOLOv8 inference
  const runDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) return;

    const startTime = performance.now();
    
    // Simulate detection results - replace with actual model inference
    const mockDetections: Detection[] = [
      {
        label: 'person',
        confidence: 0.85,
        box: { x: 100, y: 50, width: 120, height: 200 }
      },
      {
        label: 'phone',
        confidence: 0.72,
        box: { x: 300, y: 150, width: 80, height: 100 }
      }
    ];

    const inferenceTime = performance.now() - startTime;
    
    setDetections(mockDetections);
    setModelStats(prev => ({
      fps: Math.round(1000 / (performance.now() - startTime)),
      inferenceTime: Math.round(inferenceTime),
      detectionsCount: mockDetections.length
    }));

    // Draw bounding boxes
    drawDetections(mockDetections);
  }, [isModelLoaded]);

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

    const interval = setInterval(runDetection, 100); // 10 FPS
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
                  disabled={isModelLoading || isModelLoaded}
                  className="w-full"
                  variant={isModelLoaded ? "secondary" : "default"}
                >
                  {isModelLoading ? "Loading Model..." : isModelLoaded ? "Model Loaded" : "Load Model"}
                </Button>
                
                <Button
                  onClick={isCameraActive ? stopCamera : startCamera}
                  disabled={!isModelLoaded}
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
          <h3 className="text-xl font-semibold text-white mb-3">How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-300">
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">1</div>
              <p>Load your YOLOv8 model (replace with your model.json path)</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">2</div>
              <p>Grant camera permissions when prompted</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">3</div>
              <p>Watch real-time object detection with bounding boxes</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ObjectDetection;
