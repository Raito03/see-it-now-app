
export const captureFrameAsBase64 = (video: HTMLVideoElement): string => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Return data URL without the prefix
  return canvas.toDataURL('image/jpeg').split(',')[1];
};

export const resizeImageForDetection = (imageBase64: string, maxWidth: number = 640): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(imageBase64);
        return;
      }
      
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth) {
        const scale = maxWidth / width;
        width = maxWidth;
        height = height * scale;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert back to base64
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    
    img.src = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
  });
};

export const drawBoundingBoxes = (
  canvas: HTMLCanvasElement,
  detections: Array<{
    label: string;
    confidence: number;
    bbox: [number, number, number, number];
  }>
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  detections.forEach(detection => {
    const [x1, y1, x2, y2] = detection.bbox;
    const width = x2 - x1;
    const height = y2 - y1;
    
    // Draw bounding box
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, width, height);
    
    // Draw label background
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(x1, y1 - 25, 150, 25);
    
    // Draw label text
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.fillText(`${detection.label} ${(detection.confidence * 100).toFixed(1)}%`, x1 + 5, y1 - 8);
  });
};
