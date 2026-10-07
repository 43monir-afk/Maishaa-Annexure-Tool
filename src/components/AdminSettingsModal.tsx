import React, { useState } from 'react';
import { AdminSettingsConfig } from '../types/annexure';
import { DEFAULT_ADMIN_SETTINGS, ptToEmu } from '../modules/adminConfig';
import {
  RotateCcw,
  X,
  ShieldAlert,
  Sliders,
  BookOpen,
  CheckCircle2,
  FileCheck,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

interface AdminSettingsModalProps {
  isOpen: boolean;
  settings: AdminSettingsConfig;
  initialTab?: 'config' | 'rules';
  onChangeSettings: (next: AdminSettingsConfig) => void;
  onClose: () => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  settings,
  initialTab = 'config',
  onChangeSettings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'rules'>(initialTab);

  // Sync tab if initialTab changes when opening
  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const updateNum = (key: keyof AdminSettingsConfig, val: string) => {
    const parsed = parseFloat(val);
    if (!Number.isNaN(parsed)) {
      onChangeSettings({ ...settings, [key]: parsed });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header with Brand & Tabs */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/maishaa_brand_logo.jpg"
              alt="MAISHAA Logo"
              className="w-9 h-9 rounded object-contain border border-slate-200 shrink-0 shadow-xs"
            />
            <div>
              <h2 className="text-base font-semibold text-slate-900 font-mono flex items-center gap-2">
                <span>MAISHAA</span>
                <span className="text-slate-300 font-normal">/</span>
                <span className="text-xs uppercase tracking-wider text-slate-500 font-sans">
                  Admin Settings &amp; Specifications
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                Admin Profile: {settings.adminEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Segmented Tab Controls */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('config')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  activeTab === 'config'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-slate-600" />
                Configuration
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  activeTab === 'rules'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold text-blue-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                Rules &amp; Specs
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-800 transition-colors ml-2 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs">
          {activeTab === 'config' ? (
            <div className="space-y-6">
              {/* Security Disclosure Notice (Section 36) */}
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Client-Side Configuration Notice:</span>{' '}
                  This application runs 100% locally in your browser. Client-side email profile identification (<code>{settings.adminEmail}</code>) is for local workspace configuration convenience and is not a substitute for server-side authentication.
                </div>
              </div>

              {/* 1. Country Border Rules (EMU Verified) */}
              <div>
                <h3 className="text-xs font-semibold text-slate-900 mb-3 pb-1.5 border-b border-slate-200">
                  01. Consular / Embassy Border Thickness Rules (1 pt = 12,700 EMU)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">
                      Austria / Austia (pt)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={settings.austriaBorderPt}
                      onChange={(e) =>
                        updateNum('austriaBorderPt', e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 font-mono border border-slate-200 bg-white"
                    />
                    <span className="text-[10px] font-mono text-slate-400">
                      {ptToEmu(settings.austriaBorderPt)} EMU
                    </span>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Finland (pt)</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={settings.finlandBorderPt}
                      onChange={(e) =>
                        updateNum('finlandBorderPt', e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 font-mono border border-slate-200 bg-white"
                    />
                    <span className="text-[10px] font-mono text-slate-400">
                      {ptToEmu(settings.finlandBorderPt)} EMU
                    </span>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Italy (pt)</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={settings.italyBorderPt}
                      onChange={(e) => updateNum('italyBorderPt', e.target.value)}
                      className="w-full px-2.5 py-1.5 font-mono border border-slate-200 bg-white"
                    />
                    <span className="text-[10px] font-mono text-slate-400">
                      {ptToEmu(settings.italyBorderPt)} EMU
                    </span>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Greece (pt)</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={settings.greeceBorderPt}
                      onChange={(e) => updateNum('greeceBorderPt', e.target.value)}
                      className="w-full px-2.5 py-1.5 font-mono border border-slate-200 bg-white"
                    />
                    <span className="text-[10px] font-mono text-slate-400">
                      {ptToEmu(settings.greeceBorderPt)} EMU
                    </span>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Other (pt)</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={settings.otherBorderPt}
                      onChange={(e) => updateNum('otherBorderPt', e.target.value)}
                      className="w-full px-2.5 py-1.5 font-mono border border-slate-200 bg-white"
                    />
                    <span className="text-[10px] font-mono text-slate-400">
                      {ptToEmu(settings.otherBorderPt)} EMU
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Aspect-Fit Bounding Dimensions */}
              <div>
                <h3 className="text-xs font-semibold text-slate-900 mb-3 pb-1.5 border-b border-slate-200">
                  02. Aspect-Fit Image Bounding Box Targets (Inches)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1">
                      Portrait Max W × H (in)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.05"
                        value={settings.portraitWidthInches}
                        onChange={(e) =>
                          updateNum('portraitWidthInches', e.target.value)
                        }
                        className="w-full px-2 py-1.5 font-mono border border-slate-200 bg-white"
                      />
                      <span>×</span>
                      <input
                        type="number"
                        step="0.05"
                        value={settings.portraitHeightInches}
                        onChange={(e) =>
                          updateNum('portraitHeightInches', e.target.value)
                        }
                        className="w-full px-2 py-1.5 font-mono border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">
                      Landscape Max W × H (in)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.05"
                        value={settings.landscapeWidthInches}
                        onChange={(e) =>
                          updateNum('landscapeWidthInches', e.target.value)
                        }
                        className="w-full px-2 py-1.5 font-mono border border-slate-200 bg-white"
                      />
                      <span>×</span>
                      <input
                        type="number"
                        step="0.05"
                        value={settings.landscapeHeightInches}
                        onChange={(e) =>
                          updateNum('landscapeHeightInches', e.target.value)
                        }
                        className="w-full px-2 py-1.5 font-mono border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">
                      Passport Scan W × H (in)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        value={settings.passportWidthInches}
                        onChange={(e) =>
                          updateNum('passportWidthInches', e.target.value)
                        }
                        className="w-full px-2 py-1.5 font-mono border border-slate-200 bg-white"
                      />
                      <span>×</span>
                      <input
                        type="number"
                        step="0.1"
                        value={settings.passportHeightInches}
                        onChange={(e) =>
                          updateNum('passportHeightInches', e.target.value)
                        }
                        className="w-full px-2 py-1.5 font-mono border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <label className="mt-3 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.useExactVisa35x45mm}
                    onChange={(e) =>
                      onChangeSettings({
                        ...settings,
                        useExactVisa35x45mm: e.target.checked,
                      })
                    }
                    className="accent-slate-900"
                  />
                  <span className="text-slate-700">
                    Use exact biometric visa size (35 mm × 45 mm / 1.38&quot; × 1.77&quot;) for items explicitly classified as Passport/Visa photo
                  </span>
                </label>
              </div>

              {/* 3. Compression & Final DOCX Budget */}
              <div>
                <h3 className="text-xs font-semibold text-slate-900 mb-3 pb-1.5 border-b border-slate-200">
                  03. Adaptive JPEG Compression &amp; Final DOCX Budget
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">
                      Compress Above (KB)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={settings.compressionThresholdKb}
                      onChange={(e) =>
                        updateNum('compressionThresholdKb', e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 font-mono border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">
                      Initial JPEG Quality
                    </label>
                    <input
                      type="number"
                      step="0.02"
                      min="0.6"
                      max="0.95"
                      value={settings.initialJpegQuality}
                      onChange={(e) =>
                        updateNum('initialJpegQuality', e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 font-mono border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">
                      Max Dimension (px)
                    </label>
                    <select
                      value={settings.maxDimensionPx}
                      onChange={(e) =>
                        updateNum('maxDimensionPx', e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 font-mono border border-slate-200 bg-white"
                    >
                      <option value={2400}>2400 px</option>
                      <option value={1920}>1920 px</option>
                      <option value={1600}>1600 px</option>
                      <option value={1280}>1280 px</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">
                      Target DOCX (MB)
                    </label>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        step="0.5"
                        value={settings.targetDocxMinMb}
                        onChange={(e) =>
                          updateNum('targetDocxMinMb', e.target.value)
                        }
                        className="w-full px-2 py-1.5 border border-slate-200 bg-white"
                      />
                      <span>–</span>
                      <input
                        type="number"
                        step="0.5"
                        value={settings.targetDocxMaxMb}
                        onChange={(e) =>
                          updateNum('targetDocxMaxMb', e.target.value)
                        }
                        className="w-full px-2 py-1.5 border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.debugLogging}
                      onChange={(e) =>
                        onChangeSettings({
                          ...settings,
                          debugLogging: e.target.checked,
                        })
                      }
                      className="accent-slate-900"
                    />
                    <span className="text-slate-700">
                      Enable Verbose Debug Console Logging
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allowDuplicateAssignmentOverride}
                      onChange={(e) =>
                        onChangeSettings({
                          ...settings,
                          allowDuplicateAssignmentOverride: e.target.checked,
                        })
                      }
                      className="accent-slate-900"
                    />
                    <span className="text-slate-700">
                      Allow manual duplicate image assignment override (Default: Off)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* RULES & SPECS DETAILED SPECIFICATION VIEW */
            <div className="space-y-6">
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-950 flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">MAISHAA Internal Processing Specifications:</span>{' '}
                  This master specification repository documents all automatic matching, classification, deduplication, orientation, and consular bounding algorithms.
                </div>
              </div>

              {/* 1. Certificate Filename Detection */}
              <div className="bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                    01
                  </span>
                  <h4 className="font-semibold text-slate-900 text-xs">
                    Certificate Filename Detection
                  </h4>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Automatic identification occurs when a filename ends with <code>&quot;certificate&quot;</code> (ignoring file extension and trailing punctuation), or contains explicit certificate tokens.
                </p>
                <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 border border-slate-200 space-y-1">
                  <div><strong>Regex Pattern:</strong> <code>/(?:^|[-_\\s.])certificate$/i</code></div>
                  <div><strong>Matching Tokens:</strong> <code>birth_certificate.jpg</code>, <code>marriage-certificate.jpeg</code>, <code>training certificate.jpg</code></div>
                </div>
              </div>

              {/* 2. Nikahnama Detection */}
              <div className="bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                    02
                  </span>
                  <h4 className="font-semibold text-slate-900 text-xs">
                    Nikahnama Detection (Marriage Deed Registry)
                  </h4>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Matches marriage deeds across English, Bengali, and transliterated variants. Always triggers the <strong>Certificate</strong> size category.
                </p>
                <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 border border-slate-200 space-y-1">
                  <div><strong>Target Variants:</strong> <code>nikahnama</code>, <code>nikah nama</code>, <code>nika nama</code>, <code>nikah_nama</code>, <code>বাংলা নিকাহনামা</code></div>
                  <div><strong>Classification:</strong> Automatically assigned as <strong>Certificate</strong> irrespective of prefix or parent container.</div>
                </div>
              </div>

              {/* 3. Extract Detection */}
              <div className="bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                    03
                  </span>
                  <h4 className="font-semibold text-slate-900 text-xs">
                    Extract Detection (Civil Status Registry)
                  </h4>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Identifies official registrar extracts such as marriage register extracts, birth extracts, and certified register copies.
                </p>
                <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 border border-slate-200 space-y-1">
                  <div><strong>Target Variants:</strong> <code>extract</code>, <code>extraxt</code>, <code>extract from marriage register</code>, <code>extract of birth</code></div>
                  <div><strong>Classification:</strong> Classified as <strong>Certificate</strong> category for full document scaling.</div>
                </div>
              </div>

              {/* 4. Photograph Fallback Logic */}
              <div className="bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                    04
                  </span>
                  <h4 className="font-semibold text-slate-900 text-xs">
                    Photograph Fallback Logic
                  </h4>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Every document or image that does not match Certificate criteria (Rules 01–03) falls back to the <strong>Photograph</strong> rule. Child photo placeholders (e.g. <code>G.1</code>, <code>G.2</code>, <code>N.1</code>, <code>N.2</code>) automatically inherit photograph container rules.
                </p>
                <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 border border-slate-200 space-y-1">
                  <div><strong>Fallback Rule:</strong> <code>isCertificateDoc(item) ? &apos;Certificate&apos; : &apos;Photograph&apos;</code></div>
                  <div><strong>Container Child:</strong> Sub-items under multi-photo containers strictly route to child photo dimensions.</div>
                </div>
              </div>

              {/* 5. Portrait / Landscape Orientation Detection & Exact Sizes */}
              <div className="bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                    05
                  </span>
                  <h4 className="font-semibold text-slate-900 text-xs">
                    Portrait / Landscape Orientation Detection &amp; Final Word Dimensions
                  </h4>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Evaluates image pixel dimensions (<code>height &gt; width</code> = Portrait; <code>width &gt; height</code> = Landscape) and applies deterministic Word OpenXML bounding boxes:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-white p-3 border border-slate-200 space-y-1 font-mono text-[11px]">
                    <div className="font-bold text-slate-900 uppercase">Certificate Category:</div>
                    <div>• <strong>Portrait:</strong> H = 8.20&quot;, W = 5.80&quot;</div>
                    <div className="text-[10px] text-slate-500">5,303,520 × 7,498,080 EMU</div>
                    <div>• <strong>Landscape:</strong> H = 4.40&quot;, W = 6.27&quot;</div>
                    <div className="text-[10px] text-slate-500">5,733,288 × 4,023,360 EMU</div>
                  </div>
                  <div className="bg-white p-3 border border-slate-200 space-y-1 font-mono text-[11px]">
                    <div className="font-bold text-slate-900 uppercase">Photograph Category:</div>
                    <div>• <strong>Landscape:</strong> W = 5.44&quot;, H = 4.10&quot;</div>
                    <div className="text-[10px] text-slate-500">4,974,590 × 3,749,040 EMU</div>
                    <div>• <strong>Portrait:</strong> W = 3.08&quot;, H = 4.10&quot;</div>
                    <div className="text-[10px] text-slate-500">2,816,352 × 3,749,040 EMU</div>
                  </div>
                </div>
              </div>

              {/* 6. Matching Priority */}
              <div className="bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                    06
                  </span>
                  <h4 className="font-semibold text-slate-900 text-xs">
                    Matching Priority &amp; Scoring Logic
                  </h4>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Two-tier source pool priority ensures attested and certified referee records take precedence over uncertified applicant scans:
                </p>
                <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 border border-slate-200 space-y-1">
                  <div><strong>Priority 1:</strong> <code>UPLOAD COPY</code> — Primary referee certified documents, transcripts, and official photos.</div>
                  <div><strong>Priority 2:</strong> <code>APPLICANT COPY</code> — Secondary applicant submitted records and supplementary copies.</div>
                  <div><strong>Scoring Factors:</strong> Token match overlap, Roman numeral affinity (e.g. VII vs VII), date strings, and token ordering.</div>
                </div>
              </div>

              {/* 7. Deduplication Logic */}
              <div className="bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                    07
                  </span>
                  <h4 className="font-semibold text-slate-900 text-xs">
                    Deduplication Logic &amp; Protection Registry
                  </h4>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Strict 1-to-1 relationship guarantee: <strong>One source file/document = exactly ONE attachment in the final DOCX</strong>. Duplicates are blocked across all matching paths, manual overrides, re-runs, and document insertions.
                </p>
                <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 border border-slate-200 space-y-1">
                  <div><strong>Composite Key:</strong> <code>normalizedFilename + &quot;::&quot; + normalizedHeading + &quot;::&quot; + paragraphIndex</code></div>
                  <div><strong>Registry Tracking:</strong> <code>attachedKeys</code>, <code>attachedSourceKeys</code>, <code>attachedSourceFiles</code>, <code>attachedParagraphIndices</code></div>
                  <div><strong>Safety:</strong> Re-Run Matcher flushes stale state; DOCX generator skips already-attached sources.</div>
                </div>
              </div>

              {/* 8. Country Border Specifications */}
              <div className="bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                    08
                  </span>
                  <h4 className="font-semibold text-slate-900 text-xs">
                    Consular Embassy Country Border Specifications
                  </h4>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Every inserted image receives a precise solid black XML border corresponding to the diplomatic requirements of the destination embassy:
                </p>
                <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 border border-slate-200 space-y-1">
                  <div>• <strong>Austria / Austia:</strong> <code>1.50 pt solid black (19,050 EMU)</code></div>
                  <div>• <strong>Greece / Finland / Italy / Other:</strong> <code>0.75 pt solid black (9,525 EMU)</code></div>
                  <div>• <strong>Auto Detect:</strong> Scans Word DOCX body and filename for embassy and country keywords (e.g. <code>Wien</code>, <code>Austria</code>, <code>Helsinki</code>, <code>Athens</code>).</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {activeTab === 'config' ? (
            <button
              type="button"
              onClick={() => onChangeSettings(DEFAULT_ADMIN_SETTINGS)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:border-slate-400 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Default Settings
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 font-mono">
              Specification Revision: v2.4 (OpenXML 2007+ Compliant)
            </div>
          )}

          <div className="flex items-center gap-2">
            {activeTab === 'rules' && (
              <button
                type="button"
                onClick={() => setActiveTab('config')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                Go to Configuration
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
