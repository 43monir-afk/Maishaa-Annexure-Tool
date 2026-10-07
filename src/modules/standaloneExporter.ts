import { sanitizeXmlText } from './openXmlValidator';

export type BloggerExportFormat = 'blogger_theme_xml' | 'standalone_html';

export interface XmlExportValidationResult {
  isValid: boolean;
  statusLabel: string;
  errorMessage: string | null;
  rootTagName: string | null;
  hasSingleRoot: boolean;
  hasNoTrailingMarkup: boolean;
  hasValidCdata: boolean;
  skinCount: number;
  isBrowserJsExecutable: boolean;
}

/**
 * Ensures no accidental CDATA opener or terminator exists inside the raw JS or CSS code.
 */
function makeCdataSafeContent(source: string): string {
  const cleaned = sanitizeXmlText(source)
    .replace(/<!\[CDATA\[/g, '/* CDATA_OPEN_REMOVED */')
    .replace(/\]\]>/g, ']]' + ']>');
  return cleaned.split(']]>').join("']' + ']>'");
}

/**
 * Robust clipboard copy that works both in standard windows and inside cross-origin iframes.
 */
export async function copyTextToClipboardRobust(text: string): Promise<boolean> {
  let copied = false;

  // 1. Synchronous textarea + execCommand('copy') works reliably inside iframes during user gesture
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    copied = document.execCommand('copy');
    document.body.removeChild(textArea);
  } catch {
    copied = false;
  }

  // 2. Also attempt navigator.clipboard.writeText if available
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // Keep result from execCommand fallback if clipboard-write policy blocked async API
    }
  }

  return copied;
}

/**
 * Shared Theme & Application CSS.
 * - In Blogger Theme XML: placed exclusively inside the single <b:skin><![CDATA[ ... ]]></b:skin>
 * - In Standalone HTML: placed inside a normal <style>...</style> block
 */
export function getMaishaaApplicationCss(): string {
  return `/*
-----------------------------------------------
Blogger Template Style
Name:     MAISHAA.ANNEXURE-TOOLS Theme
Designer: MAISHAA
Version:  1.0.0
----------------------------------------------- */
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 20px;
  background: #f1f5f9;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}
#main { display: none; }
#maishaa-annexure-tools {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  padding: 20px;
  max-width: 1180px;
  margin: 0 auto;
}
.msh-header-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 14px;
  margin-bottom: 16px;
}
.msh-brand-title {
  font-family: monospace;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f172a;
}
.msh-brand-subtitle {
  font-size: 12px;
  color: #475569;
  margin-top: 2px;
}
.msh-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.msh-label {
  font-size: 12px;
  font-weight: 600;
}
.msh-select {
  font-size: 12px;
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
}
.msh-btn-reset {
  font-size: 12px;
  padding: 6px 12px;
  background: #fff1f2;
  color: #be123c;
  border: 1px solid #fecdd3;
  cursor: pointer;
  font-weight: 600;
}
.msh-input-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.msh-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 14px;
}
.msh-card-title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}
.msh-file-input {
  font-size: 12px;
  width: 100%;
}
.msh-file-meta {
  font-size: 11px;
  font-family: monospace;
  color: #475569;
  margin-top: 8px;
}
.msh-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
  gap: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 12px;
  margin-bottom: 16px;
  font-size: 12px;
}
.msh-stat-caption {
  color: #64748b;
  display: block;
}
.msh-stat-val {
  font-family: monospace;
  font-size: 15px;
  font-weight: 700;
}
.msh-stat-val-green {
  font-family: monospace;
  font-size: 15px;
  font-weight: 700;
  color: #047857;
}
.msh-stat-val-amber {
  font-family: monospace;
  font-size: 15px;
  font-weight: 700;
  color: #b45309;
}
.msh-stat-val-sm {
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
}
.msh-border-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 12px 14px;
  margin-bottom: 16px;
}
.msh-border-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.msh-border-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.msh-border-sub {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}
.msh-border-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.msh-country-btn {
  font-size: 12px;
  padding: 6px 12px;
  background: #f8fafc;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  font-weight: 600;
}
.msh-country-btn-active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}
.msh-apply-border-btn {
  font-size: 12px;
  padding: 6px 14px;
  background: #047857;
  color: #ffffff;
  border: 1px solid #065f46;
  cursor: pointer;
  font-weight: 600;
}
.msh-border-confirm {
  display: none;
  margin-top: 8px;
  padding: 6px 10px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  font-size: 11px;
  font-family: monospace;
}
.msh-action-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 12px;
  margin-bottom: 12px;
}
.msh-partial-banner {
  display: none;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  color: #78350f;
  padding: 10px 12px;
  margin-bottom: 16px;
  font-size: 12px;
  line-height: 1.5;
}
.msh-partial-list {
  font-family: monospace;
  font-size: 11px;
  margin-top: 4px;
}
.msh-checkbox-label {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.msh-btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.msh-btn-secondary {
  font-size: 12px;
  padding: 8px 14px;
  background: #f1f5f9;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  font-weight: 600;
}
.msh-btn-primary {
  font-size: 12px;
  padding: 8px 16px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  cursor: pointer;
  font-weight: 600;
}
.msh-btn-download {
  font-size: 12px;
  padding: 8px 16px;
  background: #047857;
  color: #ffffff;
  border: none;
  cursor: pointer;
  font-weight: 600;
  opacity: 0.4;
}
.msh-table-wrap {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  overflow-x: auto;
  margin-bottom: 16px;
}
.msh-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: left;
}
.msh-thead {
  background: #f1f5f9;
  border-bottom: 1px solid #cbd5e1;
}
.msh-th {
  padding: 8px 10px;
}
.msh-td-empty {
  padding: 20px;
  text-align: center;
  color: #94a3b8;
}
.msh-console {
  background: #0f172a;
  color: #e2e8f0;
  font-family: monospace;
  font-size: 11px;
  padding: 12px;
  height: 170px;
  overflow-y: auto;
}`;
}

/**
 * Shared inner UI HTML markup (strictly well-formed XHTML/XML inside #maishaa-annexure-tools,
 * with zero <style> and zero <script> tags).
 */
function getMaishaaUiMarkup(): string {
  return `  <div id="maishaa-annexure-tools">
    <div class="msh-header-bar">
      <div>
        <div class="msh-brand-title">MAISHAA.ANNEXURE-TOOLS</div>
        <div class="msh-brand-subtitle">100% Client-Side DOCX Annexure Image Matcher &amp; OpenXML Word Automator &#183; Zero Server Upload</div>
      </div>
      <div class="msh-toolbar-right">
        <label class="msh-label" for="msh-country">Country Profile:</label>
        <select class="msh-select" id="msh-country" onchange="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onCountryChange();">
          <option value="Auto Detect">Auto Detect (Embassy / Client Name)</option>
          <option value="Austria">Austria / Austia (1.5 pt / 19050 EMU)</option>
          <option value="Greece">Greece (0.75 pt / 9525 EMU)</option>
          <option value="Finland">Finland (0.75 pt / 9525 EMU)</option>
          <option value="Italy">Italy (0.75 pt / 9525 EMU)</option>
          <option value="Other">Other (0.75 pt / 9525 EMU)</option>
        </select>
        <button class="msh-btn-reset" id="msh-reset-btn" onclick="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onReset();" type="button">Reset All</button>
      </div>
    </div>

    <div class="msh-input-grid">
      <div class="msh-card">
        <div class="msh-card-title">A. WORD DOCUMENT (.DOCX)</div>
        <input accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" class="msh-file-input" id="msh-docx-input" onchange="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onDocxInput(this);" type="file" />
        <div class="msh-file-meta" id="msh-docx-meta">No DOCX loaded</div>
      </div>
      <div class="msh-card">
        <div class="msh-card-title">B. UPLOAD COPY (PRIMARY &#183; REFEREE / FIELD)</div>
        <input accept=".jpg,.jpeg,image/jpeg" class="msh-file-input" id="msh-upload-input" multiple="multiple" onchange="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onUploadInput(this);" type="file" />
        <div class="msh-file-meta" id="msh-upload-meta">0 Upload Copy files</div>
      </div>
      <div class="msh-card">
        <div class="msh-card-title">C. APPLICANT COPY (SECONDARY)</div>
        <input accept=".jpg,.jpeg,image/jpeg" class="msh-file-input" id="msh-applicant-input" multiple="multiple" onchange="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onApplicantInput(this);" type="file" />
        <div class="msh-file-meta" id="msh-applicant-meta">0 Applicant Copy files</div>
      </div>
    </div>

    <div class="msh-border-panel" id="msh-border-panel">
      <div class="msh-border-header">
        <div>
          <div class="msh-border-title">COUNTRY BORDER PROFILE &#8212; <span id="msh-border-active-label">Auto Detect selected</span></div>
          <div class="msh-border-sub">Austria: 1.50 pt solid black (19050 EMU) &#183; Greece / Finland / Italy: 0.75 pt solid black (9525 EMU)</div>
        </div>
        <div class="msh-border-btns">
          <button class="msh-country-btn" data-country="Austria" id="msh-cbtn-austria" onclick="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onSelectCountryBtn('Austria');" type="button">Austria</button>
          <button class="msh-country-btn" data-country="Greece" id="msh-cbtn-greece" onclick="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onSelectCountryBtn('Greece');" type="button">Greece</button>
          <button class="msh-country-btn" data-country="Finland" id="msh-cbtn-finland" onclick="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onSelectCountryBtn('Finland');" type="button">Finland</button>
          <button class="msh-country-btn" data-country="Italy" id="msh-cbtn-italy" onclick="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onSelectCountryBtn('Italy');" type="button">Italy</button>
          <button class="msh-country-btn msh-country-btn-active" data-country="Auto Detect" id="msh-cbtn-auto" onclick="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onSelectCountryBtn('Auto Detect');" type="button">Auto Detect</button>
          <button class="msh-apply-border-btn" id="msh-apply-border-btn" onclick="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onApplyBorderRules();" type="button">Apply Border Rules</button>
        </div>
      </div>
      <div class="msh-border-confirm" id="msh-border-confirm"></div>
    </div>

    <div class="msh-stats-grid">
      <div><span class="msh-stat-caption">Detected Country</span><strong class="msh-stat-val" id="msh-stat-country">&#8212;</strong></div>
      <div><span class="msh-stat-caption">Headings Scanned</span><strong class="msh-stat-val" id="msh-stat-headings">0</strong></div>
      <div><span class="msh-stat-caption">Attachment Targets</span><strong class="msh-stat-val" id="msh-stat-targets">0</strong></div>
      <div><span class="msh-stat-caption">Matched / Ready</span><strong class="msh-stat-val-green" id="msh-stat-matched">0</strong></div>
      <div><span class="msh-stat-caption">Pending</span><strong class="msh-stat-val-amber" id="msh-stat-pending">0</strong></div>
      <div><span class="msh-stat-caption">DOCX Validation</span><strong class="msh-stat-val-sm" id="msh-stat-valid">Idle</strong></div>
    </div>

    <div class="msh-action-bar">
      <label class="msh-checkbox-label">
        <input id="allow-partial-processing" onchange="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onCountryChange();" type="checkbox" /> Allow Partial Processing (when Pending &gt; 0)
      </label>
      <div class="msh-btn-group">
        <button class="msh-btn-secondary" id="msh-rematch-btn" onclick="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onRematch();" type="button">Re-Run Matcher</button>
        <button class="msh-btn-primary" id="msh-build-btn" onclick="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onBuild();" type="button">Generate &amp; Validate Final DOCX</button>
        <button class="msh-btn-download" disabled="disabled" id="msh-download-btn" onclick="if(window.MAISHAA_TOOLS)window.MAISHAA_TOOLS.onDownload();" type="button">Download Modified Word Document</button>
      </div>
    </div>

    <div class="msh-partial-banner" id="msh-partial-banner"></div>

    <div class="msh-table-wrap">
      <table class="msh-table">
        <thead class="msh-thead">
          <tr>
            <th class="msh-th">#</th>
            <th class="msh-th">Annexure Heading / Child Caption</th>
            <th class="msh-th">Target Kind</th>
            <th class="msh-th">Matched Image (Manual Override)</th>
            <th class="msh-th">Source</th>
            <th class="msh-th">Dimensions</th>
            <th class="msh-th">Border</th>
            <th class="msh-th">Status</th>
          </tr>
        </thead>
        <tbody id="msh-table-body">
          <tr><td class="msh-td-empty" colspan="8">Load a .DOCX file and JPG/JPEG images to view Annexure targets.</td></tr>
        </tbody>
      </table>
    </div>

    <div class="msh-console" id="msh-console"></div>
  </div>`;
}

