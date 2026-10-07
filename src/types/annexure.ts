import JSZip from 'jszip';

export type CountryOption =
  | 'Auto Detect'
  | 'Finland'
  | 'Austria'
  | 'Italy'
  | 'Greece'
  | 'Other';

export type EffectiveCountry =
  | 'Finland'
  | 'Austria'
  | 'Italy'
  | 'Greece'
  | 'Other';

export type ImageSourceGroup = 'upload_copy' | 'applicant_copy';

export type ImageCategory =
  | 'Certificate'
  | 'Transcript'
  | 'Academic Record'
  | 'Passport'
  | 'Photograph'
  | 'Residence Photograph'
  | 'General Document Image';

export type ImageOrientation = 'Portrait' | 'Landscape';

export type TargetMatchStatus =
  | 'MATCHED'
  | 'PENDING'
  | 'MANUAL'
  | 'MANUAL_LATER'
  | 'REVIEW';

export type MatchConfidence = 'High' | 'Medium' | 'Low' | 'Manual';

export interface UploadedImageItem {
  id: string;
  sourceKey: string;
  originalSourceId: string;
  file: File;
  filename: string;
  normalizedName: string;
  source: ImageSourceGroup;
  sizeBytes: number;
  widthPx: number;
  heightPx: number;
  orientation: ImageOrientation;
  thumbUrl: string;
  inferredCategory: ImageCategory;
  isIgnoredBranding: boolean;
  plannedWidthIn: number;
  plannedHeightIn: number;
  estimatedCompressedBytes: number;
  optimizedBlob?: Blob;
  optimizedBytes?: number;
  optimizedWidthPx?: number;
  optimizedHeightPx?: number;
}

export interface ScannedAnnexureHeading {
  id: string;
  paragraphIndex: number;
  rawText: string;
  letter: string;
  headingKind: 'normal' | 'single_photo' | 'multi_photo_container';
  isPhotoContainer: boolean;
  isSinglePhotoAnnexure: boolean;
  categoryHint: 'referee' | 'applicant' | 'photograph' | 'general';
  childTargetsCount: number;
}

export interface AttachmentTarget {
  id: string;
  displayCode: string; // e.g. "A", "B", "G.1", "G.2", "N.1"
  targetKind: 'normal' | 'single_photo' | 'photo_child';
  parentHeadingId: string;
  parentHeadingText: string;
  isPhotoChild: boolean;
  isSinglePhotoTarget: boolean;
  paragraphIndex: number;
  rawText: string; // exact heading or photo caption text
  cleanMatchText: string; // stripped of "verified by..." for matching
  expectedSource: 'upload_copy' | 'applicant_copy' | 'any';
  assignedImageId: string | null;
  status: TargetMatchStatus;
  confidence: MatchConfidence;
  matchScore: number;
  matchReason: string;
  classification: ImageCategory;
  orientation: ImageOrientation | '—';
  plannedDimensionsLabel: string;
  borderPt: number;
}

export interface AdminSettingsConfig {
  adminEmail: string;
  austriaBorderPt: number;
  italyBorderPt: number;
  finlandBorderPt: number;
  greeceBorderPt: number;
  otherBorderPt: number;
  portraitWidthInches: number;
  portraitHeightInches: number;
  landscapeWidthInches: number;
  landscapeHeightInches: number;
  passportWidthInches: number;
  passportHeightInches: number;
  useExactVisa35x45mm: boolean;
  compressionThresholdKb: number;
  initialJpegQuality: number;
  maxDimensionPx: number;
  targetDocxMinMb: number;
  targetDocxMaxMb: number;
  allowDuplicateAssignmentOverride: boolean;
  debugLogging: boolean;
  adSlotKey: string;
}

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'MATCH' | 'SKIP DUPLICATE' | 'VALIDATION' | 'WARNING' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface OpenXmlValidationReport {
  isValid: boolean;
  zipOpens: boolean;
  contentTypesValid: boolean;
  documentXmlValid: boolean;
  relsXmlValid: boolean;
  uniqueRelIds: boolean;
  uniqueDocPrIds: boolean;
  allMediaFilesExist: boolean;
  insertedImagesCount: number;
  errors: string[];
}

export interface LoadedDocxState {
  file: File;
  filename: string;
  sizeBytes: number;
  zip: JSZip;
  documentXml: string;
  detectedCountry: EffectiveCountry;
  scannedHeadings: ScannedAnnexureHeading[];
  attachmentTargets: AttachmentTarget[];
  ignoredReferencesCount: number;
  excludedFooterParagraphsCount: number;
}
