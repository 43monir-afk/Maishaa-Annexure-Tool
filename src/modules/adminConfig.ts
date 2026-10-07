import { AdminSettingsConfig, CountryOption, EffectiveCountry } from '../types/annexure';

export interface BorderProfile {
  country: EffectiveCountry;
  pt: number;
  emu: number;
  color: string;
  style: 'solid';
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettingsConfig = {
  adminEmail: '43monir@gmail.com',
  austriaBorderPt: 1.5,
  italyBorderPt: 0.75,
  finlandBorderPt: 0.75,
  greeceBorderPt: 0.75,
  otherBorderPt: 0.75,
  portraitWidthInches: 3.08,
  portraitHeightInches: 4.1,
  landscapeWidthInches: 5.44,
  landscapeHeightInches: 4.1,
  passportWidthInches: 5.0,
  passportHeightInches: 7.0,
  useExactVisa35x45mm: false,
  compressionThresholdKb: 500,
  initialJpegQuality: 0.88,
  maxDimensionPx: 1920,
  targetDocxMinMb: 5.0,
  targetDocxMaxMb: 8.0,
  allowDuplicateAssignmentOverride: false,
  debugLogging: true,
  adSlotKey: '',
};

export function normalizeCountry(country: string): string {
  return String(country || '')
    .trim()
    .toLowerCase();
}

/**
 * Single Source of Truth for Country Border Profile (Section 7):
 * - Austria / Austia: 1.50 pt solid black (19,050 EMU)
 * - Greece / Finland / Italy / Other: 0.75 pt solid black (9,525 EMU)
 */
export function getBorderProfile(
  country: EffectiveCountry | CountryOption | string,
  settings: AdminSettingsConfig = DEFAULT_ADMIN_SETTINGS
): BorderProfile {
  const c = normalizeCountry(country);

  if (c === 'austria' || c === 'austia') {
    const pt = settings.austriaBorderPt;
    return {
      country: 'Austria',
      pt,
      emu: Math.round(pt * 12700),
      color: '000000',
      style: 'solid',
    };
  }

  if (c === 'greece') {
    const pt = settings.greeceBorderPt;
    return {
      country: 'Greece',
      pt,
      emu: Math.round(pt * 12700),
      color: '000000',
      style: 'solid',
    };
  }

  if (c === 'finland') {
    const pt = settings.finlandBorderPt;
    return {
      country: 'Finland',
      pt,
      emu: Math.round(pt * 12700),
      color: '000000',
      style: 'solid',
    };
  }

  if (c === 'italy') {
    const pt = settings.italyBorderPt;
    return {
      country: 'Italy',
      pt,
      emu: Math.round(pt * 12700),
      color: '000000',
      style: 'solid',
    };
  }

  const pt = settings.otherBorderPt;
  return {
    country: 'Other',
    pt,
    emu: Math.round(pt * 12700),
    color: '000000',
    style: 'solid',
  };
}

export function detectCountryFromText(
  filename: string,
  headingsText: string
): EffectiveCountry {
  const fnLower = filename.toLowerCase();
  if (fnLower.includes('austria') || fnLower.includes('austia')) return 'Austria';
  if (fnLower.includes('finland') || fnLower.includes('finnish')) return 'Finland';
  if (fnLower.includes('italy') || fnLower.includes('italian')) return 'Italy';
  if (fnLower.includes('greece') || fnLower.includes('greek')) return 'Greece';

  const textLower = headingsText.toLowerCase();

  // Priority 1: Explicit Client Name / Embassy of <Country> header in the report
  if (/embassy\s+of\s+(?:austria|austia)/i.test(textLower)) return 'Austria';
  if (/embassy\s+of\s+finland/i.test(textLower)) return 'Finland';
  if (/embassy\s+of\s+italy/i.test(textLower)) return 'Italy';
  if (/embassy\s+of\s+greece/i.test(textLower)) return 'Greece';

  // Priority 2: General mention in document header / text
  if (textLower.includes('austria') || textLower.includes('austia')) {
    return 'Austria';
  }
  if (textLower.includes('finland') || textLower.includes('finnish')) {
    return 'Finland';
  }
  if (textLower.includes('greece') || textLower.includes('greek')) {
    return 'Greece';
  }
  if (textLower.includes('italy') || textLower.includes('italian')) {
    return 'Italy';
  }
  return 'Other';
}

export function resolveEffectiveCountry(
  selectedOption: CountryOption,
  detectedCountry: EffectiveCountry
): EffectiveCountry {
  if (selectedOption === 'Auto Detect') {
    return detectedCountry;
  }
  return selectedOption;
}

export function getBorderPtForCountry(
  country: EffectiveCountry,
  _itemText: string,
  settings: AdminSettingsConfig
): number {
  return getBorderProfile(country, settings).pt;
}

export function ptToEmu(pt: number): number {
  // 1 pt = 12700 EMU (1.5 pt = 19050 EMU, 0.75 pt = 9525 EMU)
  return Math.round(pt * 12700);
}

export function inchesToEmu(inches: number): number {
  // 1 inch = 914400 EMU
  return Math.round(inches * 914400);
}
