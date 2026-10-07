import JSZip from 'jszip';
import {
  AdminSettingsConfig,
  LoadedDocxState,
} from '../types/annexure';
import { detectCountryFromText } from './adminConfig';
import {
  detectAnnexuresAndTargets,
  ParagraphNodeInfo,
} from './annexureDetector';

export function extractParagraphsFromDocumentXml(
  xmlString: string
): ParagraphNodeInfo[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
  const pNodes = Array.from(xmlDoc.getElementsByTagName('w:p'));

  return pNodes.map((pNode, index) => {
    const tNodes = Array.from(pNode.getElementsByTagName('w:t'));
    const text = tNodes.map((t) => t.textContent || '').join('');
    return {
      index,
      text: text.replace(/\s+/g, ' ').trim(),
    };
  });
}

export async function parseDocxFile(
  file: File,
  settings: AdminSettingsConfig,
  uploadedFilenamesNormalized: string[] = []
): Promise<LoadedDocxState> {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    throw new Error('Invalid file format. Please upload a valid Microsoft Word .DOCX file.');
  }

  const zip = new JSZip();
  let loadedZip: JSZip;
  try {
    loadedZip = await zip.loadAsync(file);
  } catch {
    throw new Error('Broken ZIP archive: Unable to unpack the .DOCX file.');
  }

  const docXmlEntry = loadedZip.file('word/document.xml');
  if (!docXmlEntry) {
    throw new Error('Invalid DOCX structure: Missing word/document.xml inside package.');
  }

  const documentXml = await docXmlEntry.async('string');
  const paragraphs = extractParagraphsFromDocumentXml(documentXml);
  const allTextJoined = paragraphs.map((p) => p.text).join(' ');
  const detectedCountry = detectCountryFromText(file.name, allTextJoined);

  const scanResult = detectAnnexuresAndTargets(
    paragraphs,
    detectedCountry,
    settings,
    uploadedFilenamesNormalized
  );

  return {
    file,
    filename: file.name,
    sizeBytes: file.size,
    zip: loadedZip,
    documentXml,
    detectedCountry,
    scannedHeadings: scanResult.scannedHeadings,
    attachmentTargets: scanResult.attachmentTargets,
    ignoredReferencesCount: scanResult.ignoredReferencesCount,
    excludedFooterParagraphsCount: scanResult.excludedFooterParagraphsCount,
  };
}
