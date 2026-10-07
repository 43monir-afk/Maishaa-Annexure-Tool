import {
  AdminSettingsConfig,
  ImageCategory,
  ImageOrientation,
  ImageSourceGroup,
  UploadedImageItem,
} from '../types/annexure';
import { buildSourceKey } from './duplicateRegistry';
import {
  classifyImageFile,
  detectOrientation,
  isBrandingOrLogoFile,
  normalizeTextForComparison,
} from './imageClassifier';

export interface PlannedDimensionResult {
  widthInches: number;
  heightInches: number;
  label: string;
}

/**
 * UPDATED CATEGORY-BASED IMAGE SIZE RULE:
 * 1. Certificate:
 *    - Portrait (height > width): H = 8.2", W = 5.8" (5,303,520 × 7,498,080 EMU)
 *    - Landscape (width > height): H = 4.4", W = 6.27" (5,733,288 × 4,023,360 EMU)
 * 2. Photograph (all other image/documents):
 *    - Landscape (width > height): H = 4.10", W = 5.44" (4,974,336 × 3,749,040 EMU)
 *    - Portrait (height >= width): H = 4.10", W = 3.08" (2,816,352 × 3,749,040 EMU)
 */
export function getFinalWordImageSize(
  category: ImageCategory | string,
  width: number,
  height: number
): { width: number; height: number; widthInches: number; heightInches: number; label: string } {
  const isLandscape = width > height;

  if (category === 'Certificate') {
    if (isLandscape) {
      // Landscape Certificate: H = 4.4", W = 6.27"
      return {
        width: 6.27,
        height: 4.4,
        widthInches: 6.27,
        heightInches: 4.4,
        label: '6.27" × 4.40"',
      };
    }

    // Portrait Certificate (height >= width): H = 8.2", W = 5.8"
    return {
      width: 5.8,
      height: 8.2,
      widthInches: 5.8,
      heightInches: 8.2,
      label: '5.80" × 8.20"',
    };
  }

  // Rule 4: All other documents are treated as Photograph with existing photograph image size
  if (isLandscape) {
    return {
      width: 5.44,
      height: 4.1,
      widthInches: 5.44,
      heightInches: 4.1,
      label: '5.44" × 4.10"',
    };
  }

  return {
    width: 3.08,
    height: 4.1,
    widthInches: 3.08,
    heightInches: 4.1,
    label: '3.08" × 4.10"',
  };
}

export function calculatePlannedDimensions(
  widthPx: number,
  heightPx: number,
  categoryOrIsPassport: ImageCategory | string | boolean,
  _settings?: AdminSettingsConfig
): PlannedDimensionResult {
  const category =
    typeof categoryOrIsPassport === 'boolean'
      ? categoryOrIsPassport
        ? 'Passport'
        : 'General Document Image'
      : categoryOrIsPassport;

  const finalSize = getFinalWordImageSize(category, widthPx, heightPx);
  return {
    widthInches: finalSize.widthInches,
    heightInches: finalSize.heightInches,
    label: finalSize.label,
  };
}

