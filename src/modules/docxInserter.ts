import JSZip from 'jszip';
import {
  AdminSettingsConfig,
  AttachmentTarget,
  EffectiveCountry,
  OpenXmlValidationReport,
  UploadedImageItem,
} from '../types/annexure';
import {
  getBorderProfile,
  inchesToEmu,
} from './adminConfig';
import {
  buildAttachmentKey,
  normalizeFilenameForAttachment,
} from './duplicateRegistry';
import {
  calculatePlannedDimensions,
  compressImageAdaptive,
} from './imageProcessor';
import { resolveEffectiveCategory } from './imageClassifier';
import {
  escapeXmlAttribute,
  sanitizeXmlText,
  validateGeneratedDocxBlob,
} from './openXmlValidator';

const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const NS_WP =
  'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
const NS_R =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG_REL =
  'http://schemas.openxmlformats.org/package/2006/relationships';

export interface DocxInsertionProgress {
  currentStep: number;
  totalSteps: number;
  statusMessage: string;
}

export interface DocxBuildResult {
  blob: Blob;
  sizeBytes: number;
  insertedCount: number;
  validationReport: OpenXmlValidationReport;
  logs: {
    level:
      | 'INFO'
      | 'MATCH'
      | 'SKIP DUPLICATE'
      | 'VALIDATION'
      | 'WARNING'
      | 'ERROR'
      | 'SUCCESS';
    message: string;
  }[];
}

function findNextUniqueRelIdIndex(relsDoc: Document): number {
  let maxNum = 1000;
  const rels = Array.from(relsDoc.getElementsByTagName('Relationship'));
  for (const r of rels) {
    const id = r.getAttribute('Id') || '';
    const match = id.match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n >= maxNum) maxNum = n + 1;
    }
  }
  return maxNum + 1;
}

function findNextUniqueDocPrId(docDom: Document): number {
  let maxId = 10000;
  const docPrs = Array.from(docDom.getElementsByTagName('wp:docPr'));
  for (const node of docPrs) {
    const idVal = parseInt(node.getAttribute('id') || '0', 10);
    if (idVal >= maxId) {
      maxId = idVal + 1;
    }
  }
  return maxId + 1;
}

function findNextUniqueMediaNumber(zip: JSZip): number {
  let maxMedia = 0;
  zip.folder('word/media')?.forEach((relativePath) => {
    const m = relativePath.match(/(\d+)\.(?:jpeg|jpg|png)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxMedia) maxMedia = n;
    }
  });
  return maxMedia + 1;
}

function createDrawingParagraphNode(
  docDom: Document,
  relId: string,
  docPrId: number,
  cNvPrId: number,
  safeName: string,
  emuWidth: number,
  emuHeight: number,
  borderEmu: number
): Element {
  const fragmentXml = `<w:p xmlns:w="${NS_W}" xmlns:wp="${NS_WP}" xmlns:a="${NS_A}" xmlns:pic="${NS_PIC}" xmlns:r="${NS_R}">
  <w:pPr>
    <w:jc w:val="center"/>
    <w:spacing w:before="120" w:after="200"/>
  </w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="${emuWidth}" cy="${emuHeight}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="${docPrId}" name="${escapeXmlAttribute(safeName)}"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic>
          <a:graphicData uri="${NS_PIC}">
            <pic:pic>
              <pic:nvPicPr>
                <pic:cNvPr id="${cNvPrId}" name="${escapeXmlAttribute(safeName)}"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${escapeXmlAttribute(relId)}"/>
                <a:stretch>
                  <a:fillRect/>
                </a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${emuWidth}" cy="${emuHeight}"/>
                </a:xfrm>
                <a:prstGeom prst="rect">
                  <a:avLst/>
                </a:prstGeom>
                <a:ln w="${borderEmu}">
                  <a:solidFill>
                    <a:srgbClr val="000000"/>
                  </a:solidFill>
                </a:ln>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>`;

  const parser = new DOMParser();
  const parsed = parser.parseFromString(fragmentXml, 'application/xml');
  return docDom.importNode(parsed.documentElement, true);
}