/**
 * Complete Client-Side Application JavaScript for Standalone HTML & Blogger Theme XML.
 */
export function getMaishaaApplicationJavaScript(): string {
  const rawJs = `(function(){
  if (window.__MAISHAA_BOOTSTRAPPED__) return;
  window.__MAISHAA_BOOTSTRAPPED__ = true;

  var state = {
    docxFile: null,
    docxSignature: '',
    rawParagraphs: [],
    detectedCountry: 'Other',
    selectedCountry: 'Auto Detect',
    borderPt: 0.75,
    borderEmu: 9525,
    headings: [],
    targets: [],
    images: [],
    finalBlob: null,
    isBuilding: false
  };

  var BOUNDARIES = [
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
    'end of report'
  ];

  var PERSON_KW = [
    'applicant','husband','wife','father','faher','mother','son','sons',
    'daughter','daughters','brother','sister','aunt','uncle','nephew','niece',
    'family','marriage','couple','paternal','maternal','in law','in-law',
    'sponsor','neighbor','neighbour'
  ];

  var PHOTO_KW = [
    'photograph','photo','collected during our visit','taken during our visit',
    'during our visit','picture of'
  ];

  var LOC_KW = [
    'residence','rented residence','flat residence','house','address',
    'sold address','road','village','police station','district','city',
    'corporation','villa','project','thakurpara','sadar','chayabithi'
  ];

  var STOP = {
    'the':1,'and':1,'for':1,'with':1,'his':1,'her':1,'our':1,'copy':1,
    'of':1,'by':1,'in':1,'at':1,'to':1,'from':1,'collected':1,'during':1,
    'visit':1,'annexure':1
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function log(level, msg) {
    var el = byId('msh-console');
    if (!el) return;
    var div = document.createElement('div');
    var color = '#e2e8f0';
    if (level === 'ERROR') color = '#fda4af';
    else if (level === 'WARNING' || level === 'SKIP DUPLICATE') color = '#fcd34d';
    else if (level === 'SUCCESS' || level === 'MATCH' || level === 'VALIDATION') color = '#6ee7b7';
    div.style.color = color;
    div.style.marginBottom = '3px';
    div.textContent = '[' + new Date().toTimeString().split(' ')[0] + '] [' + level + '] ' + msg;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  }

  function sanitizeXml(str) {
    return String(str == null ? '' : str).replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/g, '');
  }

  function escAttr(str) {
    return sanitizeXml(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normText(s) {
    if (!s) return '';
    var noExt = String(s).replace(/\\.(jpg|jpeg|docx|doc)$/i, '');
    if (typeof noExt.normalize === 'function') {
      noExt = noExt.normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '');
    }
    return noExt
      .replace(/[^a-zA-Z0-9\\s]/g, ' ')
      .toLowerCase()
      .replace(/\\s+/g, ' ')
      .trim();
  }

  function canonSpell(s) {
    return String(s || '')
      .replace(/\\baustia\\b/g, 'austria')
      .replace(/\\bahmmed\\b/g, 'ahmed')
      .replace(/\\bahmed\\b/g, 'ahmed')
      .replace(/\\bfaher\\b/g, 'father')
      .replace(/\\bmunshigonj\\b/g, 'munshiganj')
      .replace(/\\bmunsiganj\\b/g, 'munshiganj')
      .replace(/\\bcomilla\\b/g, 'cumilla')
      .replace(/\\bchittagong\\b/g, 'chattogram')
      .replace(/\\bnikah nama\\b/g, 'nikahnama')
      .replace(/\\bmark sheet\\b/g, 'marksheet');
  }

  function isBrandingFile(filename) {
    var n = normText(filename);
    return n === 'logo' || n.indexOf('logo ') === 0 || /\\blogo$/.test(n) || n === 'watermark' || n === 'icon' || n === 'header logo';
  }

  function getXmlElements(root, prefixedTag, localTag) {
    if (!root || !root.getElementsByTagName) return [];
    var list = Array.from(root.getElementsByTagName(prefixedTag));
    if (list.length > 0) return list;
    if (root.getElementsByTagNameNS) {
      var nsList = Array.from(root.getElementsByTagNameNS('*', localTag));
      if (nsList.length > 0) return nsList;
    }
    var byLocal = Array.from(root.getElementsByTagName(localTag));
    if (byLocal.length > 0) return byLocal;
    var all = Array.from(root.getElementsByTagName('*'));
    return all.filter(function(el) {
      return el.localName === localTag || el.nodeName === prefixedTag || el.tagName === prefixedTag;
    });
  }

  function ensureJSZip() {
    if (typeof window.JSZip !== 'undefined') {
      return Promise.resolve(window.JSZip);
    }
    var urls = [
      'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
      'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
      'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
    ];
    return new Promise(function(resolve, reject) {
      var idx = 0;
      function tryNext() {
        if (typeof window.JSZip !== 'undefined') {
          resolve(window.JSZip);
          return;
        }
        if (idx >= urls.length) {
          reject(new Error('Unable to load JSZip library from CDN. Check internet connection.'));
          return;
        }
        var s = document.createElement('script');
        s.src = urls[idx++];
        s.async = true;
        s.onload = function() {
          if (typeof window.JSZip !== 'undefined') resolve(window.JSZip);
          else tryNext();
        };
        s.onerror = function() {
          tryNext();
        };
        document.head.appendChild(s);
      }
      tryNext();
    });
  }

  function fileToArrayBuffer(file) {
    if (file && typeof file.arrayBuffer === 'function') {
      return file.arrayBuffer();
    }
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(ev) { resolve(ev.target.result); };
      reader.onerror = function() { reject(new Error('Failed to read file: ' + (file ? file.name : 'unknown'))); };
      reader.readAsArrayBuffer(file);
    });
  }

  function detectCountry(filename, fullText) {
    var fn = String(filename || '').toLowerCase();
    if (fn.indexOf('austria') > -1 || fn.indexOf('austia') > -1) return 'Austria';
    if (fn.indexOf('finland') > -1) return 'Finland';
    if (fn.indexOf('greece') > -1) return 'Greece';
    if (fn.indexOf('italy') > -1) return 'Italy';

    var text = String(fullText || '');
    var headerZone = text.slice(0, 2500).toLowerCase();
    if (/embassy\\s+of\\s+(?:austria|austia)|austrian\\s+embassy/i.test(headerZone)) return 'Austria';
    if (/embassy\\s+of\\s+finland/i.test(headerZone)) return 'Finland';
    if (/embassy\\s+of\\s+greece/i.test(headerZone)) return 'Greece';
    if (/embassy\\s+of\\s+italy|italian\\s+embassy/i.test(headerZone)) return 'Italy';

    var clientMatch = headerZone.match(/client\\s+name[\\s:\\t]+([^\\n\\r]+)/i);
    if (clientMatch && clientMatch[1]) {
      var cLine = clientMatch[1].toLowerCase();
      if (cLine.indexOf('austria') > -1 || cLine.indexOf('austia') > -1) return 'Austria';
      if (cLine.indexOf('finland') > -1) return 'Finland';
      if (cLine.indexOf('greece') > -1) return 'Greece';
      if (cLine.indexOf('italy') > -1) return 'Italy';
    }

    var lowAll = text.toLowerCase();
    if (/embassy\\s+of\\s+(?:austria|austia)/i.test(lowAll)) return 'Austria';
    if (/embassy\\s+of\\s+finland/i.test(lowAll)) return 'Finland';
    if (/embassy\\s+of\\s+greece/i.test(lowAll)) return 'Greece';
    if (/embassy\\s+of\\s+italy/i.test(lowAll)) return 'Italy';
    if (headerZone.indexOf('austria') > -1 || headerZone.indexOf('austia') > -1) return 'Austria';
    if (headerZone.indexOf('finland') > -1) return 'Finland';
    if (headerZone.indexOf('greece') > -1) return 'Greece';
    if (headerZone.indexOf('italy') > -1) return 'Italy';
    return 'Other';
  }

  function getEffectiveCountry() {
    var selEl = byId('msh-country');
    var sel = state.selectedCountry || (selEl ? selEl.value : 'Auto Detect');
    return sel === 'Auto Detect' ? state.detectedCountry : sel;
  }

  function applyBorderRules(explicitConfirm) {
    var eff = getEffectiveCountry();
    var pt = eff === 'Austria' ? 1.5 : 0.75;
    var emu = Math.round(pt * 12700);
    state.borderPt = pt;
    state.borderEmu = emu;
    state.finalBlob = null;
    state.targets.forEach(function(t) {
      t.borderPt = pt;
      t.borderEmu = emu;
    });
    var dl = byId('msh-download-btn');
    if (dl) { dl.disabled = true; dl.style.opacity = '0.4'; }
    var labelCountry = state.selectedCountry === 'Auto Detect' ? ('Auto Detect (' + eff + ')') : eff;
    var msg = labelCountry + ' border profile applied: ' + pt.toFixed(2) + ' pt solid black border (' + emu + ' EMU) will be used for all inserted images.';
    var confirmEl = byId('msh-border-confirm');
    if (confirmEl) {
      confirmEl.style.display = 'block';
      confirmEl.textContent = msg;
    }
    if (explicitConfirm) {
      log('SUCCESS', msg);
    } else {
      log('INFO', msg);
    }
    renderUI();
  }

  function isCrossRef(text) {
    var low = text.trim().toLowerCase();
    var prefixes = ['refer annex','as mentioned in annex','see annex','our annexure records','report referring to annex','please refer to annex'];
    for (var i = 0; i < prefixes.length; i++) {
      if (low.indexOf(prefixes[i]) === 0) return true;
    }
    return false;
  }

  function extractLetter(text) {
    var m = text.trim().match(/^Annexure\\s*[-–—:.]?\\s*([A-Za-z0-9]{1,3})\\b/i);
    if (m && m[1]) {
      var tok = m[1].toUpperCase();
      if (tok === 'PHO' || tok === 'PIC' || tok === 'DOC' || tok === 'COP') return 'P';
      return tok;
    }
    return 'X';
  }

  function headingBody(text) {
    return text
      .trim()
      .replace(/^Annexure\\s*[-–—:.]?\\s*(?:[A-Za-z0-9]{1,3}\\s*[-–—:.]?\\s*)?/i, '')
      .replace(/[.:;\\-–—]+$/g, '')
      .replace(/\\s+/g, ' ')
      .trim();
  }

  function isMultiPhotoContainer(text) {
    var b = headingBody(text);
    if (!b) return false;
    return /^(?:photographs|photograph|photos|photo)$/i.test(b);
  }

  function isSinglePhotoHeading(text) {
    if (isMultiPhotoContainer(text)) return false;
    var b = headingBody(text);
    if (!b) return false;
    return /\\b(?:photograph|photographs|photo|photos)\\b\\s+(?:of|showing|depicting|at|in|from|taken|collected|[-–—:])|\\b(?:photograph|photo)\\s+\\w+/i.test(b);
  }

  function isBoundary(text) {
    var tr = text.trim();
    if (!tr) return false;
    var low = tr.toLowerCase();
    if (low === '[attachment area]' || low === '[image]' || low === '[photo]') return false;
    for (var i = 0; i < BOUNDARIES.length; i++) {
      if (low.indexOf(BOUNDARIES[i]) > -1) return true;
    }
    if (/^(conclusion|remarks|comments|observation|findings|recommendation|declaration|disclaimer|signature|confidential)$/i.test(tr)) {
      return true;
    }
    return false;
  }

  function isSubCaption(text, uploadedNorms) {
    var tr = text.trim();
    if (!tr || tr.length < 4 || tr.length > 300) return false;
    var low = tr.toLowerCase();
    if (low === '[attachment area]' || low === '[image]' || low === '[photo]') return false;
    if (isBoundary(tr) || isCrossRef(tr)) return false;
    var i;
    for (i = 0; i < PERSON_KW.length; i++) if (low.indexOf(PERSON_KW[i]) > -1) return true;
    for (i = 0; i < PHOTO_KW.length; i++) if (low.indexOf(PHOTO_KW[i]) > -1) return true;
    for (i = 0; i < LOC_KW.length; i++) if (low.indexOf(LOC_KW[i]) > -1) return true;
    var nText = normText(tr);
    if (uploadedNorms && uploadedNorms.length > 0) {
      for (i = 0; i < uploadedNorms.length; i++) {
        var fn = uploadedNorms[i];
        if (fn.length >= 5 && (nText.indexOf(fn) > -1 || fn.indexOf(nText) > -1)) return true;
      }
    }
    return false;
  }

  function isCertificateDoc(nameOrText) {
    if (!nameOrText) return false;
    var withoutExt = String(nameOrText).replace(/\.[a-zA-Z0-9]+$/i, '').trim();
    var lower = withoutExt
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
      lower.indexOf('nikahnama') > -1 ||
      lower.indexOf('nikah nama') > -1 ||
      lower.indexOf('nika nama') > -1 ||
      lower.indexOf('extract') > -1 ||
      lower.indexOf('extraxt') > -1
    ) {
      return true;
    }

    // Rule 1: Document/file name ending with "certificate" (case-insensitive)
    if (
      lower === 'certificate' ||
      (lower.length >= 12 && lower.lastIndexOf(' certificate') === lower.length - 12) ||
      (lower.length >= 11 && lower.lastIndexOf('certificate') === lower.length - 11)
    ) {
      return true;
    }

    var stripped = lower.replace(/\s+(?:\d+|\(\d+\)|copy|scan|page\s*\d+|p\s*\d+)\s*$/i, '').trim();
    if (
      stripped === 'certificate' ||
      (stripped.length >= 12 && stripped.lastIndexOf(' certificate') === stripped.length - 12) ||
      (stripped.length >= 11 && stripped.lastIndexOf('certificate') === stripped.length - 11)
    ) {
      return true;
    }
    return false;
  }

  function classifyTarget(text, isPhotoChild) {
    if (isCertificateDoc(text)) return 'Certificate';
    return 'Photograph';
  }

  function classifyImage(filename, w, h) {
    if (isCertificateDoc(filename)) return 'Certificate';
    return 'Photograph';
  }

  function resolveEffectiveCategory(targetCat, imageCat, isPhotoChild) {
    if (targetCat === 'Certificate' || imageCat === 'Certificate') return 'Certificate';
    return 'Photograph';
  }

  function getFinalWordImageSize(category, width, height) {
    var isLandscape = width > height;
    if (category === 'Certificate') {
      if (isLandscape) {
        // Landscape Certificate: H = 4.4", W = 6.27"
        return { width: 6.27, height: 4.40 };
      }
      // Portrait Certificate: H = 8.2", W = 5.8"
      return { width: 5.80, height: 8.20 };
    }
    // Rule 4: All other documents are treated as Photograph
    if (isLandscape) {
      return { width: 5.44, height: 4.10 };
    }
    return { width: 3.08, height: 4.10 };
  }

  function calcPlannedDims(w, h, category) {
    var safeW = w > 0 ? w : 1240;
    var safeH = h > 0 ? h : 1754;
    var cat = typeof category === 'boolean' ? (category ? 'Certificate' : 'Photograph') : (category || 'Photograph');
    var finalSize = getFinalWordImageSize(cat, safeW, safeH);
    var outW = finalSize.width;
    var outH = finalSize.height;
    return {
      widthInches: outW,
      heightInches: outH,
      emuWidth: Math.round(outW * 914400),
      emuHeight: Math.round(outH * 914400),
      label: outW.toFixed(2) + '" × ' + outH.toFixed(2) + '"'
    };
  }

  function buildAttachmentKey(sourceFilename, targetHeading, _targetIndexOrCode) {
    var normFile = String(sourceFilename || '').replace(/\.[a-zA-Z0-9]+$/i, '').trim().toLowerCase().replace(/[-_/:,.;()[\]{}|’'“”]/g, ' ').replace(/\s+/g, ' ').trim();
    var normHead = String(targetHeading || '').replace(/[-_/:,.;()[\]{}|’'“”]/g, ' ').toLowerCase().replace(/\s+/g, ' ').trim();
    return normFile + '::' + normHead;
  }

  function extractPage(s) {
    var m1 = String(s || '').match(/\\b(?:page|pg|p)\\s*[-_.:]?\\s*0*(\\d+)\\b/i);
    if (m1 && m1[1]) return parseInt(m1[1], 10);
    var m2 = String(s || '').match(/\\(0*(\\d+)\\)/);
    if (m2 && m2[1]) return parseInt(m2[1], 10);
    return null;
  }

  function extractCodeFromFile(filename) {
    var m1 = String(filename || '').match(/\\b(?:annex(?:ure)?|anx)\\s*[-_.:]?\\s*([a-zA-Z](?:[._-]\\d+)?)\\b/i);
    if (m1 && m1[1]) return m1[1].toUpperCase().replace(/[_-]/g, '.');
    var m2 = String(filename || '').match(/^([a-zA-Z])[._-](\\d+)\\b/);
    if (m2) return m2[1].toUpperCase() + '.' + m2[2];
    return null;
  }

  function levRatio(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    var la = a.length, lb = b.length;
    var maxL = Math.max(la, lb);
    if (maxL === 0) return 1;
    if (Math.abs(la - lb) > maxL * 0.45) return 0;
    var dp = [];
    for (var i = 0; i <= la; i++) {
      dp[i] = [i];
    }
    for (var j = 0; j <= lb; j++) {
      dp[0][j] = j;
    }
    for (var r = 1; r <= la; r++) {
      for (var c = 1; c <= lb; c++) {
        var cost = a.charAt(r - 1) === b.charAt(c - 1) ? 0 : 1;
        dp[r][c] = Math.min(dp[r - 1][c] + 1, dp[r][c - 1] + 1, dp[r - 1][c - 1] + cost);
      }
    }
    return 1 - (dp[la][lb] / maxL);
  }

  function hasConflict(a, b) {
    var pairs = [
      ['english','bangla'],
      ['official transcript','transcript details'],
      ['certificate','transcript'],
      ['rented residence','flat residence'],
      ['first entry','last entry'],
      ['ishtiaque','iqbal']
    ];
    for (var i = 0; i < pairs.length; i++) {
      var p0 = pairs[i][0], p1 = pairs[i][1];
      if (a.indexOf(p0) > -1 && a.indexOf(p1) === -1 && b.indexOf(p1) > -1 && b.indexOf(p0) === -1) return true;
      if (a.indexOf(p1) > -1 && a.indexOf(p0) === -1 && b.indexOf(p0) > -1 && b.indexOf(p1) === -1) return true;
    }
    return false;
  }

  function determineSource(text) {
    var low = text.toLowerCase();
    if (low.indexOf('provided by the applicant') > -1 || low.indexOf('provide by the applicant') > -1 || low.indexOf('provided by applicant') > -1 || low.indexOf('submitted by the applicant') > -1 || low.indexOf('obtained from the applicant') > -1) {
      return 'applicant_copy';
    }
    if (low.indexOf('verified by the referee') > -1 || low.indexOf('verified by referee') > -1 || low.indexOf('verified by the kazi') > -1 || low.indexOf('verified by kazi') > -1 || low.indexOf('extract from the marriage register') > -1 || low.indexOf('screenshot taken from national database') > -1) {
      return 'upload_copy';
    }
    return 'any';
  }

  function scanParagraphsIntoTargets() {
    if (!state.rawParagraphs || state.rawParagraphs.length === 0) return;
    var manualMap = {};
    var manualLaterMap = {};
    state.targets.forEach(function(t) {
      if (t.status === 'MANUAL' && t.assignedImageId) {
        manualMap[t.id] = t.assignedImageId;
      } else if (t.status === 'MANUAL_LATER') {
        manualLaterMap[t.id] = true;
      }
    });

    var uploadedNorms = state.images.filter(function(img){ return !img.isBranding; }).map(function(img){ return img.normName; });
    state.headings = [];
    state.targets = [];
    var container = null;
    var childIdx = 0;

    for (var i = 0; i < state.rawParagraphs.length; i++) {
      var p = state.rawParagraphs[i];
      var tr = p.text.replace(/^[\\u200B-\\u200F\\uFEFF]+/, '').trim();
      if (!tr) continue;
      if (isCrossRef(tr)) continue;

      if (tr.length >= 6 && /^Annexure\\b/i.test(tr)) {
        var letter = extractLetter(tr);
        var isMulti = isMultiPhotoContainer(tr);
        var isSingle = !isMulti && isSinglePhotoHeading(tr);
        var hObj = {
          id: 'h_' + p.index,
          letter: letter,
          text: tr,
          kind: isMulti ? 'multi_photo_container' : (isSingle ? 'single_photo' : 'normal'),
          childCount: 0
        };
        state.headings.push(hObj);

        if (isMulti) {
          container = hObj;
          childIdx = 0;
        } else {
          container = null;
          var tid = 't_' + p.index;
          var clean = tr.replace(/\\b(?:verified\\s+by\\s+(?:the\\s+)?(?:referees?|kazi|registrar|chairman)|provided\\s+by\\s+(?:the\\s+)?applicant|submitted\\s+by\\s+(?:the\\s+)?applicant)\\b/gi, ' ').replace(/\\s+/g, ' ').trim();
          var tClass = classifyTarget(tr, false);
          var initLabel = tClass === 'Certificate' ? '5.80" × 8.20"' : (isSingle ? '5.44" × 4.10"' : '3.08" × 4.10"');
          state.targets.push({
            id: tid,
            code: letter,
            kind: isSingle ? 'single_photo' : 'normal',
            isPhotoChild: false,
            pIndex: p.index,
            rawText: tr,
            cleanText: clean,
            classification: tClass,
            expectedSource: determineSource(tr),
            assignedImageId: manualMap[tid] || null,
            status: manualLaterMap[tid] ? 'MANUAL_LATER' : (manualMap[tid] ? 'MANUAL' : 'PENDING'),
            plannedDimsLabel: initLabel
          });
        }
        continue;
      }

      if (container) {
        var low = tr.toLowerCase();
        if (low === '[attachment area]' || low === '[image]' || low === '[photo]') continue;
        if (isBoundary(tr)) {
          container = null;
          continue;
        }
        if (isSubCaption(tr, uploadedNorms)) {
          childIdx++;
          container.childCount = childIdx;
          var ctid = 't_' + container.id + '_' + childIdx + '_p' + p.index;
          state.targets.push({
            id: ctid,
            code: container.letter + '.' + childIdx,
            kind: 'photo_child',
            isPhotoChild: true,
            pIndex: p.index,
            rawText: tr,
            cleanText: tr,
            classification: classifyTarget(tr, true),
            expectedSource: 'any',
            assignedImageId: manualMap[ctid] || null,
            status: manualLaterMap[ctid] ? 'MANUAL_LATER' : (manualMap[ctid] ? 'MANUAL' : 'PENDING'),
            plannedDimsLabel: '5.44" × 4.10"'
          });
        }
      }
    }
  }

  function runMatcher() {
    var usedKeys = {};
    var usedIds = {};
    var activeImgs = state.images.filter(function(i){ return !i.isBranding; });

    state.targets.forEach(function(t) {
      if (t.status === 'MANUAL_LATER') {
        t.assignedImageId = null;
        return;
      }
      if (t.status === 'MANUAL' && t.assignedImageId) {
        var mImg = activeImgs.find(function(x){ return x.id === t.assignedImageId; });
        if (mImg) {
          usedKeys[mImg.sourceKey] = true;
          usedIds[mImg.id] = true;
          var effCat = resolveEffectiveCategory(t.classification, mImg.category, t.isPhotoChild);
          var mDims = calcPlannedDims(mImg.widthPx, mImg.heightPx, effCat);
          t.plannedDimsLabel = mDims.label;
          return;
        }
      }
      t.assignedImageId = null;
      t.status = 'PENDING';
    });

    var cands = [];
    for (var ti = 0; ti < state.targets.length; ti++) {
      var t = state.targets[ti];
      if (t.status === 'MANUAL' || t.status === 'MANUAL_LATER') continue;

      var stripped = t.cleanText.replace(/^Annexure\\s*[-–—:.]?\\s*[A-Za-z0-9]{1,3}\\s*[-–—:.]?\\s*/i, '').trim();
      var tNorm = canonSpell(normText(stripped || t.cleanText));
      var tFullNorm = canonSpell(normText(t.cleanText));
      var tPage = extractPage(t.rawText);
      var tToks = tNorm.split(' ').filter(function(w){ return w.length > 2 && !STOP[w]; });

      for (var ii = 0; ii < activeImgs.length; ii++) {
        var img = activeImgs[ii];

        if (t.isPhotoChild) {
          var isDocScan = img.category === 'Certificate' || img.category === 'Transcript' || img.category === 'Academic Record' || img.category === 'Passport';
          var allowsDoc = tNorm.indexOf('certificate') > -1 || tNorm.indexOf('transcript') > -1 || tNorm.indexOf('passport') > -1;
          if (isDocScan && !allowsDoc) continue;
        }

        if (img.source === 'applicant_copy' && t.expectedSource === 'upload_copy') continue;
        if (img.source === 'upload_copy' && t.expectedSource === 'applicant_copy') {
          var hasAppPool = activeImgs.some(function(x){ return x.source === 'applicant_copy'; });
          if (hasAppPool) continue;
        }

        var fNormRaw = img.normName;
        var fBase = fNormRaw.replace(/\\b0*\\d+\\b/g, ' ').replace(/\\s+/g, ' ').trim();
        var fNorm = canonSpell(fNormRaw);
        var fPage = extractPage(img.filename);
        var fCode = extractCodeFromFile(img.filename);

        if (tPage !== null && fPage !== null && tPage !== fPage) continue;
        if (hasConflict(tNorm, fNorm)) continue;

        var score = 0;
        if (fCode && fCode === t.code.toUpperCase()) {
          score = 0.99;
        } else if (fNorm.length >= 4 && (fNorm === tNorm || fNorm === tFullNorm)) {
          score = 0.98;
        } else if (fNorm.length >= 6 && (tNorm.indexOf(fNorm) > -1 || fNorm.indexOf(tNorm) > -1)) {
          score = (tPage !== null && fPage === tPage) ? 0.96 : 0.91;
        } else if (fBase.length >= 6 && tNorm.indexOf(fBase) > -1 && tPage !== null && fPage === tPage) {
          score = 0.95;
        } else {
          var fToks = fNorm.split(' ').filter(function(w){ return w.length > 2 && !STOP[w]; });
          if (fToks.length > 0 && tToks.length > 0) {
            var hits = 0;
            for (var fi = 0; fi < fToks.length; fi++) {
              var fw = fToks[fi];
              var matchedTok = tToks.some(function(tw){ return tw === fw || levRatio(tw, fw) >= 0.82; });
              if (matchedTok) hits++;
            }
            var ratio = hits / Math.max(1, Math.min(fToks.length, tToks.length));
            if (hits >= 2 && ratio >= 0.5) {
              score = 0.72 + ratio * 0.2;
              if (tPage !== null && fPage === tPage) score += 0.05;
            } else if (hits === 1 && fToks.length === 1 && fToks[0].length >= 6) {
              score = 0.68;
            }
          }
          if (score < 0.65) {
            var lr = levRatio(fNorm, tNorm);
            if (lr >= 0.76) score = lr * 0.9;
          }
        }

        if (score >= 0.62) {
          if (t.expectedSource === 'applicant_copy' && img.source === 'applicant_copy') score += 0.02;
          else if (t.expectedSource !== 'applicant_copy' && img.source === 'upload_copy') score += 0.01;
          cands.push({ ti: ti, img: img, score: Math.min(0.999, score) });
        }
      }
    }

    cands.sort(function(a, b){ return b.score - a.score; });
    var doneT = {};
    var usedAttachmentKeys = {};
    for (var c = 0; c < cands.length; c++) {
      var pair = cands[c];
      if (doneT[pair.ti]) continue;
      if (usedKeys[pair.img.sourceKey] || usedIds[pair.img.id]) continue;
      var targetObj = state.targets[pair.ti];
      var headText = targetObj.rawText || targetObj.cleanText;
      var aKey = buildAttachmentKey(pair.img.filename, headText, targetObj.pIndex);
      if (usedAttachmentKeys[aKey]) continue;

      doneT[pair.ti] = true;
      usedKeys[pair.img.sourceKey] = true;
      usedIds[pair.img.id] = true;
      usedAttachmentKeys[aKey] = true;
      targetObj.assignedImageId = pair.img.id;
      targetObj.status = pair.score >= 0.72 ? 'MATCHED' : 'REVIEW';
      var effPairCat = resolveEffectiveCategory(targetObj.classification, pair.img.category, targetObj.isPhotoChild);
      targetObj.plannedDimsLabel = calcPlannedDims(pair.img.widthPx, pair.img.heightPx, effPairCat).label;
    }

    renderUI();
  }

  function renderUI() {
    var eff = getEffectiveCountry();
    var borderPt = eff === 'Austria' ? 1.5 : 0.75;
    var borderEmu = Math.round(borderPt * 12700);
    state.borderPt = borderPt;
    state.borderEmu = borderEmu;
    var activeLabelEl = byId('msh-border-active-label');
    if (activeLabelEl) {
      activeLabelEl.textContent = (state.selectedCountry === 'Auto Detect' ? ('Auto Detect (' + eff + ')') : state.selectedCountry) + ' selected (' + borderPt.toFixed(2) + ' pt / ' + borderEmu + ' EMU)';
    }
    var btnIds = [
      { id: 'msh-cbtn-austria', val: 'Austria' },
      { id: 'msh-cbtn-greece', val: 'Greece' },
      { id: 'msh-cbtn-finland', val: 'Finland' },
      { id: 'msh-cbtn-italy', val: 'Italy' },
      { id: 'msh-cbtn-auto', val: 'Auto Detect' }
    ];
    btnIds.forEach(function(b) {
      var el = byId(b.id);
      if (el) {
        if (state.selectedCountry === b.val) el.className = 'msh-country-btn msh-country-btn-active';
        else el.className = 'msh-country-btn';
      }
    });
    var countrySelectEl = byId('msh-country');
    if (countrySelectEl && countrySelectEl.value !== state.selectedCountry) {
      countrySelectEl.value = state.selectedCountry;
    }
    var countryEl = byId('msh-stat-country');
    var headingsEl = byId('msh-stat-headings');
    var targetsEl = byId('msh-stat-targets');
    var matchedEl = byId('msh-stat-matched');
    var pendingEl = byId('msh-stat-pending');

    if (countryEl) countryEl.textContent = state.docxFile ? (eff + ' (' + borderPt + 'pt)') : '—';
    if (headingsEl) headingsEl.textContent = String(state.headings.length);
    if (targetsEl) targetsEl.textContent = String(state.targets.length);

    var matched = state.targets.filter(function(t){ return Boolean(t.assignedImageId) && t.status !== 'MANUAL_LATER'; }).length;
    var pendingBlocking = state.targets.filter(function(t){ return !t.assignedImageId && t.status !== 'MANUAL_LATER'; }).length;
    var unattachedTargets = state.targets.filter(function(t){ return !t.assignedImageId || t.status === 'MANUAL_LATER'; });
    var unattachedCount = unattachedTargets.length;
    if (matchedEl) matchedEl.textContent = String(matched);
    if (pendingEl) pendingEl.textContent = String(unattachedCount);

    var partialEl = byId('allow-partial-processing') || byId('msh-partial-toggle');
    var allowPartial = partialEl ? partialEl.checked : false;
    var buildBtn = byId('msh-build-btn');
    if (buildBtn) {
      var canBuild = Boolean(state.docxFile) && matched > 0 && (pendingBlocking === 0 || allowPartial) && !state.isBuilding;
      buildBtn.disabled = !canBuild;
      buildBtn.style.opacity = canBuild ? '1' : '0.45';
    }

    var dlBtn = byId('msh-download-btn');
    if (dlBtn) {
      dlBtn.textContent = unattachedCount > 0 ? 'Download Partial Modified DOCX (_PARTIAL_MODIFIED.docx)' : 'Download Modified Word Document';
    }

    var bannerEl = byId('msh-partial-banner');
    if (bannerEl) {
      if (state.docxFile && state.targets.length > 0) {
        bannerEl.style.display = 'block';
        var summaryHtml = '<div><strong>Total Targets:</strong> ' + state.targets.length + ' &#183; <strong>Attached Automatically / Manually:</strong> ' + matched + ' &#183; <strong>Left for Manual Attachment in Word:</strong> ' + unattachedCount + '</div>';
        if (unattachedCount > 0) {
          var warnHeader = (allowPartial || pendingBlocking === 0)
            ? '<div style="margin-top:4px;font-weight:700;color:#92400e;">Partial Processing Enabled: ' + unattachedCount + ' attachment target(s) will remain unattached for manual insertion in Word.</div>'
            : '<div style="margin-top:4px;font-weight:700;color:#be123c;">' + pendingBlocking + ' target(s) are still pending. Match them, select "-- Leave for Manual Attachment in Word --", or enable Partial Processing.</div>';
          var listHtml = '<div class="msh-partial-list">';
          unattachedTargets.forEach(function(u) {
            listHtml += '<div>Pending for manual attachment: ' + escAttr(u.code) + ' &#8212; ' + escAttr(u.rawText) + '</div>';
          });
          listHtml += '</div>';
          bannerEl.innerHTML = summaryHtml + warnHeader + listHtml;
        } else {
          bannerEl.innerHTML = summaryHtml;
        }
      } else {
        bannerEl.style.display = 'none';
        bannerEl.innerHTML = '';
      }
    }

    var uploadCount = state.images.filter(function(i){ return i.source === 'upload_copy'; }).length;
    var appCount = state.images.filter(function(i){ return i.source === 'applicant_copy'; }).length;
    var upMeta = byId('msh-upload-meta');
    var appMeta = byId('msh-applicant-meta');
    if (upMeta) upMeta.textContent = uploadCount + ' Upload Copy files loaded';
    if (appMeta) appMeta.textContent = appCount + ' Applicant Copy files loaded';

    var tbody = byId('msh-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (state.targets.length === 0) {
      tbody.innerHTML = '<tr><td class="msh-td-empty" colspan="8">Load a .DOCX file and JPG/JPEG images to view Annexure targets.</td></tr>';
      return;
    }

    var activeImgs = state.images.filter(function(i){ return !i.isBranding; });
    state.targets.forEach(function(t) {
      var tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #e2e8f0';
      var assigned = activeImgs.find(function(i){ return i.id === t.assignedImageId; });
      var manualLaterSel = t.status === 'MANUAL_LATER' ? ' selected="selected"' : '';
      var opts = '<option value="">-- Unassigned --</option><option value="__MANUAL_LATER__"' + manualLaterSel + '>-- Leave for Manual Attachment in Word --</option>';
      activeImgs.forEach(function(img) {
        var sel = (t.status !== 'MANUAL_LATER' && img.id === t.assignedImageId) ? ' selected="selected"' : '';
        var tag = img.source === 'upload_copy' ? '[Upload] ' : '[Applicant] ';
        opts += '<option value="' + img.id + '"' + sel + '>' + tag + escAttr(img.filename) + '</option>';
      });
      var kindBadge = t.kind === 'single_photo' ? 'Single-Photo Annexure' : (t.kind === 'photo_child' ? 'Photo Child Caption' : 'Normal Annexure');
      var statusColor = assigned ? '#047857' : (t.status === 'MANUAL_LATER' ? '#b45309' : '#be123c');
      tr.innerHTML =
        '<td style="padding:8px 10px; font-family:monospace; font-weight:700;">' + escAttr(t.code) + '</td>' +
        '<td style="padding:8px 10px;">' + escAttr(t.rawText) + '</td>' +
        '<td style="padding:8px 10px; font-family:monospace; font-size:11px;">' + kindBadge + '</td>' +
        '<td style="padding:8px 10px;"><select data-tid="' + escAttr(t.id) + '" class="msh-row-select" style="width:100%; font-size:11px; padding:4px; border:1px solid #cbd5e1; background:#fff;">' + opts + '</select></td>' +
        '<td style="padding:8px 10px; font-family:monospace; font-size:11px;">' + (assigned ? (assigned.source === 'upload_copy' ? 'Upload Copy' : 'Applicant Copy') : '—') + '</td>' +
        '<td style="padding:8px 10px; font-family:monospace; font-size:11px;">' + escAttr(t.plannedDimsLabel || '3.08" × 4.10"') + '</td>' +
        '<td style="padding:8px 10px; font-family:monospace; font-size:11px;">' + borderPt.toFixed(2) + ' pt (' + borderEmu + ' EMU)</td>' +
        '<td style="padding:8px 10px; font-family:monospace; font-weight:700; color:' + statusColor + ';">' + escAttr(t.status) + '</td>';
      tbody.appendChild(tr);
    });
  }

  function processDocxFile(file) {
    if (!file) return;
    var sig = file.name + '__' + file.size + '__' + file.lastModified;
    if (state.docxSignature === sig && state.headings.length > 0) return;
    state.docxFile = file;
    state.docxSignature = sig;
    state.finalBlob = null;

    var metaEl = byId('msh-docx-meta');
    if (metaEl) {
      metaEl.textContent = 'Reading ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)...';
      metaEl.style.color = '#0f172a';
    }
    var validEl = byId('msh-stat-valid');
    if (validEl) validEl.textContent = 'Idle';
    var dlBtn = byId('msh-download-btn');
    if (dlBtn) {
      dlBtn.disabled = true;
      dlBtn.style.opacity = '0.4';
    }

    ensureJSZip().then(function(JSZipLib) {
      return fileToArrayBuffer(file).then(function(buf) {
        return JSZipLib.loadAsync(buf);
      });
    }).then(function(zip) {
      var docEntry = zip.file('word/document.xml');
      if (!docEntry) throw new Error('Invalid DOCX: Missing word/document.xml inside archive.');
      return docEntry.async('string');
    }).then(function(xmlStr) {
      var cleanXml = sanitizeXml(xmlStr);
      var dom = new DOMParser().parseFromString(cleanXml, 'application/xml');
      var pNodes = getXmlElements(dom, 'w:p', 'p');
      var paras = pNodes.map(function(p, idx) {
        var tNodes = getXmlElements(p, 'w:t', 't');
        var raw = tNodes.map(function(t){ return t.textContent || ''; }).join('');
        return {
          index: idx,
          text: raw.replace(/\\u00A0/g, ' ').replace(/\\s+/g, ' ').trim()
        };
      });

      state.rawParagraphs = paras;
      var fullText = paras.map(function(p){ return p.text; }).join(' \\n ');
      state.detectedCountry = detectCountry(file.name, fullText);
      scanParagraphsIntoTargets();

      if (metaEl) {
        metaEl.textContent = file.name + ' (' + state.headings.length + ' headings, ' + state.targets.length + ' targets)';
        metaEl.style.color = '#047857';
      }
      log('INFO', 'Loaded DOCX "' + file.name + '" | Country: ' + state.detectedCountry + ' | Headings: ' + state.headings.length + ' | Targets: ' + state.targets.length);
      runMatcher();
    }).catch(function(err) {
      if (metaEl) {
        metaEl.textContent = 'Error loading DOCX: ' + (err && err.message ? err.message : String(err));
        metaEl.style.color = '#be123c';
      }
      log('ERROR', 'DOCX parse failed: ' + (err && err.message ? err.message : String(err)));
    });
  }

  function inspectSingleImageFile(file, source) {
    return new Promise(function(resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      var settled = false;
      var timer = setTimeout(function() {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        resolve({
          id: 'img_' + Math.random().toString(36).slice(2, 10),
          file: file,
          filename: file.name,
          normName: normText(file.name),
          sourceKey: normText(file.name) + '__' + file.size,
          source: source,
          widthPx: 1240,
          heightPx: 1754,
          category: classifyImage(file.name, 1240, 1754),
          isBranding: isBrandingFile(file.name)
        });
      }, 2500);

      img.onload = function() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        var w = img.naturalWidth || 1240;
        var h = img.naturalHeight || 1754;
        URL.revokeObjectURL(url);
        resolve({
          id: 'img_' + Math.random().toString(36).slice(2, 10),
          file: file,
          filename: file.name,
          normName: normText(file.name),
          sourceKey: normText(file.name) + '__' + file.size,
          source: source,
          widthPx: w,
          heightPx: h,
          category: classifyImage(file.name, w, h),
          isBranding: isBrandingFile(file.name)
        });
      };
      img.onerror = function() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve({
          id: 'img_' + Math.random().toString(36).slice(2, 10),
          file: file,
          filename: file.name,
          normName: normText(file.name),
          sourceKey: normText(file.name) + '__' + file.size,
          source: source,
          widthPx: 1240,
          heightPx: 1754,
          category: classifyImage(file.name, 1240, 1754),
          isBranding: isBrandingFile(file.name)
        });
      };
      img.src = url;
    });
  }

  function handleImageFiles(fileList, source) {
    if (!fileList || fileList.length === 0) return;
    var arr = Array.from(fileList);
    var toInspect = [];
    for (var i = 0; i < arr.length; i++) {
      var f = arr[i];
      var key = normText(f.name) + '__' + f.size;
      var exists = state.images.some(function(x){ return x.sourceKey === key && x.source === source; });
      if (!exists) {
        toInspect.push(inspectSingleImageFile(f, source));
      }
    }
    if (toInspect.length === 0) {
      renderUI();
      return;
    }

    Promise.all(toInspect).then(function(items) {
      items.forEach(function(item) {
        var dup = state.images.some(function(x){ return x.sourceKey === item.sourceKey && x.source === item.source; });
        if (!dup) state.images.push(item);
      });
      var upCount = state.images.filter(function(i){ return i.source === 'upload_copy'; }).length;
      var appCount = state.images.filter(function(i){ return i.source === 'applicant_copy'; }).length;
      var upMeta = byId('msh-upload-meta');
      var appMeta = byId('msh-applicant-meta');
      if (upMeta) {
        upMeta.textContent = upCount + ' Upload Copy files loaded';
        upMeta.style.color = upCount > 0 ? '#047857' : '#475569';
      }
      if (appMeta) {
        appMeta.textContent = appCount + ' Applicant Copy files loaded';
        appMeta.style.color = appCount > 0 ? '#047857' : '#475569';
      }
      log('INFO', 'Loaded ' + items.length + ' image(s) into ' + (source === 'upload_copy' ? 'Upload Copy' : 'Applicant Copy') + ' pool.');
      if (state.rawParagraphs.length > 0) {
        scanParagraphsIntoTargets();
      }
      runMatcher();
    });
  }

  function compressImageToBytes(imgItem, totalTargetsCount) {
    var maxDim = totalTargetsCount >= 18 ? 1200 : (totalTargetsCount >= 10 ? 1400 : 1650);
    var quality = totalTargetsCount >= 18 ? 0.68 : (totalTargetsCount >= 10 ? 0.74 : 0.80);
    return new Promise(function(resolve) {
      var url = URL.createObjectURL(imgItem.file);
      var image = new Image();
      image.onload = function() {
        URL.revokeObjectURL(url);
        var w = image.naturalWidth || imgItem.widthPx || 1240;
        var h = image.naturalHeight || imgItem.heightPx || 1754;
        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        if (!ctx) {
          fileToArrayBuffer(imgItem.file).then(function(b){ resolve({ bytes: new Uint8Array(b), widthPx: w, heightPx: h }); });
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(image, 0, 0, w, h);
        canvas.toBlob(function(blob) {
          if (!blob) {
            fileToArrayBuffer(imgItem.file).then(function(b){ resolve({ bytes: new Uint8Array(b), widthPx: w, heightPx: h }); });
            return;
          }
          fileToArrayBuffer(blob).then(function(b){
            resolve({ bytes: new Uint8Array(b), widthPx: w, heightPx: h });
          });
        }, 'image/jpeg', quality);
      };
      image.onerror = function() {
        URL.revokeObjectURL(url);
        fileToArrayBuffer(imgItem.file).then(function(b){
          resolve({ bytes: new Uint8Array(b), widthPx: imgItem.widthPx || 1240, heightPx: imgItem.heightPx || 1754 });
        });
      };
      image.src = url;
    });
  }

  async function buildAndValidateDocx() {
    if (state.isBuilding) return;
    if (!state.docxFile) {
      log('WARNING', 'Please select a Word (.DOCX) file first.');
      return;
    }
    var pendingBlocking = state.targets.filter(function(t){ return !t.assignedImageId && t.status !== 'MANUAL_LATER'; }).length;
    var unattachedTargets = state.targets.filter(function(t){ return !t.assignedImageId || t.status === 'MANUAL_LATER'; });
    var recordsToInsert = state.targets.filter(function(t){ return Boolean(t.assignedImageId) && t.status !== 'MANUAL_LATER'; });
    var partialEl = byId('allow-partial-processing') || byId('msh-partial-toggle');
    var allowPartial = partialEl ? partialEl.checked : false;
    if (pendingBlocking > 0 && !allowPartial) {
      log('WARNING', pendingBlocking + ' target(s) are still pending. Match them or enable Partial Processing.');
      return;
    }

    log('INFO', 'Total Targets: ' + state.targets.length + ' | Attached Automatically / Manually: ' + recordsToInsert.length + ' | Left for Manual Attachment in Word: ' + unattachedTargets.length);
    if (unattachedTargets.length > 0) {
      log('WARNING', 'Partial Processing Enabled: ' + unattachedTargets.length + ' attachment target(s) will remain unattached for manual insertion in Word.');
      unattachedTargets.forEach(function(u) {
        log('WARNING', 'Pending for manual attachment: ' + u.code + ' — ' + u.rawText);
      });
    }

    state.isBuilding = true;
    var validEl = byId('msh-stat-valid');
    if (validEl) validEl.textContent = 'Building...';

    try {
      var JSZipLib = await ensureJSZip();
      var buf = await fileToArrayBuffer(state.docxFile);
      var zip = await JSZipLib.loadAsync(buf);

      var docXmlEntry = zip.file('word/document.xml');
      if (!docXmlEntry) throw new Error('Missing word/document.xml in source DOCX.');
      var docXml = sanitizeXml(await docXmlEntry.async('string'));
      var docDom = new DOMParser().parseFromString(docXml, 'application/xml');

      var relsFile = zip.file('word/_rels/document.xml.rels');
      var relsXml = relsFile
        ? sanitizeXml(await relsFile.async('string'))
        : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
      var relsDom = new DOMParser().parseFromString(relsXml, 'application/xml');

      var ctFile = zip.file('[Content_Types].xml');
      if (ctFile) {
        var ctXml = sanitizeXml(await ctFile.async('string'));
        var ctDom = new DOMParser().parseFromString(ctXml, 'application/xml');
        if (ctDom.getElementsByTagName('parsererror').length === 0) {
          var defaults = getXmlElements(ctDom, 'Default', 'Default');
          var hasJpeg = defaults.some(function(d){ return (d.getAttribute('Extension') || '').toLowerCase() === 'jpeg'; });
          var hasJpg = defaults.some(function(d){ return (d.getAttribute('Extension') || '').toLowerCase() === 'jpg'; });
          var ctNs = ctDom.documentElement.namespaceURI || 'http://schemas.openxmlformats.org/package/2006/content-types';
          if (!hasJpeg) {
            var dj = ctDom.createElementNS(ctNs, 'Default');
            dj.setAttribute('Extension', 'jpeg');
            dj.setAttribute('ContentType', 'image/jpeg');
            ctDom.documentElement.appendChild(dj);
          }
          if (!hasJpg) {
            var djpg = ctDom.createElementNS(ctNs, 'Default');
            djpg.setAttribute('Extension', 'jpg');
            djpg.setAttribute('ContentType', 'image/jpeg');
            ctDom.documentElement.appendChild(djpg);
          }
          zip.file('[Content_Types].xml', sanitizeXml(new XMLSerializer().serializeToString(ctDom)));
        }
      }

      var pNodes = getXmlElements(docDom, 'w:p', 'p');
      var eff = getEffectiveCountry();
      var borderPt = eff === 'Austria' ? 1.5 : 0.75;
      var borderEmu = Math.round(borderPt * 12700);
      var nextRel = 3001, nextDocPr = 30001, nextMedia = 1;
      var attachedKeys = {};
      var attachedSourceKeys = {};
      var attachedSourceFiles = {};
      var attachedParagraphs = {};
      var finalizedTargets = [];

      for (var r = 0; r < recordsToInsert.length; r++) {
        var rt = recordsToInsert[r];
        if (!rt.assignedImageId || rt.status === 'MANUAL_LATER') continue;
        var rImg = state.images.find(function(x){ return x.id === rt.assignedImageId; });
        if (!rImg) continue;

        var headText = rt.rawText || rt.cleanText;
        var aKey = buildAttachmentKey(rImg.filename, headText, rt.pIndex);
        if (attachedKeys[aKey]) {
          log('SKIP DUPLICATE', '[' + rt.code + '] Duplicate attachment skipped: "' + rImg.filename + '" already attached under heading "' + headText + '".');
          continue;
        }

        var normFn = String(rImg.filename || '').replace(/\.[a-zA-Z0-9]+$/i, '').trim().toLowerCase().replace(/[-_/:,.;()[\]{}|’'“”]/g, ' ').replace(/\s+/g, ' ').trim();
        if (attachedSourceKeys[rImg.sourceKey] || attachedSourceFiles[normFn]) {
          log('SKIP DUPLICATE', '[' + rt.code + '] Duplicate source file skipped: "' + rImg.filename + '" already attached to document.');
          continue;
        }

        if (attachedParagraphs[rt.pIndex]) {
          log('SKIP DUPLICATE', '[' + rt.code + '] Target paragraph index ' + rt.pIndex + ' already received an attachment.');
          continue;
        }

        attachedKeys[aKey] = true;
        attachedSourceKeys[rImg.sourceKey] = true;
        attachedSourceFiles[normFn] = true;
        attachedParagraphs[rt.pIndex] = true;
        finalizedTargets.push(rt);
      }

      var readyCount = finalizedTargets.length;
      var insertedCount = 0;

      for (var i = 0; i < finalizedTargets.length; i++) {
        var t = finalizedTargets[i];
        if (!t.assignedImageId || t.status === 'MANUAL_LATER') continue;
        var img = state.images.find(function(x){ return x.id === t.assignedImageId; });
        if (!img) continue;

        var anchor = pNodes[t.pIndex];
        if (!anchor || !anchor.parentNode) continue;

        var nextEl = anchor.nextElementSibling;
        var anchorHasDraw = getXmlElements(anchor, 'w:drawing', 'drawing').length > 0 || getXmlElements(anchor, 'wp:docPr', 'docPr').length > 0;
        var nextHasDraw = nextEl && (getXmlElements(nextEl, 'w:drawing', 'drawing').length > 0 || getXmlElements(nextEl, 'wp:docPr', 'docPr').length > 0);
        if (anchorHasDraw || nextHasDraw) {
          log('SKIP DUPLICATE', '[' + t.code + '] Fill Missing Only: target already contains an embedded image.');
          continue;
        }

        var compressed = await compressImageToBytes(img, readyCount);
        var effInsertCat = resolveEffectiveCategory(t.classification, img.category, t.isPhotoChild);
        var dims = calcPlannedDims(compressed.widthPx, compressed.heightPx, effInsertCat);

        var relId = 'rIdMaishaaImg' + (nextRel++);
        var docPrId = nextDocPr++;
        var cNvPrId = nextDocPr++;
        var mediaName = 'maishaa_image_' + String(nextMedia++).padStart(3, '0') + '.jpeg';
        zip.file('word/media/' + mediaName, compressed.bytes);

        var relNs = relsDom.documentElement.namespaceURI || 'http://schemas.openxmlformats.org/package/2006/relationships';
        var relNode = relsDom.createElementNS(relNs, 'Relationship');
        relNode.setAttribute('Id', relId);
        relNode.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');
        relNode.setAttribute('Target', 'media/' + mediaName);
        relsDom.documentElement.appendChild(relNode);

        var drawXml =
          '<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
            '<w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="200"/></w:pPr>' +
            '<w:r><w:drawing>' +
              '<wp:inline distT="0" distB="0" distL="0" distR="0">' +
                '<wp:extent cx="' + dims.emuWidth + '" cy="' + dims.emuHeight + '"/>' +
                '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
                '<wp:docPr id="' + docPrId + '" name="' + escAttr(img.filename) + '"/>' +
                '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
                '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
                  '<pic:pic>' +
                    '<pic:nvPicPr><pic:cNvPr id="' + cNvPrId + '" name="' + escAttr(img.filename) + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
                    '<pic:blipFill><a:blip r:embed="' + relId + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
                    '<pic:spPr>' +
                      '<a:xfrm><a:off x="0" y="0"/><a:ext cx="' + dims.emuWidth + '" cy="' + dims.emuHeight + '"/></a:xfrm>' +
                      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' +
                      '<a:ln w="' + borderEmu + '"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln>' +
                    '</pic:spPr>' +
                  '</pic:pic>' +
                '</a:graphicData></a:graphic>' +
              '</wp:inline>' +
            '</w:drawing></w:r>' +
          '</w:p>';

        var drawNode = docDom.importNode(new DOMParser().parseFromString(drawXml, 'application/xml').documentElement, true);
        var nextText = nextEl && nextEl.textContent ? nextEl.textContent.trim().toLowerCase() : '';
        if (nextEl && (nextText === '[attachment area]' || nextText === '[image]' || nextText === '[photo]')) {
          anchor.parentNode.replaceChild(drawNode, nextEl);
        } else {
          anchor.parentNode.insertBefore(drawNode, anchor.nextSibling);
        }
        insertedCount++;
      }

      var ser = new XMLSerializer();
      zip.file('word/document.xml', sanitizeXml(ser.serializeToString(docDom)));
      zip.file('word/_rels/document.xml.rels', sanitizeXml(ser.serializeToString(relsDom)));

      var outBlob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      var checkZip = await JSZipLib.loadAsync(outBlob);
      var vDoc = new DOMParser().parseFromString(await checkZip.file('word/document.xml').async('string'), 'application/xml');
      var vRels = new DOMParser().parseFromString(await checkZip.file('word/_rels/document.xml.rels').async('string'), 'application/xml');
      var ok = vDoc.getElementsByTagName('parsererror').length === 0 && vRels.getElementsByTagName('parsererror').length === 0;

      if (validEl) validEl.textContent = ok ? ('PASS (' + insertedCount + ' attached, ' + unattachedTargets.length + ' manual)') : 'FAIL';
      if (ok) {
        state.finalBlob = outBlob;
        var dlBtn = byId('msh-download-btn');
        if (dlBtn) {
          dlBtn.disabled = false;
          dlBtn.style.opacity = '1';
        }
        log('SUCCESS', 'DOCX generated successfully. ' + insertedCount + ' attached, ' + unattachedTargets.length + ' left for manual insertion in Word.');
      } else {
        log('ERROR', 'Post-generation XML validation reported a parsererror.');
      }
    } catch (err) {
      if (validEl) validEl.textContent = 'ERROR';
      log('ERROR', 'DOCX build failed: ' + (err && err.message ? err.message : String(err)));
    } finally {
      state.isBuilding = false;
      renderUI();
    }
  }

  function downloadFinalDocx() {
    if (!state.finalBlob || !state.docxFile) return;
    var unattachedCount = state.targets.filter(function(t){ return !t.assignedImageId || t.status === 'MANUAL_LATER'; }).length;
    var suffix = unattachedCount > 0 ? '_PARTIAL_MODIFIED.docx' : '_MODIFIED.docx';
    var a = document.createElement('a');
    var url = URL.createObjectURL(state.finalBlob);
    a.href = url;
    a.download = state.docxFile.name.replace(/\\.docx$/i, '') + suffix;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 3000);
    log('SUCCESS', 'Downloaded "' + a.download + '".');
  }

  function resetAll() {
    state = {
      docxFile: null,
      docxSignature: '',
      rawParagraphs: [],
      detectedCountry: 'Other',
      selectedCountry: 'Auto Detect',
      borderPt: 0.75,
      borderEmu: 9525,
      headings: [],
      targets: [],
      images: [],
      finalBlob: null,
      isBuilding: false
    };
    var di = byId('msh-docx-input'); if (di) di.value = '';
    var ui = byId('msh-upload-input'); if (ui) ui.value = '';
    var ai = byId('msh-applicant-input'); if (ai) ai.value = '';
    var dm = byId('msh-docx-meta'); if (dm) { dm.textContent = 'No DOCX loaded'; dm.style.color = '#475569'; }
    var um = byId('msh-upload-meta'); if (um) { um.textContent = '0 Upload Copy files'; um.style.color = '#475569'; }
    var am = byId('msh-applicant-meta'); if (am) { am.textContent = '0 Applicant Copy files'; am.style.color = '#475569'; }
    var vl = byId('msh-stat-valid'); if (vl) vl.textContent = 'Idle';
    var dl = byId('msh-download-btn');
    if (dl) { dl.disabled = true; dl.style.opacity = '0.4'; }
    renderUI();
    log('INFO', 'Workspace reset complete.');
  }

  function handleManualSelectChange(selectEl) {
    if (!selectEl) return;
    var tid = selectEl.getAttribute('data-tid');
    var val = selectEl.value;
    state.finalBlob = null;
    var dl = byId('msh-download-btn');
    if (dl) { dl.disabled = true; dl.style.opacity = '0.4'; }

    if (val === '__MANUAL_LATER__') {
      state.targets.forEach(function(t) {
        if (t.id === tid) {
          t.assignedImageId = null;
          t.status = 'MANUAL_LATER';
          log('WARNING', 'Pending for manual attachment: ' + t.code + ' — ' + t.rawText + ' (Status: MANUAL_LATER)');
        }
      });
      renderUI();
      return;
    }

    state.targets.forEach(function(t) {
      if (t.id !== tid && val && t.assignedImageId === val) {
        t.assignedImageId = null;
        t.status = 'PENDING';
      }
      if (t.id === tid) {
        t.assignedImageId = val || null;
        t.status = val ? 'MANUAL' : 'PENDING';
        if (val) {
          var selImg = state.images.find(function(x){ return x.id === val; });
          if (selImg) {
            var effManualCat = resolveEffectiveCategory(t.classification, selImg.category, t.isPhotoChild);
            t.plannedDimsLabel = calcPlannedDims(selImg.widthPx, selImg.heightPx, effManualCat).label;
          }
        }
      }
    });
    renderUI();
  }

  window.MAISHAA_TOOLS = {
    onDocxInput: function(el) {
      var input = el || byId('msh-docx-input');
      if (input && input.files && input.files[0]) processDocxFile(input.files[0]);
    },
    onUploadInput: function(el) {
      var input = el || byId('msh-upload-input');
      if (input && input.files && input.files.length > 0) handleImageFiles(input.files, 'upload_copy');
    },
    onApplicantInput: function(el) {
      var input = el || byId('msh-applicant-input');
      if (input && input.files && input.files.length > 0) handleImageFiles(input.files, 'applicant_copy');
    },
    onCountryChange: function() {
      var selEl = byId('msh-country');
      if (selEl) state.selectedCountry = selEl.value;
      applyBorderRules(false);
    },
    onSelectCountryBtn: function(countryVal) {
      state.selectedCountry = countryVal || 'Auto Detect';
      var selEl = byId('msh-country');
      if (selEl) selEl.value = state.selectedCountry;
      applyBorderRules(false);
    },
    onApplyBorderRules: function() {
      applyBorderRules(true);
    },
    onRematch: function() {
      if (state.rawParagraphs.length > 0) scanParagraphsIntoTargets();
      runMatcher();
    },
    onBuild: function() {
      buildAndValidateDocx();
    },
    onDownload: function() {
      downloadFinalDocx();
    },
    onReset: function() {
      resetAll();
    }
  };

  document.addEventListener('change', function(e) {
    var t = e.target;
    if (!t) return;
    if (t.id === 'msh-docx-input' && t.files && t.files[0]) {
      processDocxFile(t.files[0]);
    } else if (t.id === 'msh-upload-input' && t.files && t.files.length > 0) {
      handleImageFiles(t.files, 'upload_copy');
    } else if (t.id === 'msh-applicant-input' && t.files && t.files.length > 0) {
      handleImageFiles(t.files, 'applicant_copy');
    } else if (t.id === 'msh-country') {
      state.selectedCountry = t.value || 'Auto Detect';
      applyBorderRules(false);
    } else if (t.id === 'msh-partial-toggle' || t.id === 'allow-partial-processing') {
      renderUI();
    } else if (t.classList && t.classList.contains('msh-row-select')) {
      handleManualSelectChange(t);
    }
  });

  document.addEventListener('click', function(e) {
    var t = e.target;
    if (!t) return;
    var btn = t.closest ? t.closest('button') : t;
    if (btn.getAttribute && btn.getAttribute('data-country')) {
      state.selectedCountry = btn.getAttribute('data-country') || 'Auto Detect';
      applyBorderRules(false);
      return;
    }
    if (!btn.id) return;
    if (btn.id === 'msh-apply-border-btn') {
      applyBorderRules(true);
    } else if (btn.id === 'msh-rematch-btn') {
      if (state.rawParagraphs.length > 0) scanParagraphsIntoTargets();
      runMatcher();
    } else if (btn.id === 'msh-build-btn') {
      buildAndValidateDocx();
    } else if (btn.id === 'msh-download-btn') {
      downloadFinalDocx();
    } else if (btn.id === 'msh-reset-btn') {
      resetAll();
    }
  });

  function syncPreselectedInputs() {
    var di = byId('msh-docx-input');
    if (di && di.files && di.files[0]) {
      processDocxFile(di.files[0]);
    }
    var ui = byId('msh-upload-input');
    if (ui && ui.files && ui.files.length > 0) {
      var upLoaded = state.images.filter(function(i){ return i.source === 'upload_copy'; }).length;
      if (upLoaded === 0) handleImageFiles(ui.files, 'upload_copy');
    }
    var ai = byId('msh-applicant-input');
    if (ai && ai.files && ai.files.length > 0) {
      var appLoaded = state.images.filter(function(i){ return i.source === 'applicant_copy'; }).length;
      if (appLoaded === 0) handleImageFiles(ai.files, 'applicant_copy');
    }
  }

  function initMaishaaRuntime() {
    log('INFO', 'MAISHAA.ANNEXURE-TOOLS runtime initialized and ready. Event handlers active.');
    ensureJSZip().then(function() {
      syncPreselectedInputs();
    }).catch(function(err) {
      log('WARNING', err.message);
    });
    syncPreselectedInputs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMaishaaRuntime);
  } else {
    initMaishaaRuntime();
  }
})();`;

  return makeCdataSafeContent(rawJs);
}

