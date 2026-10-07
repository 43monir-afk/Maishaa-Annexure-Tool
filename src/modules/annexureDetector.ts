import {
  AdminSettingsConfig,
  AttachmentTarget,
  EffectiveCountry,
  ScannedAnnexureHeading,
} from '../types/annexure';
import { getBorderPtForCountry } from './adminConfig';
import { classifyTargetByText } from './imageClassifier';
import {
  isMultiPhotoContainerHeading,
  isReportBoundaryOrFooter,
  isSinglePhotoAnnexureHeading,
  isValidPhotoSubCaption,
} from './photoContainerParser';

export interface ParagraphNodeInfo {
  index: number;
  text: string;
}

const CROSS_REFERENCE_PREFIXES = [
  'refer annex',
  'as mentioned in annex',
  'see annex',
  'our annexure records',
  'report referring to annex',
  'please refer to annex',
];

export function isCrossReferenceParagraph(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return CROSS_REFERENCE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export function isStrictAnnexureHeading(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 6) return false;
  if (isCrossReferenceParagraph(trimmed)) return false;

  // Strict rule (Section 4): Valid Annexure heading must BEGIN with /^Annexure\b/i
  return /^Annexure\b/i.test(trimmed);
}

export function extractAnnexureLetter(headingText: string): string {
  // Matches "Annexure A:", "Annexure G: Photographs", "Annexure- O:", "Annexure N:"
  const match = headingText
    .trim()
    .match(/^Annexure\s*[-–—:.]?\s*([A-Za-z0-9]{1,3})\b/i);
  if (match && match[1]) {
    const token = match[1].toUpperCase();
    // Avoid returning "PHO" if heading is "Annexure - Photograph" without a letter
    if (
      token === 'PHO' ||
      token === 'PIC' ||
      token === 'DOC' ||
      token === 'COP'
    ) {
      return 'P';
    }
    return token;
  }
  return 'X';
}

