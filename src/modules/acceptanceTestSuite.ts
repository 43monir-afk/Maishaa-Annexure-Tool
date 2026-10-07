import JSZip from 'jszip';
import { DEFAULT_ADMIN_SETTINGS } from './adminConfig';
import { parseDocxFile } from './docxParser';
import { insertImagesAndBuildDocx } from './docxInserter';
import { runMultiFactorAutoMatcher } from './imageMatcher';
import { inspectUploadedJpgFile } from './imageProcessor';

// Generates a realistic synthetic JPEG File in-browser using HTML5 Canvas
async function createSyntheticJpgFile(
  filename: string,
  title: string,
  subtitle: string,
  badgeText: string,
  orientation: 'Portrait' | 'Landscape',
  accentColor: string
): Promise<File> {
  const width = orientation === 'Portrait' ? 1100 : 1440;
  const height = orientation === 'Portrait' ? 1500 : 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 14;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, width - 112, height - 112);

  ctx.fillStyle = accentColor;
  ctx.fillRect(56, 56, width - 112, 110);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`MAISHAA VERIFICATION EXHIBIT · ${badgeText}`, 90, 122);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 40px sans-serif';
  const words = title.split(' ');
  let line = '';
  let y = 270;
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > width - 180) {
      ctx.fillText(line.trim(), 90, y);
      line = w + ' ';
      y += 54;
    } else {
      line = test;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), 90, y);
    y += 70;
  }

  ctx.fillStyle = '#475569';
  ctx.font = '26px monospace';
  ctx.fillText(`File: ${filename}`, 90, y);
  y += 48;
  ctx.fillText(`Orientation: ${orientation} (${width}x${height} px)`, 90, y);
  y += 48;
  ctx.fillText(subtitle, 90, y);

  ctx.beginPath();
  ctx.arc(width - 200, height - 200, 95, 0, Math.PI * 2);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VERIFIED EXHIBIT', width - 200, height - 205);
  ctx.font = '18px monospace';
  ctx.fillText('100% CLIENT-SIDE', width - 200, height - 175);

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.88);
  });

  return new File([blob], filename, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

async function buildSampleDocxPackage(
  filename: string,
  paragraphsXml: string
): Promise<File> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`
  );

  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
${paragraphsXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>
    </w:sectPr>
  </w:body>
</w:document>`
  );

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return new File([blob], filename, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

// ============================================================================
// REAL REPORT PATTERN 1: FAHMIDA FARIA — Embassy of Austria, New Delhi (2894-003769)
// Annexures A-F (6 Normal Targets: A-C Referee, D-F Applicant) + Annexure G: Photographs (G.1 to G.5 = 5 Photo Captions)
// Total Headings = 7, Total Attachment Targets = 11
// ============================================================================
export async function generateFahmidaFariaAustriaReportBundle(): Promise<{
  docxFile: File;
  uploadCopyFiles: File[];
  applicantCopyFiles: File[];
}> {
  const xmlParagraphs = `
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Verification Report — Strictly Confidential</w:t></w:r></w:p>
    <w:p><w:r><w:t>Name of Applicant: FAHMIDA FARIA | Gender: FEMALE | Reference No: 2894-003769</w:t></w:r></w:p>
    <w:p><w:r><w:t>Client Name: Embassy of Austria, New Delhi | Date of Birth: 14 September 1998 | Status: GREEN</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>FINAL BACKGROUND REPORT — Executive Summary — EDUCATION VERIFICATION</w:t></w:r></w:p>
    <w:p><w:r><w:t>Education Check: Bachelor of Social Science in Sociology Certificate, Official Transcript, Transcript Details, East West University, Aftabnagar, Dhaka-1212, Bangladesh</w:t></w:r></w:p>
    <w:p><w:r><w:t>Verified by: A. K. M. Mahbub-Ul Islam, Assistant Registrar, East West University</w:t></w:r></w:p>
    <w:p><w:r><w:t>Refer Annexure A-C for Bachelor of Social Science in Sociology Certificate, Official Transcript, Transcript Details verified by Referee</w:t></w:r></w:p>
    <w:p><w:r><w:t>Refer Annexure D-F for Bachelor of Social Science in Sociology Certificate, Official Transcript, Transcript Details Provided by the Applicant</w:t></w:r></w:p>
    <w:p><w:r><w:t>Refer Annexure G for Photographs</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure A: Copy of Bachelor of Social Science in Sociology Certificate verified by the Referee</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure B: Copy of Bachelor of Social Science in Sociology Official Transcript verified by the Referee</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure C: Copy of Bachelor of Social Science in Sociology Transcript Details verified by the Referee</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure D: Copy of Bachelor of Social Science in Sociology Certificate Provided by the Applicant</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure E: Copy of Bachelor of Social Science in Sociology Official Transcript Provided by the Applicant</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure F: Copy of Bachelor of Social Science in Sociology Transcript Details Provided by the Applicant</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Findings from the Site Checks</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. Visited the rented residence and neighborhood of Fardousi Hasnat (Mother of Fahmida Faria) at 3/A, Chayabithi, Post Office- Basabo, Ward No.-04, Dhaka South City Corporation, Police Station- Sabujbagh, District- Dhaka, Bangladesh</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Visited the flat residence and neighborhood of Late Hasnat Mosharrof (Father of Fahmida Faria) at House No.-34, Flat No.-a/3, Chayabithi, Post Office- Basabo-1214, Ward No.-04, Dhaka South City Corporation, Police Station- Sabujbagh, District- Dhaka, Bangladesh</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>Annexure G: Photographs</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Applicant-Fahmida Faria</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Fahmida Faria’s with her Mother</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Fahmida Faria’s Faher House Neighbor- Anup Kumar Mistry</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Rented Residence of Fahmida Faria’s Mother at 3/A, Chayabithi, Police Station- Sabujbagh, District- Dhaka</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Flat Residence of Fahmida Faria’s Father at House No.-34, Flat No.-A/3, Chayabithi, Police Station- Sabujbagh, District- Dhaka</w:t></w:r></w:p>
  `;

  const docxFile = await buildSampleDocxPackage(
    '2894-003769_Fahmida_Faria_Austria.docx',
    xmlParagraphs
  );

  const uploadSpecs: {
    name: string;
    title: string;
    badge: string;
    orient: 'Portrait' | 'Landscape';
  }[] = [
    {
      name: 'Copy of Bachelor of Social Science in Sociology Certificate.jpg',
      title: 'Bachelor of Social Science in Sociology Certificate (Verified by Referee)',
      badge: 'ANNEXURE A',
      orient: 'Portrait',
    },
    {
      name: 'Copy of Bachelor of Social Science in Sociology Official Transcript.jpg',
      title: 'Bachelor of Social Science in Sociology Official Transcript (Verified by Referee)',
      badge: 'ANNEXURE B',
      orient: 'Portrait',
    },
    {
      name: 'Copy of Bachelor of Social Science in Sociology Transcript Details.jpg',
      title: 'Bachelor of Social Science in Sociology Transcript Details (Verified by Referee)',
      badge: 'ANNEXURE C',
      orient: 'Portrait',
    },
    {
      name: 'Applicant-Fahmida Faria.jpg',
      title: 'Applicant-Fahmida Faria',
      badge: 'PHOTO G.1',
      orient: 'Portrait',
    },
    {
      name: 'Fahmida Faria with her Mother.jpg',
      title: 'Fahmida Faria with her Mother',
      badge: 'PHOTO G.2',
      orient: 'Landscape',
    },
    {
      name: 'Fahmida Faria Faher House Neighbor- Anup Kumar Mistry.jpg',
      title: 'Fahmida Faria Faher House Neighbor- Anup Kumar Mistry',
      badge: 'PHOTO G.3',
      orient: 'Landscape',
    },
    {
      name: 'Rented Residence of Fahmida Faria Mother at 3-A Chayabithi Sabujbagh Dhaka.jpg',
      title: 'Rented Residence of Fahmida Faria Mother at 3/A Chayabithi Sabujbagh Dhaka',
      badge: 'PHOTO G.4',
      orient: 'Landscape',
    },
    {
      name: 'Flat Residence of Fahmida Faria Father at House No 34 Flat No A-3 Chayabithi Sabujbagh Dhaka.jpg',
      title: 'Flat Residence of Fahmida Faria Father at House No.-34 Chayabithi Dhaka',
      badge: 'PHOTO G.5',
      orient: 'Landscape',
    },
  ];

  const uploadCopyFiles = await Promise.all(
    uploadSpecs.map((s) =>
      createSyntheticJpgFile(
        s.name,
        s.title,
        'Source: Upload Copy (Primary Verification Scan)',
        s.badge,
        s.orient,
        '#0F172A'
      )
    )
  );

  const applicantSpecs = [
    {
      name: 'Copy of Bachelor of Social Science in Sociology Certificate Provided by the Applicant.jpeg',
      title: 'Bachelor of Social Science in Sociology Certificate (Provided by Applicant)',
      badge: 'ANNEXURE D',
    },
    {
      name: 'Copy of Bachelor of Social Science in Sociology Official Transcript Provided by the Applicant.jpeg',
      title: 'Bachelor of Social Science in Sociology Official Transcript (Provided by Applicant)',
      badge: 'ANNEXURE E',
    },
    {
      name: 'Copy of Bachelor of Social Science in Sociology Transcript Details Provided by the Applicant.jpeg',
      title: 'Bachelor of Social Science in Sociology Transcript Details (Provided by Applicant)',
      badge: 'ANNEXURE F',
    },
  ];

  const applicantCopyFiles = await Promise.all(
    applicantSpecs.map((s) =>
      createSyntheticJpgFile(
        s.name,
        s.title,
        'Source: Applicant Copy (Secondary Submission)',
        s.badge,
        'Portrait',
        '#4338CA'
      )
    )
  );

  return { docxFile, uploadCopyFiles, applicantCopyFiles };
}

// ============================================================================
// REAL REPORT PATTERN 2: IQBAL AHMMED — Embassy of Greece, New Delhi (2895-001083)
// Annexures A-N (14 Headings: 11 Normal + 2 Single-Photo Annexures [D, F] + 1 Multi-Photo Container [N: N.1-N.9])
// Total Headings = 14, Total Attachment Targets = 22
// ============================================================================
export async function generateIqbalGreeceReportBundle(): Promise<{
  docxFile: File;
  uploadCopyFiles: File[];
  applicantCopyFiles: File[];
}> {
  const xmlParagraphs = `
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Verification Report — Strictly Confidential</w:t></w:r></w:p>
    <w:p><w:r><w:t>Name of Candidate: IQBAL AHMMED | Gender: Male | Reference No: 2895-001083</w:t></w:r></w:p>
    <w:p><w:r><w:t>Client Name: Embassy of Greece, New Delhi | Status: RED</w:t></w:r></w:p>
    <w:p><w:r><w:t>Refer Annexure A for Marriage Certificate</w:t></w:r></w:p>
    <w:p><w:r><w:t>Refer Annexure B-C for Extract from Marriage Register</w:t></w:r></w:p>
    <w:p><w:r><w:t>Refer Annexure D for Photograph of Kazi</w:t></w:r></w:p>
    <w:p><w:r><w:t>Refer Annexure N for Photographs</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure A: Copy of Marriage Certificate verified by the Kazi</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure B: Copy of Extract from the Marriage Register (Page 01 of 02)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure C: Copy of Extract from the Marriage Register (Page 02 of 02)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure D: Photograph of Kazi- Kazi Md. Zaherul Islam</w:t></w:r></w:p>

    <w:p><w:r><w:t>Refer Annexure E: Copy of Family Certificate verified by the referee</w:t></w:r></w:p>
    <w:p><w:r><w:t>Refer Annexure F: Photograph of 12 No. Ashrafpur Union Parishad</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure E: Copy of Family Certificate verified by referee</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure F: Photograph of Union Parishad</w:t></w:r></w:p>

    <w:p><w:r><w:t>Refer Annexure G: Copy of Birth Registration Certificate of Iqbal Ahmmed verified by the referee</w:t></w:r></w:p>
    <w:p><w:r><w:t>Refer Annexure H: Screenshot from National Database</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure G: Copy of Birth Registration Certificate of Ishtiaque Ahmed verified by the referee</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure H: Screenshot taken from National Database (Ishtiaque Ahmed)</w:t></w:r></w:p>

    <w:p><w:r><w:t>Refer Annexure I: Copy of Birth Registration Certificate of Ishtiaque Ahmed verified by the referee</w:t></w:r></w:p>
    <w:p><w:r><w:t>Refer Annexure J: Screenshot from National Database</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure I: Copy of Birth Registration Certificate of Iqbal Ahmmed verified by the referee</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure J: Screenshot taken from National Database (Iqbal Ahmmed)</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Findings from the Site Checks</w:t></w:r></w:p>
    <w:p><w:r><w:t>Iqbal Ahmmed’s Passport with Entry and Exit STAMPs after legalization and Last Entry and Exit STAMPs are attached in Annexure K - M as reference</w:t></w:r></w:p>
    <w:p><w:r><w:t>Iqbal Ahmmed is in private service, living in Greece. His first Entry in Italy was in the year 1996.</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure- K: 1st page of Sponsor’s Passport</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure- L: First Entry and Exit STAMP of Sponsor after Legalization</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure- M: Last Entry and Exit STAMPs of Sponsor</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>Annexure N: Photographs</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>A Marriage photograph of Iqbal Ahmmed with his wife- Sayada Nafiza Rahman collected during our visit</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>A photograph of Iqbal Ahmmed collected during our visit</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>A photograph of Iqbal Ahmmed with his wife- Sayada Nafiza Rahman, two Sons-Ishtiaque Ahmed, Elman Ahmmed and Daughter-Zaynab Ahmed collected during our visit</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Iqbal Ahmmed’s wife-Sayada Nafiza Rahman’s Paternal Aunt-Rabeya Khatun</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Iqbal Ahmmed’s wife-Sayada Nafiza Rahman’s Mother and Brother-Sayed Md. Forhad Aziz</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Iqbal Ahmmed’s Paternal Nephew-Abu Adnan</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Sold Address of Sayada Nafiza Rahman’s Father at Thakurpara 02 No. Kandirpar Cumilla Adarsha Sadar, District- Cumilla</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Residence of Sayada Nafiza Rahman’s mother at House-QDDL-122/03, Mannan Villa, Khilgaon, Dhaka South City Corporation, District- Dhaka</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Residence of Iqbal Ahmmed’s Father at Village-Donaiya, Police Station- Kachua, District- Chandpur</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Restrictions &amp; Limitations</w:t></w:r></w:p>
    <w:p><w:r><w:t>Our reports and comments are confidential in nature and are meant only for the internal use of the client to make an assessment of the background of the applicant.</w:t></w:r></w:p>
  `;

  const docxFile = await buildSampleDocxPackage(
    '2895-001083_Iqbal_Ahmmed_Greece.docx',
    xmlParagraphs
  );

  const uploadSpecs: {
    name: string;
    title: string;
    badge: string;
    orient: 'Portrait' | 'Landscape';
  }[] = [
    {
      name: 'Copy of Marriage Certificate verified by the Kazi.jpg',
      title: 'Copy of Marriage Certificate verified by the Kazi',
      badge: 'ANNEXURE A',
      orient: 'Portrait',
    },
    {
      name: 'Copy of Extract from the Marriage Register (1).jpg',
      title: 'Extract from the Marriage Register (Page 01 of 02)',
      badge: 'ANNEXURE B',
      orient: 'Portrait',
    },
    {
      name: 'Copy of Extract from the Marriage Register (2).jpg',
      title: 'Extract from the Marriage Register (Page 02 of 02)',
      badge: 'ANNEXURE C',
      orient: 'Portrait',
    },
    {
      name: 'Photograph of Kazi- Kazi Md. Zaherul Islam.jpg',
      title: 'Photograph of Kazi- Kazi Md. Zaherul Islam',
      badge: 'ANNEXURE D (SINGLE-PHOTO)',
      orient: 'Landscape',
    },
    {
      name: 'Copy of Family Certificate verified by referee.jpg',
      title: 'Copy of Family Certificate verified by referee',
      badge: 'ANNEXURE E',
      orient: 'Portrait',
    },
    {
      name: 'Photograph of Union Parishad.jpg',
      title: 'Photograph of Union Parishad',
      badge: 'ANNEXURE F (SINGLE-PHOTO)',
      orient: 'Landscape',
    },
    {
      name: 'Copy of Birth Registration Certificate of Ishtiaque Ahmed.jpg',
      title: 'Birth Registration Certificate of Ishtiaque Ahmed',
      badge: 'ANNEXURE G',
      orient: 'Portrait',
    },
    {
      name: 'Screenshot taken from National Database (Ishtiaque Ahmed).jpg',
      title: 'Screenshot taken from National Database (Ishtiaque Ahmed)',
      badge: 'ANNEXURE H',
      orient: 'Portrait',
    },
    {
      name: 'Copy of Birth Registration Certificate of Iqbal Ahmmed.jpg',
      title: 'Birth Registration Certificate of Iqbal Ahmmed',
      badge: 'ANNEXURE I',
      orient: 'Portrait',
    },
    {
      name: 'Screenshot taken from National Database (Iqbal Ahmmed).jpg',
      title: 'Screenshot taken from National Database (Iqbal Ahmmed)',
      badge: 'ANNEXURE J',
      orient: 'Portrait',
    },
    {
      name: '1st page of Sponsor Passport.jpg',
      title: '1st page of Sponsor Passport',
      badge: 'ANNEXURE K',
      orient: 'Portrait',
    },
    {
      name: 'First Entry and Exit STAMP of Sponsor after Legalization.jpg',
      title: 'First Entry and Exit STAMP of Sponsor after Legalization',
      badge: 'ANNEXURE L',
      orient: 'Portrait',
    },
    {
      name: 'Last Entry and Exit STAMPs of Sponsor.jpg',
      title: 'Last Entry and Exit STAMPs of Sponsor',
      badge: 'ANNEXURE M',
      orient: 'Portrait',
    },
    {
      name: 'A Marriage photograph of Iqbal Ahmmed with his wife- Sayada Nafiza Rahman collected during our visit.jpg',
      title: 'Marriage photograph of Iqbal Ahmmed with his wife Sayada Nafiza Rahman',
      badge: 'PHOTO N.1',
      orient: 'Landscape',
    },
    {
      name: 'A photograph of Iqbal Ahmmed collected during our visit.jpg',
      title: 'A photograph of Iqbal Ahmmed collected during our visit',
      badge: 'PHOTO N.2',
      orient: 'Portrait',
    },
    {
      name: 'A photograph of Iqbal Ahmmed with his wife- Sayada Nafiza Rahman, two Sons-Ishtiaque Ahmed, Elman Ahmmed and Daughter-Zaynab Ahmed collected during our visit.jpg',
      title: 'Iqbal Ahmmed with Wife, Two Sons and Daughter',
      badge: 'PHOTO N.3',
      orient: 'Landscape',
    },
    {
      name: 'Iqbal Ahmmed wife Sayada Nafiza Rahman Paternal Aunt Rabeya Khatun.jpg',
      title: 'Paternal Aunt Rabeya Khatun',
      badge: 'PHOTO N.4',
      orient: 'Landscape',
    },
    {
      name: 'Iqbal Ahmmed wife Sayada Nafiza Rahman Mother and Brother Sayed Md Forhad Aziz.jpg',
      title: 'Mother and Brother Sayed Md. Forhad Aziz',
      badge: 'PHOTO N.5',
      orient: 'Landscape',
    },
    {
      name: 'Iqbal Ahmmed Paternal Nephew Abu Adnan.jpg',
      title: 'Paternal Nephew Abu Adnan',
      badge: 'PHOTO N.6',
      orient: 'Landscape',
    },
    {
      name: 'Sold Address of Sayada Nafiza Rahman Father at Thakurpara 02 No Kandirpar Cumilla.jpg',
      title: 'Sold Address at Thakurpara Kandirpar Cumilla',
      badge: 'PHOTO N.7',
      orient: 'Landscape',
    },
    {
      name: 'Residence of Sayada Nafiza Rahman mother at House QDDL-122-03 Mannan Villa Khilgaon Dhaka.jpg',
      title: 'Residence at Mannan Villa Khilgaon Dhaka',
      badge: 'PHOTO N.8',
      orient: 'Landscape',
    },
    {
      name: 'Residence of Iqbal Ahmmed Father at Village Donaiya Police Station Kachua Chandpur.jpg',
      title: 'Residence at Village Donaiya Kachua Chandpur',
      badge: 'PHOTO N.9',
      orient: 'Landscape',
    },
  ];

  const uploadCopyFiles = await Promise.all(
    uploadSpecs.map((s) =>
      createSyntheticJpgFile(
        s.name,
        s.title,
        'Source: Upload Copy (Primary Verification Scan)',
        s.badge,
        s.orient,
        '#0F172A'
      )
    )
  );

  return { docxFile, uploadCopyFiles, applicantCopyFiles: [] };
}

// ============================================================================
// REAL REPORT PATTERN 3: BUSHRA AKTER — Embassy of Finland, New Delhi
// Annexures A-G (7 Referee / Upload Copy Targets) + Annexures H-L (5 Applicant Copy Targets)
// Total Headings = 12, Total Attachment Targets = 12
// ============================================================================
export async function generateBushraAkterFinlandReportBundle(): Promise<{
  docxFile: File;
  uploadCopyFiles: File[];
  applicantCopyFiles: File[];
}> {
  const xmlParagraphs = `
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Verification Report — Strictly Confidential</w:t></w:r></w:p>
    <w:p><w:r><w:t>Name of Applicant: BUSHRA AKTER | Gender: FEMALE | Client Name: Embassy of Finland, New Delhi | Status: RED</w:t></w:r></w:p>
    <w:p><w:r><w:t>Refer Annexure A-E: Copy of Marriage Certificate and Nikahnamas Verified by Referee.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Refer Annexure F-G: Copy of Extract from Marriage Register.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Refer Annexure H-L: Copy of Marriage Certificate and Nikahnamas Provided by Applicant.</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure A: Copy of Marriage Certificate Verified by Referee</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure B: Copy of Nikahnama (English) Verified by Referee (Page 01 of 02)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure C: Copy of Nikahnama (English) Verified by Referee (Page 02 of 02)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure D: Copy of Nikahnama (Bangla) Verified by Referee (Page 01 of 02)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure E: Copy of Nikahnama (Bangla) Verified by Referee (Page 02 of 02)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure F: Copy of Extract from the Marriage Register (Page 01 of 02)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure G: Copy of Extract from the Marriage Register (Page 02 of 02)</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure H: Copy of Marriage Certificate Provided by Applicant</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure I: Copy of Nikahnama (English) Provided by Applicant (Page 01 of 02)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure J: Copy of Nikahnama (English) Provided by Applicant (Page 02 of 02)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure K: Copy of Nikahnama (Bangla) Provided by Applicant (Page 01 of 02)</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Annexure L: Copy of Nikahnama (Bangla) Provided by Applicant (Page 02 of 02)</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Restrictions &amp; Limitations</w:t></w:r></w:p>
    <w:p><w:r><w:t>Our reports and comments are confidential in nature and are meant only for the internal use of the client to make an assessment of the background of the applicant.</w:t></w:r></w:p>
    <w:p><w:r><w:t>End of Report</w:t></w:r></w:p>
  `;

  const docxFile = await buildSampleDocxPackage(
    'Bushra_Akter_Finland.docx',
    xmlParagraphs
  );

  const uploadSpecs = [
    {
      name: 'Copy of Marriage Certificate Verified by Referee.jpg',
      title: 'Marriage Certificate Verified by Referee',
      badge: 'ANNEXURE A',
    },
    {
      name: 'Copy of Nikahnama (English) (1).jpg',
      title: 'Nikahnama (English) Verified by Referee (Page 01 of 02)',
      badge: 'ANNEXURE B',
    },
    {
      name: 'Copy of Nikahnama (English) (2).jpg',
      title: 'Nikahnama (English) Verified by Referee (Page 02 of 02)',
      badge: 'ANNEXURE C',
    },
    {
      name: 'Copy of Nikahnama (Bangla) (1).jpg',
      title: 'Nikahnama (Bangla) Verified by Referee (Page 01 of 02)',
      badge: 'ANNEXURE D',
    },
    {
      name: 'Copy of Nikahnama (Bangla) (2).jpg',
      title: 'Nikahnama (Bangla) Verified by Referee (Page 02 of 02)',
      badge: 'ANNEXURE E',
    },
    {
      name: 'Copy of Extract from the Marriage Register (1).jpg',
      title: 'Extract from the Marriage Register (Page 01 of 02)',
      badge: 'ANNEXURE F',
    },
    {
      name: 'Copy of Extract from the Marriage Register (2).jpg',
      title: 'Extract from the Marriage Register (Page 02 of 02)',
      badge: 'ANNEXURE G',
    },
  ];

  const uploadCopyFiles = await Promise.all(
    uploadSpecs.map((s) =>
      createSyntheticJpgFile(
        s.name,
        s.title,
        'Source: Upload Copy (Referee Attested)',
        s.badge,
        'Portrait',
        '#0F172A'
      )
    )
  );

  const applicantSpecs = [
    {
      name: 'Copy of Marriage Certificate Provided by Applicant.jpeg',
      title: 'Marriage Certificate Provided by Applicant',
      badge: 'ANNEXURE H',
    },
    {
      name: 'Copy of Nikahnama (English) Provided by Applicant (1).jpeg',
      title: 'Nikahnama (English) Provided by Applicant (Page 01 of 02)',
      badge: 'ANNEXURE I',
    },
    {
      name: 'Copy of Nikahnama (English) Provided by Applicant (2).jpeg',
      title: 'Nikahnama (English) Provided by Applicant (Page 02 of 02)',
      badge: 'ANNEXURE J',
    },
    {
      name: 'Copy of Nikahnama (Bangla) Provided by Applicant (1).jpeg',
      title: 'Nikahnama (Bangla) Provided by Applicant (Page 01 of 02)',
      badge: 'ANNEXURE K',
    },
    {
      name: 'Copy of Nikahnama (Bangla) Provided by Applicant (2).jpeg',
      title: 'Nikahnama (Bangla) Provided by Applicant (Page 02 of 02)',
      badge: 'ANNEXURE L',
    },
  ];

  const applicantCopyFiles = await Promise.all(
    applicantSpecs.map((s) =>
      createSyntheticJpgFile(
        s.name,
        s.title,
        'Source: Applicant Copy (Submitted by Applicant)',
        s.badge,
        'Portrait',
        '#4338CA'
      )
    )
  );

  return { docxFile, uploadCopyFiles, applicantCopyFiles };
}

export interface DuplicateVerificationTestReport {
  passed: boolean;
  insertedCount: number;
  expectedCount: number;
  mediaFilesCount: number;
  drawingsCount: number;
  details: string[];
}

/**
 * Rule 9 Verification Test:
 * Tests the complete pipeline with:
 * - 1 photograph
 * - 1 certificate
 * - 1 Nikahnama
 * - 1 Extract
 * - same file selected twice (duplicate copy)
 * - Re-Run Matcher (resetting and matching again)
 * - Generating Final DOCX multiple times
 *
 * Confirms each intended source appears exactly ONCE in final DOCX.
 */
export async function runDuplicateAttachmentVerificationTest(): Promise<DuplicateVerificationTestReport> {
  const details: string[] = [];

  // 1. Create a DOCX with 4 distinct targets:
  // - Annexure A: Photograph of Applicant
  // - Annexure B: School Certificate
  // - Annexure C: Nikahnama
  // - Annexure D: Extract
  const xml = `
    <w:p><w:r><w:t>Background Verification Report — Embassy of Austria</w:t></w:r></w:p>
    <w:p><w:r><w:t>Annexure A: Photograph of Applicant</w:t></w:r></w:p>
    <w:p><w:r><w:t>[Attachment area]</w:t></w:r></w:p>
    <w:p><w:r><w:t>Annexure B: School Certificate</w:t></w:r></w:p>
    <w:p><w:r><w:t>[Attachment area]</w:t></w:r></w:p>
    <w:p><w:r><w:t>Annexure C: Nikahnama</w:t></w:r></w:p>
    <w:p><w:r><w:t>[Attachment area]</w:t></w:r></w:p>
    <w:p><w:r><w:t>Annexure D: Extract of Marriage Register</w:t></w:r></w:p>
    <w:p><w:r><w:t>[Attachment area]</w:t></w:r></w:p>
    <w:p><w:r><w:t>End of Report</w:t></w:r></w:p>
  `;
  const docxFile = await buildSampleDocxPackage('Duplicate_Verification_Test.docx', xml);

  // 2. Create the test source files:
  // - 1 photograph
  // - 1 certificate
  // - 1 Nikahnama
  // - 1 Extract
  // - PLUS a duplicate file (same file selected twice)
  const photoFile = await createSyntheticJpgFile('Applicant Photograph.jpg', 'Photograph of Applicant', 'Photo Test', 'ANNEXURE A', 'Portrait', '#0284C7');
  const certFile = await createSyntheticJpgFile('School Certificate.jpg', 'School Leaving Certificate', 'Cert Test', 'ANNEXURE B', 'Portrait', '#10B981');
  const nikahFile = await createSyntheticJpgFile('Nikahnama.jpg', 'Muslim Marriage Nikahnama', 'Nikah Test', 'ANNEXURE C', 'Portrait', '#6366F1');
  const extractFile = await createSyntheticJpgFile('Extract.jpg', 'Extract of Marriage Register', 'Extract Test', 'ANNEXURE D', 'Portrait', '#F59E0B');
  // Duplicate copy of Nikahnama with identical name and content (selected twice)
  const dupNikahFile = await createSyntheticJpgFile('Nikahnama.jpg', 'Muslim Marriage Nikahnama', 'Nikah Test', 'ANNEXURE C', 'Portrait', '#6366F1');

  // 3. Inspect images
  const inspectedPhoto = await inspectUploadedJpgFile(photoFile, 'upload_copy', DEFAULT_ADMIN_SETTINGS);
  const inspectedCert = await inspectUploadedJpgFile(certFile, 'upload_copy', DEFAULT_ADMIN_SETTINGS);
  const inspectedNikah = await inspectUploadedJpgFile(nikahFile, 'upload_copy', DEFAULT_ADMIN_SETTINGS);
  const inspectedExtract = await inspectUploadedJpgFile(extractFile, 'upload_copy', DEFAULT_ADMIN_SETTINGS);
  const inspectedDupNikah = await inspectUploadedJpgFile(dupNikahFile, 'applicant_copy', DEFAULT_ADMIN_SETTINGS);

  const images = [inspectedPhoto, inspectedCert, inspectedNikah, inspectedExtract, inspectedDupNikah];

  // 4. Parse DOCX into targets
  const parsed = await parseDocxFile(docxFile, DEFAULT_ADMIN_SETTINGS, images.map(i => i.filename));
  details.push(`Step 1: Parsed ${parsed.attachmentTargets.length} attachment targets from DOCX template.`);

  // 5. Initial Matcher pass
  const matchPass1 = runMultiFactorAutoMatcher(parsed.attachmentTargets, images, 'Austria', DEFAULT_ADMIN_SETTINGS);
  const initialMatchedCount = matchPass1.updatedTargets.filter(t => t.assignedImageId).length;
  details.push(`Step 2: Initial Matcher Pass assigned ${initialMatchedCount} targets (duplicate file safely skipped).`);

  // 6. Test Re-Run Matcher (Pass 2)
  const resetTargets = matchPass1.updatedTargets.map(t => ({
    ...t,
    status: 'PENDING' as const,
    assignedImageId: null,
    orientation: '—' as const,
  }));
  const matchPass2 = runMultiFactorAutoMatcher(resetTargets, images, 'Austria', DEFAULT_ADMIN_SETTINGS);
  const rerunMatchedCount = matchPass2.updatedTargets.filter(t => t.assignedImageId).length;
  details.push(`Step 3: Re-Run Matcher Pass assigned ${rerunMatchedCount} targets.`);

  // 7. Test DOCX generation multiple times
  // First build
  const docxBuild1 = await insertImagesAndBuildDocx(docxFile, matchPass2.updatedTargets, images, 'Austria', DEFAULT_ADMIN_SETTINGS);
  details.push(`Step 4: DOCX Generation Run 1 inserted ${docxBuild1.insertedCount} images.`);

  // Second build (simulating clicking Generate multiple times)
  const docxBuild2 = await insertImagesAndBuildDocx(docxFile, matchPass2.updatedTargets, images, 'Austria', DEFAULT_ADMIN_SETTINGS);
  details.push(`Step 5: DOCX Generation Run 2 inserted ${docxBuild2.insertedCount} images.`);

  // 8. Inspect the resulting ZIP to verify exact counts
  const zip = await JSZip.loadAsync(await docxBuild2.blob.arrayBuffer());
  const docXml = await zip.file('word/document.xml')?.async('string') || '';
  const drawingsCount = (docXml.match(/<w:drawing\b/g) || []).length;
  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string') || '';
  const imageRelsCount = (relsXml.match(/Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/image"/g) || []).length;
  const mediaFiles = Object.keys(zip.files).filter(k => k.startsWith('word/media/'));

  details.push(`Verification: drawings in document.xml = ${drawingsCount}, image relationships = ${imageRelsCount}, media files in package = ${mediaFiles.length}`);

  const passed = drawingsCount === 4 && imageRelsCount === 4 && mediaFiles.length === 4 && docxBuild2.insertedCount === 4;

  if (passed) {
    details.push('PASS: Each of the 4 intended sources appears exactly ONCE. Zero duplicate attachments.');
  } else {
    details.push(`FAIL: Expected exactly 4 attachments, found ${drawingsCount} drawings and ${mediaFiles.length} media files.`);
  }

  return {
    passed,
    insertedCount: docxBuild2.insertedCount,
    expectedCount: 4,
    mediaFilesCount: mediaFiles.length,
    drawingsCount,
    details,
  };
}