/**
 * BLOGGER THEME XML EXPORTER:
 * - Standard Blogger v2/v3 root <html b:version="2" class="v2" ...> (without b:css="false" which disables b:skin in Blogger!)
 * - Required Blogger XML namespaces on <html>
 * - EXACTLY ONE <b:skin><![CDATA[ ...all theme/application CSS... ]]></b:skin> inside <head>
 * - Zero <style> blocks
 * - All JavaScript inside <body> before </body>
 * - Single valid XML root element (<html>)
 */
export function getBloggerThemeXmlDocument(): string {
  const safeCss = makeCdataSafeContent(getMaishaaApplicationCss());
  const uiMarkup = getMaishaaUiMarkup();
  const safeJs = getMaishaaApplicationJavaScript();

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<html b:version="2" class="v2" expr:dir="data:blog.languageDirection" xmlns="http://www.w3.org/1999/xhtml" xmlns:b="http://www.google.com/2005/gml/b" xmlns:data="http://www.google.com/2005/gml/data" xmlns:expr="http://www.google.com/2005/gml/expr">
  <head>
    <meta charset="UTF-8" />
    <meta content="width=device-width, initial-scale=1.0" name="viewport" />
    <title><data:blog.pageTitle/></title>
    <b:skin><![CDATA[${safeCss}]]></b:skin>
  </head>
  <body>
    <b:section class="main" id="main" showaddelement="yes">
      <b:widget id="Blog1" locked="true" title="Blog Posts" type="Blog" version="2" visible="false">
        <b:includable id="main"/>
      </b:widget>
    </b:section>
${uiMarkup}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" type="text/javascript"></script>
    <script type="text/javascript">
/*<![CDATA[*/
${safeJs}
/*]]>*/
    </script>
  </body>
</html>`;

  return sanitizeXmlText(xml).trim();
}

/**
 * Keep alias pointing to the full Blogger Theme XML Document (with <b:skin>)
 * so no button can ever export a skinless XML file.
 */
export function getBloggerGadgetXmlFragment(): string {
  return getBloggerThemeXmlDocument();
}

/**
 * SEPARATE STANDALONE HTML EXPORTER:
 * - Normal <!DOCTYPE html><html>...</html>
 * - Normal <style> inside <head> (NO <b:skin>)
 * - Normal <script> inside <body> before </body> (NO CDATA)
 */
export function getStandaloneHtmlDocument(): string {
  const css = getMaishaaApplicationCss();
  const uiMarkup = getMaishaaUiMarkup();
  const safeJs = getMaishaaApplicationJavaScript();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MAISHAA.ANNEXURE-TOOLS &#8212; Standalone Edition</title>
  <style>
${css}
  </style>
</head>
<body>
${uiMarkup}
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  <script>
${safeJs}
  </script>
</body>
</html>`;

  return sanitizeXmlText(html).trim();
}