export function stripVerifiedByClause(text: string): string {
  if (!text) return '';
  return text
    .replace(
      /\b(?:verified\s+by\s+(?:the\s+)?(?:referees?|kazi|registrar|chairman)|provided\s+by\s+(?:the\s+)?applicant|submitted\s+by\s+(?:the\s+)?applicant)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

export function determineExpectedSource(
  headingText: string,
  isPhotoChild: boolean
): 'upload_copy' | 'applicant_copy' | 'any' {
  const lower = headingText.toLowerCase();
  if (
    lower.includes('provided by the applicant') ||
    lower.includes('provide by the applicant') ||
    lower.includes('provided by applicant') ||
    lower.includes('submitted by the applicant') ||
    lower.includes('obtained from the applicant')
  ) {
    return 'applicant_copy';
  }
  if (
    lower.includes('verified by the referee') ||
    lower.includes('verified by referee') ||
    lower.includes('verified by the kazi') ||
    lower.includes('verified by kazi') ||
    lower.includes('extract from the marriage register') ||
    lower.includes('screenshot taken from national database')
  ) {
    return 'upload_copy';
  }
  if (isPhotoChild) {
    return 'any';
  }
  return 'any';
}

export interface AnnexureScanResult {
  scannedHeadings: ScannedAnnexureHeading[];
  attachmentTargets: AttachmentTarget[];
  ignoredReferencesCount: number;
  excludedFooterParagraphsCount: number;
}

export function detectAnnexuresAndTargets(
  paragraphs: ParagraphNodeInfo[],
  country: EffectiveCountry,
  settings: AdminSettingsConfig,
  uploadedFilenamesNormalized: string[] = []
): AnnexureScanResult {
  const scannedHeadings: ScannedAnnexureHeading[] = [];
  const attachmentTargets: AttachmentTarget[] = [];
  let ignoredReferencesCount = 0;
  let excludedFooterParagraphsCount = 0;

  let currentPhotoContainer: ScannedAnnexureHeading | null = null;
  let photoChildCounter = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const trimmed = p.text.trim();
    if (!trimmed) continue;

    if (isCrossReferenceParagraph(trimmed)) {
      ignoredReferencesCount++;
      continue;
    }

    if (isStrictAnnexureHeading(trimmed)) {
      const letter = extractAnnexureLetter(trimmed);
      const isPhotoContainer = isMultiPhotoContainerHeading(trimmed);
      const isSinglePhotoAnnexure =
        !isPhotoContainer && isSinglePhotoAnnexureHeading(trimmed);
      const headingKind: ScannedAnnexureHeading['headingKind'] =
        isPhotoContainer
          ? 'multi_photo_container'
          : isSinglePhotoAnnexure
          ? 'single_photo'
          : 'normal';
      const headingId = `heading_${p.index}`;

      const lower = trimmed.toLowerCase();
      let categoryHint: ScannedAnnexureHeading['categoryHint'] = 'general';
      if (isPhotoContainer || isSinglePhotoAnnexure) {
        categoryHint = 'photograph';
      } else if (
        lower.includes('provided by the applicant') ||
        lower.includes('provided by applicant')
      ) {
        categoryHint = 'applicant';
      } else if (lower.includes('referee')) {
        categoryHint = 'referee';
      }

      const headingObj: ScannedAnnexureHeading = {
        id: headingId,
        paragraphIndex: p.index,
        rawText: trimmed,
        letter,
        headingKind,
        isPhotoContainer,
        isSinglePhotoAnnexure,
        categoryHint,
        childTargetsCount: 0,
      };
      scannedHeadings.push(headingObj);

      if (isPhotoContainer) {
        // Multi-Photo Container heading itself NEVER receives an image (Section 6)
        currentPhotoContainer = headingObj;
        photoChildCounter = 0;
      } else {
        // Both Normal Annexure and Single-Photo Annexure ("Annexure B: Photograph of Sreemangal Pourashava (Municipality)")
        // become 1 direct attachment target and NEVER create child captions.
        currentPhotoContainer = null;
        const classification = classifyTargetByText(
          trimmed,
          isSinglePhotoAnnexure
        );
        const borderPt = getBorderPtForCountry(country, trimmed, settings);

        attachmentTargets.push({
          id: `target_${p.index}`,
          displayCode: letter,
          targetKind: isSinglePhotoAnnexure ? 'single_photo' : 'normal',
          parentHeadingId: headingId,
          parentHeadingText: trimmed,
          isPhotoChild: false,
          isSinglePhotoTarget: isSinglePhotoAnnexure,
          paragraphIndex: p.index,
          rawText: trimmed,
          cleanMatchText: stripVerifiedByClause(trimmed),
          expectedSource: determineExpectedSource(
            trimmed,
            isSinglePhotoAnnexure
          ),
          assignedImageId: null,
          status: 'PENDING',
          confidence: 'Low',
          matchScore: 0,
          matchReason: isSinglePhotoAnnexure
            ? 'Waiting for single-photo match'
            : 'Waiting for image match',
          classification,
          orientation: '—',
          plannedDimensionsLabel:
            classification === 'Certificate'
              ? '5.80" × 8.20"'
              : isSinglePhotoAnnexure
              ? '5.44" × 4.10"'
              : '3.08" × 4.10"',
          borderPt,
        });
      }
      continue;
    }

    // If inside a Photograph Annexure Container, check if this paragraph is a valid photo caption or a boundary
    if (currentPhotoContainer) {
      if (
        trimmed.toLowerCase() === '[attachment area]' ||
        trimmed.toLowerCase() === '[image]'
      ) {
        continue;
      }

      if (isReportBoundaryOrFooter(trimmed)) {
        excludedFooterParagraphsCount++;
        // Stop collecting photo captions once report closing/footer prose starts (Section 8)
        currentPhotoContainer = null;
        continue;
      }

      if (isValidPhotoSubCaption(trimmed, uploadedFilenamesNormalized)) {
        photoChildCounter++;
        currentPhotoContainer.childTargetsCount = photoChildCounter;
        const childCode = `${currentPhotoContainer.letter}.${photoChildCounter}`;
        const classification = classifyTargetByText(trimmed, true);
        const borderPt = getBorderPtForCountry(country, trimmed, settings);

        attachmentTargets.push({
          id: `target_${currentPhotoContainer.id}_${photoChildCounter}_p${p.index}`,
          displayCode: childCode,
          targetKind: 'photo_child',
          parentHeadingId: currentPhotoContainer.id,
          parentHeadingText: currentPhotoContainer.rawText,
          isPhotoChild: true,
          isSinglePhotoTarget: false,
          paragraphIndex: p.index,
          rawText: trimmed,
          cleanMatchText: stripVerifiedByClause(trimmed),
          expectedSource: 'any',
          assignedImageId: null,
          status: 'PENDING',
          confidence: 'Low',
          matchScore: 0,
          matchReason: 'Waiting for photograph match',
          classification,
          orientation: '—',
          plannedDimensionsLabel: '5.44" × 4.10"',
          borderPt,
        });
      } else {
        // Paragraph has no photo/person/location signal and no filename match -> stop treating following prose as captions
        excludedFooterParagraphsCount++;
        currentPhotoContainer = null;
      }
    }
  }

  return {
    scannedHeadings,
    attachmentTargets,
    ignoredReferencesCount,
    excludedFooterParagraphsCount,
  };
}