export async function insertImagesAndBuildDocx(
  originalFile: File,
  targets: AttachmentTarget[],
  images: UploadedImageItem[],
  country: EffectiveCountry,
  settings: AdminSettingsConfig,
  onProgress?: (p: DocxInsertionProgress) => void
): Promise<DocxBuildResult> {
  const logs: DocxBuildResult['logs'] = [];

  // Reload fresh copy of the source DOCX so repeated runs never double-insert
  const workingZip = await new JSZip().loadAsync(originalFile);

  const docXmlFile = workingZip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('Missing word/document.xml in source DOCX.');
  }

  const rawDocXml = sanitizeXmlText(await docXmlFile.async('string'));
  const parser = new DOMParser();
  const docDom = parser.parseFromString(rawDocXml, 'application/xml');
  if (docDom.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Source word/document.xml contains malformed XML.');
  }

  // Load or initialize word/_rels/document.xml.rels
  const relsFile = workingZip.file('word/_rels/document.xml.rels');
  const rawRelsXml = relsFile
    ? sanitizeXmlText(await relsFile.async('string'))
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS_PKG_REL}"></Relationships>`;
  const relsDom = parser.parseFromString(rawRelsXml, 'application/xml');
  if (relsDom.getElementsByTagName('parsererror').length > 0) {
    throw new Error(
      'Source word/_rels/document.xml.rels contains malformed XML.'
    );
  }

  // Ensure [Content_Types].xml supports jpeg and jpg
  const ctFile = workingZip.file('[Content_Types].xml');
  if (ctFile) {
    let ctXml = sanitizeXmlText(await ctFile.async('string'));
    const ctDom = parser.parseFromString(ctXml, 'application/xml');
    if (ctDom.getElementsByTagName('parsererror').length === 0) {
      const defaults = Array.from(ctDom.getElementsByTagName('Default'));
      const hasJpeg = defaults.some(
        (d) => (d.getAttribute('Extension') || '').toLowerCase() === 'jpeg'
      );
      const hasJpg = defaults.some(
        (d) => (d.getAttribute('Extension') || '').toLowerCase() === 'jpg'
      );
      const typesRoot = ctDom.documentElement;
      const ctNs = typesRoot.namespaceURI || 'http://schemas.openxmlformats.org/package/2006/content-types';

      if (!hasJpeg) {
        const defJpeg = ctDom.createElementNS(ctNs, 'Default');
        defJpeg.setAttribute('Extension', 'jpeg');
        defJpeg.setAttribute('ContentType', 'image/jpeg');
        typesRoot.appendChild(defJpeg);
      }
      if (!hasJpg) {
        const defJpg = ctDom.createElementNS(ctNs, 'Default');
        defJpg.setAttribute('Extension', 'jpg');
        defJpg.setAttribute('ContentType', 'image/jpeg');
        typesRoot.appendChild(defJpg);
      }
      ctXml = sanitizeXmlText(new XMLSerializer().serializeToString(ctDom));
      workingZip.file('[Content_Types].xml', ctXml);
    }
  }

  // Snapshot original paragraph nodes BEFORE any insertion so paragraphIndex maps 1-to-1
  const originalParagraphNodes = Array.from(
    docDom.getElementsByTagName('w:p')
  );

  // Filter targets that have a valid assigned image (never touch PENDING or MANUAL_LATER captions)
  const rawReadyTargets = targets.filter(
    (t) => Boolean(t.assignedImageId) && t.status !== 'MANUAL_LATER'
  );
  const unattachedTargets = targets.filter(
    (t) => !t.assignedImageId || t.status === 'MANUAL_LATER'
  );

  // IMPLEMENTATION RULES 1, 2, 5:
  // Build finalized unique attachment list and maintain deduplication sets
  const attachedKeys = new Set<string>();
  const attachedSourceKeys = new Set<string>();
  const attachedSourceFiles = new Set<string>();
  const attachedParagraphIndices = new Set<number>();
  const finalizedUniqueTargets: AttachmentTarget[] = [];

  for (const target of rawReadyTargets) {
    const imgItem = images.find((img) => img.id === target.assignedImageId);
    if (!imgItem) {
      logs.push({
        level: 'WARNING',
        message: `[${target.displayCode}] Assigned image not found in memory. Skipped.`,
      });
      continue;
    }

    // Rule 1: attachmentKey = normalizedFilename + "::" + normalizedHeading
    const headingText = target.rawText || target.parentHeadingText || target.cleanMatchText;
    const attachmentKey = buildAttachmentKey(
      imgItem.filename,
      headingText,
      target.paragraphIndex
    );

    // Rule 2: Deduplication check before insertion
    if (attachedKeys.has(attachmentKey)) {
      logs.push({
        level: 'SKIP DUPLICATE',
        message: `[${target.displayCode}] Duplicate attachment skipped: "${imgItem.filename}" is already attached under heading "${headingText}".`,
      });
      continue;
    }

    // Required Behavior: One source file/document = exactly ONE attachment
    const normFile = normalizeFilenameForAttachment(imgItem.filename);
    if (attachedSourceKeys.has(imgItem.sourceKey) || attachedSourceFiles.has(normFile)) {
      logs.push({
        level: 'SKIP DUPLICATE',
        message: `[${target.displayCode}] Duplicate source file skipped: "${imgItem.filename}" has already been attached to the document.`,
      });
      continue;
    }

    // Guard against attaching to the same anchor paragraph multiple times
    if (attachedParagraphIndices.has(target.paragraphIndex)) {
      logs.push({
        level: 'SKIP DUPLICATE',
        message: `[${target.displayCode}] Target paragraph at index ${target.paragraphIndex} already received an attachment. Skipped duplicate insertion.`,
      });
      continue;
    }

    // Register into deduplication sets
    attachedKeys.add(attachmentKey);
    attachedSourceKeys.add(imgItem.sourceKey);
    attachedSourceFiles.add(normFile);
    attachedParagraphIndices.add(target.paragraphIndex);
    finalizedUniqueTargets.push(target);
  }

  if (unattachedTargets.length > 0) {
    logs.push({
      level: 'WARNING',
      message: `Partial / Manual Later Mode: ${unattachedTargets.length} target(s) preserved untouched in Word for manual insertion later (${unattachedTargets
        .map((u) => `${u.displayCode} — ${u.rawText}`)
        .join(' | ')}).`,
    });
  }

  let nextRelIdx = findNextUniqueRelIdIndex(relsDom);
  let nextDocPrId = findNextUniqueDocPrId(docDom);
  let nextMediaNum = findNextUniqueMediaNumber(workingZip);
  let insertedCount = 0;

  // Rule 5: Final DOCX generation uses the finalized unique attachment list only once
  for (let i = 0; i < finalizedUniqueTargets.length; i++) {
    const target = finalizedUniqueTargets[i];
    const imgItem = images.find((img) => img.id === target.assignedImageId);
    if (!imgItem) {
      continue;
    }

    onProgress?.({
      currentStep: i + 1,
      totalSteps: finalizedUniqueTargets.length,
      statusMessage: `Processing [${target.displayCode}] ${imgItem.filename}...`,
    });

    const anchorP = originalParagraphNodes[target.paragraphIndex];
    if (!anchorP || !anchorP.parentNode) {
      logs.push({
        level: 'ERROR',
        message: `[${target.displayCode}] Target paragraph index ${target.paragraphIndex} not found in XML.`,
      });
      continue;
    }

    // Fill Missing Only Guard (Requirement 7):
    // If anchorP or its immediate following paragraph already contains an embedded <w:drawing>, do not insert another copy.
    const nextElem = anchorP.nextElementSibling;
    const anchorHasDrawing =
      anchorP.getElementsByTagName('w:drawing').length > 0 ||
      anchorP.getElementsByTagName('wp:docPr').length > 0;
    const nextHasDrawing =
      nextElem != null &&
      (nextElem.getElementsByTagName('w:drawing').length > 0 ||
        nextElem.getElementsByTagName('wp:docPr').length > 0);

    if (anchorHasDrawing || nextHasDrawing) {
      logs.push({
        level: 'SKIP DUPLICATE',
        message: `[${target.displayCode}] Fill Missing Only: Target already contains an embedded image in the DOCX. Skipped duplicate insertion.`,
      });
      continue;
    }

    // Compress / optimize image according to rules (Section 23)
    const compressed = await compressImageAdaptive(
      imgItem,
      finalizedUniqueTargets.length,
      settings
    );
    const imgBytes = new Uint8Array(await compressed.blob.arrayBuffer());

    // Calculate category-based Word dimensions in inches -> EMU (Sections 1–15)
    const effectiveCat = resolveEffectiveCategory(
      target.classification,
      imgItem.inferredCategory,
      target.isPhotoChild
    );

    const plannedDim = calculatePlannedDimensions(
      compressed.widthPx,
      compressed.heightPx,
      effectiveCat,
      settings
    );
    const emuW = inchesToEmu(plannedDim.widthInches);
    const emuH = inchesToEmu(plannedDim.heightInches);

    // Calculate country border thickness in EMU via single source of truth getBorderProfile (Section 7)
    const borderProfile = getBorderProfile(country, settings);
    const borderPt = target.borderPt || borderProfile.pt;
    const borderEmu = Math.round(borderPt * 12700);

    // Generate unique OpenXML IDs & media path (Sections 27 & 28)
    const relId = `rIdMaishaaImg${nextRelIdx++}`;
    const docPrId = nextDocPrId++;
    const cNvPrId = nextDocPrId++;
    const mediaFilename = `maishaa_image_${String(nextMediaNum++).padStart(
      3,
      '0'
    )}.jpeg`;

    workingZip.file(`word/media/${mediaFilename}`, imgBytes);

    // Add Relationship node to word/_rels/document.xml.rels
    const relsRoot = relsDom.documentElement;
    const relNs = relsRoot.namespaceURI || NS_PKG_REL;
    const relElem = relsDom.createElementNS(relNs, 'Relationship');
    relElem.setAttribute('Id', relId);
    relElem.setAttribute(
      'Type',
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'
    );
    relElem.setAttribute('Target', `media/${mediaFilename}`);
    relsRoot.appendChild(relElem);

    // Create DrawingML paragraph node
    const drawingParagraph = createDrawingParagraphNode(
      docDom,
      relId,
      docPrId,
      cNvPrId,
      imgItem.filename,
      emuW,
      emuH,
      borderEmu
    );

    // Check if the immediate next sibling is a "[Attachment area]" placeholder paragraph; if so, replace it cleanly
    const nextSibling = anchorP.nextElementSibling;
    const nextSiblingText = nextSibling?.textContent?.trim().toLowerCase() || '';
    if (
      nextSibling &&
      (nextSiblingText === '[attachment area]' ||
        nextSiblingText === '[image]' ||
        nextSiblingText === '[photo]')
    ) {
      anchorP.parentNode.replaceChild(drawingParagraph, nextSibling);
    } else {
      anchorP.parentNode.insertBefore(drawingParagraph, anchorP.nextSibling);
    }

    insertedCount++;
    logs.push({
      level: 'INFO',
      message: `Inserted [${target.displayCode}] -> word/media/${mediaFilename} (${plannedDim.label}, Border ${borderPt}pt / ${borderEmu} EMU, ${(
        compressed.bytes / 1024
      ).toFixed(1)} KB)`,
    });
  }

  // Serialize modified XML back to ZIP
  const serializer = new XMLSerializer();
  const finalDocXml = sanitizeXmlText(serializer.serializeToString(docDom));
  const finalRelsXml = sanitizeXmlText(serializer.serializeToString(relsDom));

  workingZip.file('word/document.xml', finalDocXml);
  workingZip.file('word/_rels/document.xml.rels', finalRelsXml);

  onProgress?.({
    currentStep: finalizedUniqueTargets.length,
    totalSteps: finalizedUniqueTargets.length,
    statusMessage: 'Packaging & running OpenXML verification...',
  });

  const generatedBlob = await workingZip.generateAsync({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Final DOCX Validation (Section 32 & 56)
  const validationReport = await validateGeneratedDocxBlob(generatedBlob);
  if (validationReport.isValid) {
    logs.push({
      level: 'VALIDATION',
      message: `word/document.xml OK · word/_rels/document.xml.rels OK · [Content_Types].xml OK · ${validationReport.insertedImagesCount} media files verified.`,
    });
    logs.push({
      level: 'SUCCESS',
      message: `DOCX generated successfully. ${insertedCount} attached, ${unattachedTargets.length} left for manual insertion in Word (${(
        generatedBlob.size /
        (1024 * 1024)
      ).toFixed(2)} MB).`,
    });
  } else {
    for (const errMsg of validationReport.errors) {
      logs.push({
        level: 'ERROR',
        message: `[VALIDATION FAILED] ${errMsg}`,
      });
    }
  }

  return {
    blob: generatedBlob,
    sizeBytes: generatedBlob.size,
    insertedCount,
    validationReport,
    logs,
  };
}
