import JSZip from 'jszip';
import { OpenXmlValidationReport } from '../types/annexure';

// Section 31: Centralized XML 1.0 Invalid Control Character Sanitizer
export function sanitizeXmlText(value: unknown): string {
  if (value == null) return '';
  return String(value).replace(
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
    ''
  );
}

export function escapeXmlAttribute(value: string): string {
  return sanitizeXmlText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function checkXmlStringWellFormed(
  xmlStr: string,
  partLabel: string,
  errors: string[]
): Document | null {
  // Check for invalid XML 1.0 control characters
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(xmlStr)) {
    errors.push(`${partLabel} contains invalid XML 1.0 control characters.`);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'application/xml');
  const parserError = doc.getElementsByTagName('parsererror');
  if (parserError.length > 0) {
    const errText = parserError[0].textContent || 'XML syntax error';
    errors.push(`${partLabel} failed XML parsing: ${errText.slice(0, 180)}`);
    return null;
  }
  return doc;
}

// Sections 30, 32, 56: Reopen generated DOCX Blob with JSZip and validate everything before enabling download
export async function validateGeneratedDocxBlob(
  docxBlob: Blob
): Promise<OpenXmlValidationReport> {
  const errors: string[] = [];
  let zipOpens = false;
  let contentTypesValid = false;
  let documentXmlValid = false;
  let relsXmlValid = false;
  let uniqueRelIds = true;
  let uniqueDocPrIds = true;
  let allMediaFilesExist = true;
  let insertedImagesCount = 0;

  let zip: JSZip;
  try {
    const readerZip = new JSZip();
    zip = await readerZip.loadAsync(docxBlob);
    zipOpens = true;
  } catch (err) {
    return {
      isValid: false,
      zipOpens: false,
      contentTypesValid: false,
      documentXmlValid: false,
      relsXmlValid: false,
      uniqueRelIds: false,
      uniqueDocPrIds: false,
      allMediaFilesExist: false,
      insertedImagesCount: 0,
      errors: [
        `Generated DOCX ZIP failed to open: ${
          err instanceof Error ? err.message : String(err)
        }`,
      ],
    };
  }

  // 1. Validate [Content_Types].xml
  const contentTypesFile = zip.file('[Content_Types].xml');
  if (!contentTypesFile) {
    errors.push('Missing [Content_Types].xml in generated DOCX.');
  } else {
    const ctXml = await contentTypesFile.async('string');
    const ctDoc = checkXmlStringWellFormed(
      ctXml,
      '[Content_Types].xml',
      errors
    );
    if (ctDoc) {
      const hasJpegContentType =
        ctXml.includes('Extension="jpeg"') || ctXml.includes('Extension="jpg"');
      if (!hasJpegContentType) {
        errors.push('[Content_Types].xml is missing JPEG default content type.');
      } else {
        contentTypesValid = true;
      }
    }
  }

  // 2. Validate word/_rels/document.xml.rels
  const relsFile = zip.file('word/_rels/document.xml.rels');
  const relIdSet = new Set<string>();
  const imageRelTargets = new Map<string, string>();

  if (!relsFile) {
    errors.push('Missing word/_rels/document.xml.rels in generated DOCX.');
  } else {
    const relsXml = await relsFile.async('string');
    const relsDoc = checkXmlStringWellFormed(
      relsXml,
      'word/_rels/document.xml.rels',
      errors
    );
    if (relsDoc) {
      relsXmlValid = true;
      const relNodes = Array.from(
        relsDoc.getElementsByTagName('Relationship')
      );
      for (const rel of relNodes) {
        const id = rel.getAttribute('Id') || '';
        const target = rel.getAttribute('Target') || '';
        const type = rel.getAttribute('Type') || '';
        if (!id) {
          errors.push('Relationship node missing Id attribute.');
        } else if (relIdSet.has(id)) {
          uniqueRelIds = false;
          errors.push(`Duplicate Relationship Id detected: "${id}".`);
        } else {
          relIdSet.add(id);
        }

        if (type.endsWith('/image')) {
          imageRelTargets.set(id, target);
        }
      }
    }
  }

  // 3. Verify every image relationship target exists in word/
  for (const [relId, targetPath] of imageRelTargets.entries()) {
    if (relId.startsWith('rIdMaishaaImg')) {
      insertedImagesCount++;
    }
    const normalizedPath = targetPath.startsWith('/')
      ? targetPath.slice(1)
      : `word/${targetPath.replace(/^\.\//, '')}`;
    const exists = Boolean(zip.file(normalizedPath));
    if (!exists) {
      allMediaFilesExist = false;
      errors.push(
        `Missing media binary "${normalizedPath}" referenced by Relationship "${relId}".`
      );
    }
  }

  // 4. Validate word/document.xml and wp:docPr uniqueness
  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    errors.push('Missing word/document.xml in generated DOCX.');
  } else {
    const docXml = await docFile.async('string');
    const docDom = checkXmlStringWellFormed(
      docXml,
      'word/document.xml',
      errors
    );
    if (docDom) {
      documentXmlValid = true;
      const docPrIds = new Set<string>();
      const docPrNodes = Array.from(docDom.getElementsByTagName('wp:docPr'));
      for (const node of docPrNodes) {
        const idVal = node.getAttribute('id') || '';
        if (idVal) {
          if (docPrIds.has(idVal)) {
            uniqueDocPrIds = false;
            errors.push(`Duplicate wp:docPr id detected: "${idVal}".`);
          }
          docPrIds.add(idVal);
        }
      }
    }
  }

  const isValid =
    zipOpens &&
    contentTypesValid &&
    documentXmlValid &&
    relsXmlValid &&
    uniqueRelIds &&
    uniqueDocPrIds &&
    allMediaFilesExist &&
    errors.length === 0;

  return {
    isValid,
    zipOpens,
    contentTypesValid,
    documentXmlValid,
    relsXmlValid,
    uniqueRelIds,
    uniqueDocPrIds,
    allMediaFilesExist,
    insertedImagesCount,
    errors,
  };
}
