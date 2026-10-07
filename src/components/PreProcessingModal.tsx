import React, { useState } from 'react';
import {
  AdminSettingsConfig,
  EffectiveCountry,
  UploadedImageItem,
} from '../types/annexure';
import { getBorderProfile } from '../modules/adminConfig';
import { compressImageAdaptive } from '../modules/imageProcessor';
import { Check, RefreshCw, X } from 'lucide-react';

interface PreProcessingModalProps {
  isOpen: boolean;
  images: UploadedImageItem[];
  settings: AdminSettingsConfig;
  effectiveCountry?: EffectiveCountry;
  onClose: () => void;
  onAcceptAndContinue: () => void;
  onUpdateCompressedPreviews: (
    updatedMap: Map<
      string,
      { bytes: number; widthPx: number; heightPx: number; blob: Blob }
    >
  ) => void;
}

export const PreProcessingModal: React.FC<PreProcessingModalProps> = ({
  isOpen,
  images,
  settings,
  effectiveCountry = 'Other',
  onClose,
  onAcceptAndContinue,
  onUpdateCompressedPreviews,
}) => {
  const [isRunningBatchResize, setIsRunningBatchResize] = useState(false);

  if (!isOpen) return null;

  const activeImages = images.filter((i) => !i.isIgnoredBranding);
  const borderProfile = getBorderProfile(effectiveCountry, settings);

  const handleResizeAllPreview = async () => {
    setIsRunningBatchResize(true);
    const updatedMap = new Map<
      string,
      { bytes: number; widthPx: number; heightPx: number; blob: Blob }
    >();
    try {
      for (const img of activeImages) {
        const res = await compressImageAdaptive(
          img,
          activeImages.length,
          settings
        );
        updatedMap.set(img.id, res);
      }
      onUpdateCompressedPreviews(updatedMap);
    } finally {
      setIsRunningBatchResize(false);
    }
  };

  const totalOriginalBytes = activeImages.reduce(
    (sum, i) => sum + i.sizeBytes,
    0
  );
  const totalEstimatedBytes = activeImages.reduce(
    (sum, i) => sum + (i.optimizedBytes ?? i.estimatedCompressedBytes),
    0
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-6xl max-h-[88vh] flex flex-col shadow-xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/maishaa_brand_logo.jpg"
              alt="MAISHAA Logo"
              className="w-9 h-9 rounded object-contain border border-slate-200 shrink-0"
            />
            <div>
              <h2 className="text-base font-semibold text-slate-900 font-mono">
                MAISHAA · IMAGE PRE-PROCESSING / RESIZE PREVIEW
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Category-based Final Word Sizes (Certificate: Portrait 5.80&quot; × 8.20&quot;, Landscape 6.27&quot; × 4.40&quot; · Photograph: Landscape 5.44&quot; × 4.10&quot;, Portrait 3.08&quot; × 4.10&quot;) and adaptive Canvas JPEG compression
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Active Images:{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {activeImages.length}
              </strong>
            </span>
            <span>·</span>
            <span>
              Original Raw Total:{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {(totalOriginalBytes / (1024 * 1024)).toFixed(2)} MB
              </strong>
            </span>
            <span>·</span>
            <span>
              Planned Compressed Total:{' '}
              <strong className="font-mono tabular-nums text-emerald-700">
                {(totalEstimatedBytes / (1024 * 1024)).toFixed(2)} MB
              </strong>
            </span>
            <span>·</span>
            <span>
              Active Border Rule ({effectiveCountry}):{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {borderProfile.pt.toFixed(2)} pt solid black ({borderProfile.emu} EMU)
              </strong>
            </span>
          </div>

          <button
            type="button"
            disabled={isRunningBatchResize || activeImages.length === 0}
            onClick={handleResizeAllPreview}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:border-slate-900 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRunningBatchResize ? 'animate-spin' : ''
              }`}
            />
            {isRunningBatchResize
              ? 'Computing Exact Canvas Compression...'
              : 'Resize All Preview (Compute Exact KB)'}
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Filename</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Orientation</th>
                <th className="py-2.5 px-3 text-right">Original Pixels</th>
                <th className="py-2.5 px-3 text-right">Original Size</th>
                <th className="py-2.5 px-3 text-right">Final Word Size</th>
                <th className="py-2.5 px-3 text-right">Border Rule</th>
                <th className="py-2.5 px-3 text-right">Planned Compression</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activeImages.map((img, idx) => {
                const compressedBytes =
                  img.optimizedBytes ?? img.estimatedCompressedBytes;
                return (
                  <tr key={img.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-900 max-w-xs truncate">
                      {img.filename}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {img.source === 'upload_copy'
                        ? 'Upload Copy'
                        : 'Applicant Copy'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {img.inferredCategory}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {img.orientation}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {img.widthPx} × {img.heightPx} px
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {(img.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {img.plannedWidthIn.toFixed(2)}&quot; ×{' '}
                      {img.plannedHeightIn.toFixed(2)}&quot;
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {borderProfile.pt.toFixed(2)} pt
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 font-medium">
                      {(compressedBytes / 1024).toFixed(1)} KB
                      {img.optimizedBytes ? ' (Verified)' : ' (Est.)'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:border-slate-400 cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onAcceptAndContinue}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5" />
            Accept Dimensions &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
};