export async function inspectUploadedJpgFile(
  file: File,
  source: ImageSourceGroup,
  settings: AdminSettingsConfig
): Promise<UploadedImageItem> {
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.jpg') && !lowerName.endsWith('.jpeg')) {
    throw new Error(
      `Unsupported image format "${file.name}". Only .JPG and .JPEG files are supported.`
    );
  }

  const thumbUrl = URL.createObjectURL(file);

  const dimensions = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth || 1200,
          height: img.naturalHeight || 1600,
        });
      };
      img.onerror = () => {
        reject(new Error(`Failed to decode JPEG image "${file.name}".`));
      };
      img.src = thumbUrl;
    }
  );

  const orientation: ImageOrientation = detectOrientation(
    dimensions.width,
    dimensions.height
  );
  const inferredCategory = classifyImageFile(
    file.name,
    dimensions.width,
    dimensions.height
  );
  const isIgnoredBranding = isBrandingOrLogoFile(file.name);

  const planned = calculatePlannedDimensions(
    dimensions.width,
    dimensions.height,
    inferredCategory,
    settings
  );

  const thresholdBytes = settings.compressionThresholdKb * 1024;
  const estimatedCompressedBytes =
    file.size > thresholdBytes
      ? Math.round(Math.min(file.size * 0.52, 360 * 1024))
      : file.size;

  const uniqueId = `img_${source}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  return {
    id: uniqueId,
    sourceKey: buildSourceKey(file),
    originalSourceId: uniqueId,
    file,
    filename: file.name,
    normalizedName: normalizeTextForComparison(file.name),
    source,
    sizeBytes: file.size,
    widthPx: dimensions.width,
    heightPx: dimensions.height,
    orientation,
    thumbUrl,
    inferredCategory,
    isIgnoredBranding,
    plannedWidthIn: planned.widthInches,
    plannedHeightIn: planned.heightInches,
    estimatedCompressedBytes,
  };
}

export async function compressImageAdaptive(
  item: UploadedImageItem,
  totalMatchedImagesCount: number,
  settings: AdminSettingsConfig
): Promise<{
  blob: Blob;
  bytes: number;
  widthPx: number;
  heightPx: number;
}> {
  const thresholdBytes = settings.compressionThresholdKb * 1024;

  // Adaptive max pixel dimension based on total matched image count to hit 5–8 MB DOCX budget (Sections 23 & 24)
  let adaptiveMaxPx = settings.maxDimensionPx;
  if (totalMatchedImagesCount >= 20) {
    adaptiveMaxPx = Math.min(adaptiveMaxPx, 1280);
  } else if (totalMatchedImagesCount >= 14) {
    adaptiveMaxPx = Math.min(adaptiveMaxPx, 1600);
  }

  const exceedsThreshold = item.sizeBytes > thresholdBytes;
  const exceedsPixels =
    Math.max(item.widthPx, item.heightPx) > adaptiveMaxPx;

  if (!exceedsThreshold && !exceedsPixels) {
    return {
      blob: item.file,
      bytes: item.sizeBytes,
      widthPx: item.widthPx,
      heightPx: item.heightPx,
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let targetW = item.widthPx;
      let targetH = item.heightPx;

      if (Math.max(targetW, targetH) > adaptiveMaxPx) {
        if (targetW >= targetH) {
          targetW = adaptiveMaxPx;
          targetH = Math.round((item.heightPx * adaptiveMaxPx) / item.widthPx);
        } else {
          targetH = adaptiveMaxPx;
          targetW = Math.round((item.widthPx * adaptiveMaxPx) / item.heightPx);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(
          new Error(`Canvas 2D context unavailable for "${item.filename}".`)
        );
        return;
      }

      // High-quality bicubic-like downsampling, zero cropping or color manipulation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const startQuality = Math.max(
        0.65,
        Math.min(0.95, settings.initialJpegQuality)
      );

      canvas.toBlob(
        (firstBlob) => {
          if (!firstBlob) {
            reject(
              new Error(`JPEG compression failed for "${item.filename}".`)
            );
            return;
          }

          // If still above 450 KB and quality > 0.76, do one adaptive step at 0.78
          if (firstBlob.size > 450 * 1024 && startQuality > 0.78) {
            canvas.toBlob(
              (secondBlob) => {
                const finalBlob = secondBlob || firstBlob;
                resolve({
                  blob: finalBlob,
                  bytes: finalBlob.size,
                  widthPx: targetW,
                  heightPx: targetH,
                });
              },
              'image/jpeg',
              0.78
            );
          } else {
            resolve({
              blob: firstBlob,
              bytes: firstBlob.size,
              widthPx: targetW,
              heightPx: targetH,
            });
          }
        },
        'image/jpeg',
        startQuality
      );
    };
    img.onerror = () => {
      reject(
        new Error(
          `Image decode error during compression for "${item.filename}".`
        )
      );
    };
    img.src = item.thumbUrl;
  });
}