/**
 * Validates the generated Blogger Theme XML before export:
 * 1. DOMParser("application/xml") has 0 parsererror
 * 2. Single <html> root element and no trailing markup
 * 3. Required Blogger namespaces (xmlns:b, xmlns:data, xmlns:expr) and NO b:css="false"
 * 4. EXACTLY ONE <b:skin> element (skinCount === 1)
 * 5. Zero <style> elements outside <b:skin>
 * 6. All <script> elements inside <body> before </body>
 * 7. Browser JS compilation via new Function(...)
 */
export function validateXmlForBloggerExport(
  output: string
): XmlExportValidationResult {
  const trimmed = output.trim();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(trimmed, 'application/xml');
  const errors = xmlDoc.getElementsByTagName('parsererror');

  if (errors.length > 0) {
    const errText =
      errors[0].textContent?.replace(/\s+/g, ' ').trim() ||
      'Unknown XML parsererror';
    return {
      isValid: false,
      statusLabel: 'XML Validation Failed',
      errorMessage: errText,
      rootTagName: null,
      hasSingleRoot: false,
      hasNoTrailingMarkup: false,
      hasValidCdata: false,
      skinCount: 0,
      isBrowserJsExecutable: false,
    };
  }

  const rootEl = xmlDoc.documentElement;
  const elementChildren = Array.from(xmlDoc.childNodes).filter(
    (n) => n.nodeType === 1
  );
  const hasSingleRoot = Boolean(rootEl) && elementChildren.length === 1;
  const rootTagName = rootEl ? rootEl.tagName : null;

  const expectedEnd = /<\/script>\s*<\/body>\s*<\/html>$/;
  const hasNoTrailingMarkup = expectedEnd.test(trimmed);

  const cdataOpenCount = (trimmed.match(/<!\[CDATA\[/g) || []).length;
  const cdataCloseCount = (trimmed.match(/\]\]>/g) || []).length;
  const hasValidCdata =
    cdataOpenCount >= 2 && cdataOpenCount === cdataCloseCount;

  if (!rootEl || rootTagName !== 'html') {
    return {
      isValid: false,
      statusLabel: 'Invalid Root Tag',
      errorMessage: 'Blogger Theme XML must have a single <html> root element.',
      rootTagName,
      hasSingleRoot,
      hasNoTrailingMarkup,
      hasValidCdata,
      skinCount: 0,
      isBrowserJsExecutable: false,
    };
  }

  // Must NOT have b:css="false" because b:css="false" causes Blogger to ignore/strip <b:skin>
  const bCssAttr = rootEl.getAttribute('b:css');
  if (bCssAttr === 'false') {
    return {
      isValid: false,
      statusLabel: 'b:css="false" Disables Skin',
      errorMessage:
        'Remove b:css="false" from <html>; it causes Blogger to ignore <b:skin>.',
      rootTagName,
      hasSingleRoot,
      hasNoTrailingMarkup,
      hasValidCdata,
      skinCount: 0,
      isBrowserJsExecutable: false,
    };
  }

  const allElements = Array.from(xmlDoc.getElementsByTagName('*'));
  const skinNodes = allElements.filter(
    (el) =>
      el.tagName === 'b:skin' ||
      el.nodeName === 'b:skin' ||
      el.localName === 'skin'
  );
  const skinCount = skinNodes.length;

  const hasBNamespace =
    rootEl.getAttribute('xmlns:b') === 'http://www.google.com/2005/gml/b';
  const hasDataNamespace =
    rootEl.getAttribute('xmlns:data') === 'http://www.google.com/2005/gml/data';
  const hasExprNamespace =
    rootEl.getAttribute('xmlns:expr') === 'http://www.google.com/2005/gml/expr';

  if (!hasBNamespace || !hasDataNamespace || !hasExprNamespace) {
    return {
      isValid: false,
      statusLabel: 'Missing Blogger Namespaces',
      errorMessage:
        'Root <html> is missing required Blogger namespaces (xmlns:b, xmlns:data, xmlns:expr).',
      rootTagName,
      hasSingleRoot,
      hasNoTrailingMarkup,
      hasValidCdata,
      skinCount,
      isBrowserJsExecutable: false,
    };
  }

  if (skinCount !== 1) {
    return {
      isValid: false,
      statusLabel: 'Blogger Skin Count Invalid',
      errorMessage: `There should be one and only one <b:skin> in the theme, and we found: ${skinCount}`,
      rootTagName,
      hasSingleRoot,
      hasNoTrailingMarkup,
      hasValidCdata,
      skinCount,
      isBrowserJsExecutable: false,
    };
  }

  const styleNodes = allElements.filter(
    (el) => el.tagName === 'style' || el.localName === 'style'
  );
  if (styleNodes.length > 0) {
    return {
      isValid: false,
      statusLabel: 'Unmerged <style> Found',
      errorMessage:
        'All theme CSS must be inside the single <b:skin> tag, not separate <style> blocks.',
      rootTagName,
      hasSingleRoot,
      hasNoTrailingMarkup,
      hasValidCdata,
      skinCount,
      isBrowserJsExecutable: false,
    };
  }

  let isBrowserJsExecutable = true;
  let jsErrorMsg: string | null = null;
  try {
    const htmlDoc = parser.parseFromString(trimmed, 'text/html');
    const scripts = Array.from(htmlDoc.getElementsByTagName('script')).filter(
      (s) => !s.getAttribute('src')
    );
    if (scripts.length === 0) {
      isBrowserJsExecutable = false;
      jsErrorMsg = 'No inline application <script> found.';
    } else {
      for (const s of scripts) {
        const code = s.textContent || '';
        new Function(code);
      }
    }
  } catch (err) {
    isBrowserJsExecutable = false;
    jsErrorMsg =
      err instanceof Error
        ? `Browser JS SyntaxError: ${err.message}`
        : 'Browser JS SyntaxError';
  }

  if (
    !hasSingleRoot ||
    !hasNoTrailingMarkup ||
    !hasValidCdata ||
    !isBrowserJsExecutable
  ) {
    return {
      isValid: false,
      statusLabel: 'Validation Failed',
      errorMessage: !hasSingleRoot
        ? 'Document does not contain a single root element.'
        : !hasNoTrailingMarkup
        ? 'Markup or characters detected after closing root element.'
        : !hasValidCdata
        ? 'CDATA section mismatch detected.'
        : jsErrorMsg || 'Inline script failed browser JS compilation.',
      rootTagName,
      hasSingleRoot,
      hasNoTrailingMarkup,
      hasValidCdata,
      skinCount,
      isBrowserJsExecutable,
    };
  }

  return {
    isValid: true,
    statusLabel: 'Blogger Theme XML Valid (1 <b:skin>)',
    errorMessage: null,
    rootTagName,
    hasSingleRoot: true,
    hasNoTrailingMarkup: true,
    hasValidCdata: true,
    skinCount,
    isBrowserJsExecutable: true,
  };
}

/**
 * BLOGGER POST / PAGE HTML-XML FRAGMENT EXPORTER:
 * - Single root <div id="maishaa-annexure-tools-post-root">...</div>
 * - Self-contained <style> and executable <script> inside the single root
 * - Safe for pasting into Blogger Post / Page -> HTML View or Layout -> HTML/JavaScript Gadget
 */
export function getBloggerPostCode(): string {
  return getBloggerThemeXmlDocument();
}

export function exportBloggerThemeXmlFile(): XmlExportValidationResult {
  const output = getBloggerThemeXmlDocument();
  const validation = validateXmlForBloggerExport(output);
  if (!validation.isValid) {
    return validation;
  }
  const blob = new Blob([output], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'MAISHAA_ANNEXURE_TOOLS_Blogger_Theme.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return validation;
}

export function exportBloggerGadgetXmlFile(): XmlExportValidationResult {
  return exportBloggerThemeXmlFile();
}

export function exportStandaloneHtmlBuild(): void {
  const fullHtml = getStandaloneHtmlDocument();
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'MAISHAA_ANNEXURE_TOOLS_Standalone.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
