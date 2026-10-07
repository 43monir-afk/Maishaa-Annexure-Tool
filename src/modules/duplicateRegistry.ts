import { UploadedImageItem } from '../types/annexure';
import { normalizeTextForComparison } from './imageClassifier';

export function buildSourceKey(file: File): string {
  const normName = normalizeFilenameForAttachment(file.name);
  return `${normName}__${file.size}`;
}

/**
 * Normalizes filename for attachment key comparison:
 * Strips extension, accents, and punctuation while preserving numbers
 * (so page 1 vs page 2 or photo 1 vs photo 2 remain distinct).
 */
export function normalizeFilenameForAttachment(filename: string): string {
  if (!filename) return '';
  const withoutExt = filename.replace(/\.[a-zA-Z0-9]+$/i, '').trim();
  return withoutExt
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_/:,.;()[\]{}|’'“”]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes annexure heading / caption text for attachment key comparison:
 * Strips accents, punctuation, extra spaces, lowercases.
 */
export function normalizeHeadingForAttachment(heading: string): string {
  if (!heading) return '';
  return heading
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_/:,.;()[\]{}|’'“”]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rule 1: Add deduplication before attachment insertion.
 * Creates a unique attachment key using:
 * - normalized source filename
 * - target annexure heading
 * - optional target/paragraph index or code
 *
 * Example:
 * attachmentKey = normalizedFilename + "::" + normalizedHeading
 */
export function buildAttachmentKey(
  sourceFilename: string,
  targetHeading: string,
  _targetIndexOrCode?: string | number
): string {
  const normFile = normalizeFilenameForAttachment(sourceFilename);
  const normHeading = normalizeHeadingForAttachment(targetHeading);
  return `${normFile}::${normHeading}`;
}

export class DuplicateAssignmentRegistry {
  private usedImageIds: Set<string>;
  private usedSourceKeys: Set<string>;
  private attachedKeys: Set<string>;

  constructor() {
    this.usedImageIds = new Set<string>();
    this.usedSourceKeys = new Set<string>();
    this.attachedKeys = new Set<string>();
  }

  public isImageUsed(image: UploadedImageItem): boolean {
    return (
      this.usedImageIds.has(image.id) ||
      this.usedImageIds.has(image.originalSourceId) ||
      this.usedSourceKeys.has(image.sourceKey)
    );
  }

  public isAttachmentKeyUsed(key: string): boolean {
    return this.attachedKeys.has(key);
  }

  public markUsed(image: UploadedImageItem, heading?: string): void {
    this.usedImageIds.add(image.id);
    this.usedImageIds.add(image.originalSourceId);
    this.usedSourceKeys.add(image.sourceKey);
    if (heading) {
      this.attachedKeys.add(buildAttachmentKey(image.filename, heading));
    }
  }

  public release(image: UploadedImageItem, heading?: string): void {
    this.usedImageIds.delete(image.id);
    this.usedImageIds.delete(image.originalSourceId);
    this.usedSourceKeys.delete(image.sourceKey);
    if (heading) {
      this.attachedKeys.delete(buildAttachmentKey(image.filename, heading));
    }
  }

  public clear(): void {
    this.usedImageIds.clear();
    this.usedSourceKeys.clear();
    this.attachedKeys.clear();
  }
}

export function deduplicateUploadedImages(
  existing: UploadedImageItem[],
  incoming: UploadedImageItem[]
): {
  merged: UploadedImageItem[];
  skippedDuplicates: string[];
} {
  const seenKeys = new Set<string>(existing.map((i) => i.sourceKey));
  const merged = [...existing];
  const skippedDuplicates: string[] = [];

  for (const item of incoming) {
    if (seenKeys.has(item.sourceKey)) {
      skippedDuplicates.push(item.filename);
      continue;
    }
    seenKeys.add(item.sourceKey);
    merged.push(item);
  }

  return { merged, skippedDuplicates };
}
