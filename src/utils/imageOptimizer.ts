/**
 * Image Optimizer for MINES AI Computer Vision
 * Downscales high-resolution smartphone screenshots (e.g. 4000x3000, 10MB)
 * to an optimal ~1200px max dimension, preserving high edge contrast and crisp
 * board grid detail for Gemini Vision while dropping payload size from 10MB to <250KB.
 */

export interface OptimizedImageResult {
  dataUrl: string;
  base64: string;
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  originalSizeKb: number;
  optimizedSizeKb: number;
}

export async function optimizeScreenshotForVision(
  source: File | string,
  maxDimension: number = 1200,
  quality: number = 0.88
): Promise<OptimizedImageResult> {
  return new Promise((resolve, reject) => {
    let sourceDataUrl = '';
    let originalSizeKb = 0;

    const proceedWithDataUrl = (dataUrl: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const origW = img.naturalWidth || img.width;
          const origH = img.naturalHeight || img.height;

          let targetW = origW;
          let targetH = origH;

          if (origW > maxDimension || origH > maxDimension) {
            if (origW >= origH) {
              targetW = maxDimension;
              targetH = Math.round((origH * maxDimension) / origW);
            } else {
              targetH = maxDimension;
              targetW = Math.round((origW * maxDimension) / origH);
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            // Fallback: return source if canvas 2D is unavailable
            const clean = dataUrl.replace(/^data:[^;]+;base64,/, '');
            resolve({
              dataUrl,
              base64: clean,
              mimeType: 'image/jpeg',
              originalWidth: origW,
              originalHeight: origH,
              width: origW,
              height: origH,
              originalSizeKb,
              optimizedSizeKb: Math.round(clean.length * 0.75 / 1024),
            });
            return;
          }

          // Use high quality image smoothing for sharp grid line detection
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Fill black background first in case of transparent PNGs
          ctx.fillStyle = '#060913';
          ctx.fillRect(0, 0, targetW, targetH);

          // Draw scaled screenshot
          ctx.drawImage(img, 0, 0, targetW, targetH);

          const outputMime = 'image/jpeg';
          const optimizedDataUrl = canvas.toDataURL(outputMime, quality);
          const optimizedBase64 = optimizedDataUrl.replace(/^data:[^;]+;base64,/, '');
          const optKb = Math.round((optimizedBase64.length * 0.75) / 1024);

          resolve({
            dataUrl: optimizedDataUrl,
            base64: optimizedBase64,
            mimeType: outputMime,
            originalWidth: origW,
            originalHeight: origH,
            width: targetW,
            height: targetH,
            originalSizeKb: originalSizeKb || Math.round((dataUrl.length * 0.75) / 1024),
            optimizedSizeKb: optKb,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('No se pudo cargar la imagen para su optimización'));
      };

      img.src = dataUrl;
    };

    if (typeof source === 'string') {
      sourceDataUrl = source;
      originalSizeKb = Math.round((source.length * 0.75) / 1024);
      proceedWithDataUrl(sourceDataUrl);
    } else {
      originalSizeKb = Math.round(source.size / 1024);
      const reader = new FileReader();
      reader.onload = () => {
        sourceDataUrl = reader.result as string;
        proceedWithDataUrl(sourceDataUrl);
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'));
      reader.readAsDataURL(source);
    }
  });
}
