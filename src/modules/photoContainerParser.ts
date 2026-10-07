// Photograph Annexure Container & Caption Boundary Engine (Sections 6, 7, 8)

const REPORT_CLOSING_BOUNDARIES = [
  'restrictions & limitations',
  'restrictions and limitations',
  'our reports and comments are confidential',
  'our report and comments are confidential',
  'our report is confidential',
  'this report is confidential',
  'confidential in nature',
  'verification result',
  'spot inspection',
  'mode of verification',
  'information provided',
  'findings from the site checks',
  'findings from site checks',
  'conclusion',
  'remarks:',
  'comments:',
  'observation:',
  'findings:',
  'recommendation:',
  'declaration:',
  'disclaimer',
  'signature',
  'prepared by',
  'verified by:',
  'submitted by',
  'copyright',
  'page number',
  'end of report',
];

const PERSON_RELATIONSHIP_KEYWORDS = [
  'applicant',
  'husband',
  'wife',
  'father',
  'faher',
  'mother',
  'son',
  'sons',
  'daughter',
  'daughters',
  'brother',
  'sister',
  'aunt',
  'uncle',
  'nephew',
  'niece',
  'family',
  'marriage',
  'couple',
  'paternal',
  'maternal',
  'in law',
  'in-law',
  'sponsor',
  'neighbor',
  'neighbour',
];

const PHOTO_CONTEXT_KEYWORDS = [
  'photograph',
  'photo',
  'collected during our visit',
  'taken during our visit',
  'during our visit',
  'picture of',
];

const LOCATION_KEYWORDS = [
  'residence',
  'rented residence',
  'flat residence',
  'house',
  'address',
  'sold address',
  'road',
  'village',
  'police station',
  'district',
  'city',
  'corporation',
  'villa',
  'project',
  'thakurpara',
  'sadar',
  'chayabithi',
];

function extractHeadingBodyAfterAnnexurePrefix(headingText: string): string {
  // Strip leading "Annexure [Code/Letter]:" or "Annexure -" prefix and trailing punctuation
  return headingText
    .trim()
    .replace(
      /^Annexure\s*[-–—:.]?\s*(?:[A-Za-z0-9]{1,3}\s*[-–—:.]?\s*)?/i,
      ''
    )
    .replace(/[.:;\-–—]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * MULTI-PHOTO CONTAINER DETECTION:
 * Returns true ONLY when the heading after the Annexure prefix is a general category
 * such as "Photographs", "Photos", "Photograph", "Photo" with no specific subject after it.
 * Examples:
 * - "Annexure E: Photographs" -> true
 * - "Annexure G: Photographs" -> true
 * - "Annexure N: Photographs" -> true
 * - "Annexure H - Photos" -> true
 * - "Annexure B: Photograph of Sreemangal Pourashava (Municipality)" -> false
 */
export function isMultiPhotoContainerHeading(headingText: string): boolean {
  const body = extractHeadingBodyAfterAnnexurePrefix(headingText);
  if (!body) return false;
  return /^(?:photographs|photograph|photos|photo)$/i.test(body);
}

/**
 * SINGLE-PHOTO ANNEXURE DETECTION:
 * Returns true when the Annexure heading explicitly describes a specific photo subject
 * (e.g., "Annexure B: Photograph of Sreemangal Pourashava (Municipality)",
 * "Annexure C: Photograph of Office Building", "Photo of Residence", "Photograph of Applicant").
 * Such a heading is ONE direct attachment target and must NOT create child captions.
 */
export function isSinglePhotoAnnexureHeading(headingText: string): boolean {
  if (isMultiPhotoContainerHeading(headingText)) {
    return false;
  }
  const body = extractHeadingBodyAfterAnnexurePrefix(headingText);
  if (!body) return false;

  // Starts with or contains Photograph/Photo followed by a specific subject ("of ...", "-", ":", or descriptive words)
  return /\b(?:photograph|photographs|photo|photos)\b\s+(?:of|showing|depicting|at|in|from|taken|collected|[-–—:])|\b(?:photograph|photo)\s+\w+/i.test(
    body
  );
}

// Keep backward-compatible alias pointing strictly to Multi-Photo Container
export function isPhotoContainerHeading(headingText: string): boolean {
  return isMultiPhotoContainerHeading(headingText);
}

export function isReportBoundaryOrFooter(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();

  if (
    lower === '[attachment area]' ||
    lower === '[image]' ||
    lower === '[photo]'
  ) {
    return false;
  }

  for (const marker of REPORT_CLOSING_BOUNDARIES) {
    if (lower.startsWith(marker) || lower.includes(marker)) {
      return true;
    }
  }

  // Also stop if a single word heading like "Conclusion" or "Remarks" appears alone
  if (
    /^(conclusion|remarks|comments|observation|findings|recommendation|declaration|disclaimer|signature|confidential)$/i.test(
      trimmed
    )
  ) {
    return true;
  }

  return false;
}

export function isValidPhotoSubCaption(
  text: string,
  uploadedFilenamesNormalized: string[] = []
): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 4 || trimmed.length > 300) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower === '[attachment area]' ||
    lower === '[image]' ||
    lower === '[photo]'
  ) {
    return false;
  }

  if (isReportBoundaryOrFooter(trimmed)) {
    return false;
  }

  // Must not be a cross-reference
  if (
    lower.startsWith('refer annex') ||
    lower.startsWith('see annex') ||
    lower.startsWith('as mentioned in annex')
  ) {
    return false;
  }

  // Check Person / Relationship keywords
  const hasPersonSignal = PERSON_RELATIONSHIP_KEYWORDS.some((kw) =>
    lower.includes(kw)
  );

  // Check Photo Context keywords
  const hasPhotoSignal = PHOTO_CONTEXT_KEYWORDS.some((kw) =>
    lower.includes(kw)
  );

  // Check Location / Residence keywords
  const hasLocationSignal = LOCATION_KEYWORDS.some((kw) =>
    lower.includes(kw)
  );

  // Check strong filename similarity if user already loaded images
  const normText = trimmed
    .toLowerCase()
    .replace(/[-_/:,.;()[\]{}|’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const hasFilenameMatch = uploadedFilenamesNormalized.some(
    (fn) =>
      fn.length >= 5 &&
      (normText.includes(fn) || fn.includes(normText))
  );

  return (
    hasPersonSignal ||
    hasPhotoSignal ||
    hasLocationSignal ||
    hasFilenameMatch
  );
}
