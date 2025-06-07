
export const captureFrameAsBase64 = (video: HTMLVideoElement): string => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Convert to base64 (without the data:image/jpeg;base64, prefix)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  return dataUrl;
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
    
    img.src = imageBase64;
  });
};
