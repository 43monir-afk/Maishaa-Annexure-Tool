import {
  AdminSettingsConfig,
  AttachmentTarget,
  EffectiveCountry,
  MatchConfidence,
  UploadedImageItem,
} from '../types/annexure';
import { getBorderPtForCountry } from './adminConfig';
import {
  buildAttachmentKey,
  DuplicateAssignmentRegistry,
} from './duplicateRegistry';
import {
  normalizeTextForComparison,
  resolveEffectiveCategory,
} from './imageClassifier';
import { calculatePlannedDimensions } from './imageProcessor';

// Canonical spelling normalization for fuzzy aliases (Section 10)
function canonicalizeSpellingVariants(normStr: string): string {
  return normStr
    .replace(/\baustia\b/g, 'austria')
    .replace(/\bahmmed\b/g, 'ahmed')
    .replace(/\bahmed\b/g, 'ahmed')
    .replace(/\bfaher\b/g, 'father')
    .replace(/\bmunshigonj\b/g, 'munshiganj')
    .replace(/\bmunsiganj\b/g, 'munshiganj')
    .replace(/\bcomilla\b/g, 'cumilla')
    .replace(/\bchittagong\b/g, 'chattogram')
    .replace(/\bnikah nama\b/g, 'nikahnama')
    .replace(/\bmark sheet\b/g, 'marksheet');
}

const MUTUALLY_EXCLUSIVE_PAIRS: [string, string][] = [
  ['english', 'bangla'],
  ['official transcript', 'transcript details'],
  ['certificate', 'transcript'],
  ['rented residence', 'flat residence'],
  ['first entry', 'last entry'],
  ['ishtiaque', 'iqbal'],
];

function hasQualifierConflict(targetNorm: string, fileNorm: string): boolean {
  for (const [termA, termB] of MUTUALLY_EXCLUSIVE_PAIRS) {
    const targetHasA = targetNorm.includes(termA);
    const targetHasB = targetNorm.includes(termB);
    const fileHasA = fileNorm.includes(termA);
    const fileHasB = fileNorm.includes(termB);

    // Only flag conflict if one side has strictly A (and not B) while the other has strictly B (and not A)
    if (targetHasA && !targetHasB && fileHasB && !fileHasA) return true;
    if (targetHasB && !targetHasA && fileHasA && !fileHasB) return true;
  }
  return false;
}

function extractPageNumber(str: string): number | null {
  // Matches "Page 01 of 02", "Page 1", "(1)", "(2)", "p-01"
  const pageExplicit = str.match(/\b(?:page|pg|p)\s*[-_.:]?\s*0*(\d+)\b/i);
  if (pageExplicit && pageExplicit[1]) {
    return parseInt(pageExplicit[1], 10);
  }
  const parenMatch = str.match(/\(0*(\d+)\)/);
  if (parenMatch && parenMatch[1]) {
    return parseInt(parenMatch[1], 10);
  }
  return null;
}

function extractAnnexureCodeFromFilename(filename: string): string | null {
  // Matches "Annexure A", "G.1", "G-1", "N.4", "N_4"
  const explicitAnnex = filename.match(
    /\b(?:annex(?:ure)?|anx)\s*[-_.:]?\s*([a-zA-Z](?:[._-]\d+)?)\b/i
  );
  if (explicitAnnex && explicitAnnex[1]) {
    return explicitAnnex[1].toUpperCase().replace(/[_-]/g, '.');
  }
  const dotCode = filename.match(/^([a-zA-Z])[._-](\d+)\b/);
  if (dotCode) {
    return `${dotCode[1].toUpperCase()}.${dotCode[2]}`;
  }
  return null;
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'his',
  'her',
  'our',
  'copy',
  'of',
  'by',
  'in',
  'at',
  'to',
  'from',
  'collected',
  'during',
  'visit',
  'annexure',
]);

function computeLevenshteinRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const lenA = a.length;
  const lenB = b.length;
  const maxLen = Math.max(lenA, lenB);
  if (maxLen === 0) return 1;
  if (Math.abs(lenA - lenB) > maxLen * 0.45) return 0;

  const dp: number[][] = Array.from({ length: lenA + 1 }, () =>
    new Array(lenB + 1).fill(0)
  );
  for (let i = 0; i <= lenA; i++) dp[i][0] = i;
  for (let j = 0; j <= lenB; j++) dp[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return 1 - dp[lenA][lenB] / maxLen;
}

interface CandidateMatchPair {
  targetIndex: number;
  image: UploadedImageItem;
  score: number;
  confidence: MatchConfidence;
  reason: string;
}

export function runMultiFactorAutoMatcher(
  targets: AttachmentTarget[],
  images: UploadedImageItem[],
  country: EffectiveCountry,
  settings: AdminSettingsConfig
): {
  updatedTargets: AttachmentTarget[];
  logs: { level: 'MATCH' | 'SKIP DUPLICATE' | 'INFO'; message: string }[];
} {
  const registry = new DuplicateAssignmentRegistry();
  const logs: { level: 'MATCH' | 'SKIP DUPLICATE' | 'INFO'; message: string }[] =
    [];

  // Preserve manual overrides first and register their images as used
  const workingTargets: AttachmentTarget[] = targets.map((t) => {
    const borderPt = getBorderPtForCountry(country, t.rawText, settings);
    if (t.status === 'MANUAL_LATER') {
      return {
        ...t,
        assignedImageId: null,
        status: 'MANUAL_LATER',
        confidence: 'Manual',
        matchScore: 0,
        matchReason: 'Left for manual attachment in Word',
        orientation: '—',
        borderPt,
      };
    }
    if (t.status === 'MANUAL' && t.assignedImageId) {
      const manualImg = images.find((img) => img.id === t.assignedImageId);
      if (manualImg && !manualImg.isIgnoredBranding) {
        const headingText = t.rawText || t.parentHeadingText || t.cleanMatchText;
        const attachmentKey = buildAttachmentKey(manualImg.filename, headingText, t.paragraphIndex);

        // One source file/document = exactly ONE attachment
        if (registry.isImageUsed(manualImg) || registry.isAttachmentKeyUsed(attachmentKey)) {
          return {
            ...t,
            assignedImageId: null,
            status: 'PENDING',
            confidence: 'Low',
            matchScore: 0,
            matchReason: 'Duplicate manual assignment released',
            orientation: '—',
            borderPt,
          };
        }

        registry.markUsed(manualImg, headingText);
        const effectiveCat = resolveEffectiveCategory(
          t.classification,
          manualImg.inferredCategory,
          t.isPhotoChild
        );
        const planned = calculatePlannedDimensions(
          manualImg.widthPx,
          manualImg.heightPx,
          effectiveCat,
          settings
        );
        return {
          ...t,
          borderPt,
          orientation: manualImg.orientation,
          plannedDimensionsLabel: planned.label,
        };
      }
    }
    return {
      ...t,
      assignedImageId: null,
      status: 'PENDING',
      confidence: 'Low',
      matchScore: 0,
      matchReason: 'Unassigned',
      orientation: '—',
      borderPt,
    };
  });

  const activeImages = images.filter((img) => !img.isIgnoredBranding);
  if (activeImages.length === 0 || workingTargets.length === 0) {
    return { updatedTargets: workingTargets, logs };
  }

  const candidatePairs: CandidateMatchPair[] = [];

  workingTargets.forEach((target, targetIndex) => {
    if (target.status === 'MANUAL' || target.status === 'MANUAL_LATER') return;

    // Strip "Annexure X:" prefix from cleanMatchText for pure content comparison
    const strippedHeadingPrefix = target.cleanMatchText
      .replace(/^Annexure\s*[-–—:.]?\s*[A-Za-z0-9]{1,3}\s*[-–—:.]?\s*/i, '')
      .trim();

    const targetNorm = canonicalizeSpellingVariants(
      normalizeTextForComparison(strippedHeadingPrefix || target.cleanMatchText)
    );
    const targetFullNorm = canonicalizeSpellingVariants(
      normalizeTextForComparison(target.cleanMatchText)
    );
    const targetPage = extractPageNumber(target.rawText);

    const targetTokens = targetNorm
      .split(' ')
      .filter((tok) => tok.length > 2 && !STOP_WORDS.has(tok));

    for (const img of activeImages) {
      // Rule (Section 17 & 43): Under Photograph Annexure sections, do NOT attach certificate/transcript/passport scans unless caption explicitly mentions them
      if (target.isPhotoChild) {
        const isDocScan =
          img.inferredCategory === 'Certificate' ||
          img.inferredCategory === 'Transcript' ||
          img.inferredCategory === 'Academic Record' ||
          img.inferredCategory === 'Passport';
        const captionAllowsDoc =
          targetNorm.includes('certificate') ||
          targetNorm.includes('transcript') ||
          targetNorm.includes('passport');
        if (isDocScan && !captionAllowsDoc) {
          continue;
        }
      }

      // Source Priority & Restriction rule:
      // Applicant Copy images are only meant for "Provided by the Applicant" targets (or when explicitly matching)
      if (
        img.source === 'applicant_copy' &&
        target.expectedSource === 'upload_copy'
      ) {
        continue;
      }
      if (
        img.source === 'upload_copy' &&
        target.expectedSource === 'applicant_copy'
      ) {
        // Upload copy shouldn't steal "Provided by the Applicant" target if Applicant Copy has it, unless no applicant copy exists
        const hasApplicantCopyPool = activeImages.some(
          (i) => i.source === 'applicant_copy'
        );
        if (hasApplicantCopyPool) {
          continue;
        }
      }

      const fileNormRaw = normalizeTextForComparison(img.filename);
      // Strip page suffix like "(1)" from filename for base text comparison
      const fileNormWithoutParen = fileNormRaw
        .replace(/\b0*\d+\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const fileNorm = canonicalizeSpellingVariants(fileNormRaw);
      const filePage = extractPageNumber(img.filename);
      const fileCode = extractAnnexureCodeFromFilename(img.filename);

      // Page number mismatch guard: if both specify page numbers and they differ, skip!
      if (
        targetPage !== null &&
        filePage !== null &&
        targetPage !== filePage
      ) {
        continue;
      }

      // Mutually exclusive qualifier guard (e.g., English vs Bangla, Official Transcript vs Transcript Details, Ishtiaque vs Iqbal)
      if (hasQualifierConflict(targetNorm, fileNorm)) {
        continue;
      }

      let score = 0;
      let reason = '';

      // Factor A: Explicit Annexure / Sub-caption Code Match (e.g., G.1, N.3, Annexure A)
      if (fileCode && fileCode === target.displayCode.toUpperCase()) {
        score = 0.99;
        reason = `Code match [${target.displayCode}]`;
      }
      // Factor B: Exact normalized filename === caption/heading text
      else if (
        fileNorm.length >= 4 &&
        (fileNorm === targetNorm || fileNorm === targetFullNorm)
      ) {
        score = 0.98;
        reason = 'Exact normalized filename match';
      }
      // Factor C: Substring Containment + Page Number Boost
      else if (
        fileNorm.length >= 6 &&
        (targetNorm.includes(fileNorm) || fileNorm.includes(targetNorm))
      ) {
        score = 0.91;
        reason = 'Direct phrase containment';
        if (targetPage !== null && filePage === targetPage) {
          score = 0.96;
          reason = `Phrase + Page 0${targetPage} match`;
        }
      } else if (
        fileNormWithoutParen.length >= 6 &&
        targetNorm.includes(fileNormWithoutParen) &&
        targetPage !== null &&
        filePage === targetPage
      ) {
        score = 0.95;
        reason = `Document title + Page 0${targetPage} match`;
      } else {
        // Factor D/E/F: Token overlap + Person / Relationship / Location / Fuzzy similarity
        const fileTokens = fileNorm
          .split(' ')
          .filter((tok) => tok.length > 2 && !STOP_WORDS.has(tok));

        if (fileTokens.length > 0 && targetTokens.length > 0) {
          let matchedTokensCount = 0;
          const matchedWords: string[] = [];

          for (const fTok of fileTokens) {
            const exactOrFuzzy = targetTokens.find(
              (tTok) =>
                tTok === fTok || computeLevenshteinRatio(tTok, fTok) >= 0.82
            );
            if (exactOrFuzzy) {
              matchedTokensCount++;
              matchedWords.push(fTok);
            }
          }

          const overlapRatio =
            matchedTokensCount /
            Math.max(1, Math.min(fileTokens.length, targetTokens.length));

          if (matchedTokensCount >= 2 && overlapRatio >= 0.5) {
            score = 0.72 + overlapRatio * 0.2;
            if (targetPage !== null && filePage === targetPage) {
              score += 0.05;
            }
            reason = `Token overlap (${matchedWords.slice(0, 4).join(', ')})`;
          } else if (matchedTokensCount === 1 && fileTokens.length === 1) {
            const singleWord = matchedWords[0];
            if (singleWord.length >= 6) {
              score = 0.68;
              reason = `Keyword match (${singleWord})`;
            }
          }
        }

        // Fuzzy string similarity fallback (Section 10)
        if (score < 0.65) {
          const lev = computeLevenshteinRatio(fileNorm, targetNorm);
          if (lev >= 0.76) {
            score = lev * 0.9;
            reason = 'Fuzzy spelling similarity';
          }
        }
      }

      // Source Priority Bonus (Section 2: Upload Copy is primary unless target expects Applicant Copy)
      if (score >= 0.62) {
        if (
          target.expectedSource === 'applicant_copy' &&
          img.source === 'applicant_copy'
        ) {
          score += 0.02;
        } else if (
          target.expectedSource !== 'applicant_copy' &&
          img.source === 'upload_copy'
        ) {
          score += 0.01;
        }

        const confidence: MatchConfidence =
          score >= 0.85 ? 'High' : score >= 0.72 ? 'Medium' : 'Low';

        candidatePairs.push({
          targetIndex,
          image: img,
          score: Math.min(0.999, score),
          confidence,
          reason,
        });
      }
    }
  });

  // Sort candidates highest score first for strict 1-to-1 assignment (Section 11 & 55)
  candidatePairs.sort((a, b) => b.score - a.score);

  const assignedTargetIndices = new Set<number>();

  for (const pair of candidatePairs) {
    if (assignedTargetIndices.has(pair.targetIndex)) {
      continue;
    }

    const target = workingTargets[pair.targetIndex];
    const headingText = target.rawText || target.parentHeadingText || target.cleanMatchText;
    const attachmentKey = buildAttachmentKey(
      pair.image.filename,
      headingText,
      target.paragraphIndex
    );

    if (registry.isImageUsed(pair.image) || registry.isAttachmentKeyUsed(attachmentKey)) {
      logs.push({
        level: 'SKIP DUPLICATE',
        message: `[${target.displayCode}] "${pair.image.filename}" already assigned or duplicate attachment. Skipping duplicate assignment.`,
      });
      continue;
    }

    // Claim image in registry
    registry.markUsed(pair.image, headingText);
    assignedTargetIndices.add(pair.targetIndex);
    const effectiveCat = resolveEffectiveCategory(
      target.classification,
      pair.image.inferredCategory,
      target.isPhotoChild
    );

    const planned = calculatePlannedDimensions(
      pair.image.widthPx,
      pair.image.heightPx,
      effectiveCat,
      settings
    );

    workingTargets[pair.targetIndex] = {
      ...target,
      assignedImageId: pair.image.id,
      status: pair.confidence === 'Low' ? 'REVIEW' : 'MATCHED',
      confidence: pair.confidence,
      matchScore: Number((pair.score * 100).toFixed(0)),
      matchReason: pair.reason,
      orientation: pair.image.orientation,
      plannedDimensionsLabel: planned.label,
    };

    logs.push({
      level: 'MATCH',
      message: `${target.displayCode} -> ${pair.image.filename} (${pair.confidence} confidence · ${pair.reason})`,
    });
  }

  return { updatedTargets: workingTargets, logs };
}
