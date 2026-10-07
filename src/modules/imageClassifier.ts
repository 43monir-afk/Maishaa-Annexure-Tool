import { ImageCategory, ImageOrientation } from '../types/annexure';

export function normalizeTextForComparison(input: string): string {
  if (!input) return '';
  const withoutExt = input.replace(/\.(jpg|jpeg|docx|doc)$/i, '');
  const normalizedUnicode = withoutExt
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalizedUnicode
    .replace(/[-_/:,.;()[\]{}|’'“”]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function isBrandingOrLogoFile(filename: string): boolean {
  const norm = normalizeTextForComparison(filename);
  return (
    norm === 'logo' ||
    norm.startsWith('logo ') ||
    norm.endsWith(' logo') ||
    norm === 'watermark' ||
    norm === 'icon' ||
    norm === 'header logo'
  );
}

/**
 * Checks if a document or filename is classified as a Certificate.
 * RULES:
 * 1. Document / file name ending with "certificate" (case-insensitive).
 * 2. Document / file name containing:
 *    - Nikahnama
 *    - Nika Nama
 *    - Nikah Nama
 *    - Extract
 *    - Extraxt
 */
export function isCertificateDocument(nameOrText: string): boolean {
  if (!nameOrText) return false;
  // Strip file extension if present (.jpg, .jpeg, .png, .docx, .doc, etc.)
  const withoutExt = nameOrText.replace(/\.[a-zA-Z0-9]+$/i, '').trim();

  // Normalize Unicode accents and punctuation
  const lower = withoutExt
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_/:,.;()[\]{}|’'“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!lower) return false;

  // Rule 2: Case-insensitive matching for:
  // - Nikahnama
  // - Nika Nama
  // - Nikah Nama
  // - Extract
  // - Extraxt
  if (
    lower.includes('nikahnama') ||
    lower.includes('nikah nama') ||
    lower.includes('nika nama') ||
    lower.includes('extract') ||
    lower.includes('extraxt')
  ) {
    return true;
  }

  // Rule 1: Document/file name ending with "certificate" (case-insensitive)
  if (
    lower === 'certificate' ||
    lower.endsWith(' certificate') ||
    lower.endsWith('certificate')
  ) {
    return true;
  }

  // Also handle trailing numbers, page numbers, or copy markers like "(1)", "copy", "scan"
  const strippedTrailing = lower
    .replace(/\s+(?:\d+|\(\d+\)|copy|scan|page\s*\d+|p\s*\d+)\s*$/i, '')
    .trim();
  if (
    strippedTrailing === 'certificate' ||
    strippedTrailing.endsWith(' certificate') ||
    strippedTrailing.endsWith('certificate')
  ) {
    return true;
  }

  return false;
}

export function classifyTargetByText(
  text: string,
  _isPhotoChild?: boolean
): ImageCategory {
  if (isCertificateDocument(text)) {
    return 'Certificate';
  }

  // Rule 4: All other image/documents are counted as Photograph
  return 'Photograph';
}

export function classifyImageFile(
  filename: string,
  _widthPx?: number,
  _heightPx?: number
): ImageCategory {
  if (isCertificateDocument(filename)) {
    return 'Certificate';
  }

  // Rule 4: All other image/documents are counted as Photograph
  return 'Photograph';
}

/**
 * Resolves the effective category between an Annexure Target and a matched Image
 * following strict Category Priority:
 * 1. Certificate (if target or image is Certificate)
 * 2. Photograph (all other image/documents)
 */
export function resolveEffectiveCategory(
  targetCategory: ImageCategory | string,
  imageCategory?: ImageCategory | string,
  isPhotoChild?: boolean
): ImageCategory {
  if (isPhotoChild) {
    return 'Photograph';
  }
  if (targetCategory === 'Certificate' || imageCategory === 'Certificate') {
    return 'Certificate';
  }
  return 'Photograph';
}

export function detectOrientation(
  widthPx: number,
  heightPx: number
): ImageOrientation {
  return widthPx > heightPx ? 'Landscape' : 'Portrait';
}
