import React from 'react';
import { Download, Monitor, CheckCircle2, Terminal, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';
import { exportWindowsPcDesktopAppPackage } from '../modules/pcDesktopExporter';

interface PcDesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogMessage?: (msg: string) => void;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg border border-amber-700">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      Offline PC Mode Active — 100% Local DOCX &amp; Image Processing Ready
    </div>
  );
};

export const PWAInstallButton: React.FC<{
  onOpenPcModal: () => void;
  onLogMessage?: (msg: string) => void;
}> = ({ onOpenPcModal, onLogMessage }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        onLogMessage?.(
          'MAISHAA.ANNEXURE-TOOLS installed as a native Desktop PC Application.'
        );
        return;
      }
    }
    onOpenPcModal();
  };

  return (
    <div className="flex items-center gap-2">
      {!isInstalled && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Monitor className="w-3.5 h-3.5 text-emerald-400" />
          {isInstallable ? 'Install PC App Now' : 'PC Desktop App'}
        </button>
      )}
    </div>
  );
};

export const PcDesktopAppModal: React.FC<PcDesktopAppModalProps> = ({
  isOpen,
  onClose,
  onLogMessage,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleDownloadPortableZip = async () => {
    await exportWindowsPcDesktopAppPackage();
    onLogMessage?.(
      'Downloaded MAISHAA_ANNEXURE_TOOLS_Windows_PC_App.zip (Portable Windows Desktop App + Shortcut Creator + Electron .EXE Builder).'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-1 bg-white rounded-lg border border-white/40 shadow-sm shrink-0">
              <img
                src="/maishaa_brand_logo.jpg"
                alt="MAISHAA Logo"
                className="w-12 h-12 rounded object-contain"
              />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono tracking-tight flex items-center gap-2">
                <span>MAISHAA.ANNEXURE-TOOLS</span>
                <span className="text-[10px] font-sans px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">PC APP</span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Run as a standalone Windows / Mac / Linux desktop program with offline capability
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Option 1: Portable Windows PC Desktop Package (.ZIP) */}
          <div className="p-4 bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 mb-1.5">
                  RECOMMENDED FOR WINDOWS 10 / 11 PC
                </span>
                <h3 className="text-sm font-semibold text-slate-900">
                  1. Download Portable Windows PC Desktop App (.ZIP)
                </h3>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Downloads a ready-to-run Windows PC package (
                  <code className="font-mono text-slate-900">
                    MAISHAA_ANNEXURE_TOOLS_Windows_PC_App.zip
                  </code>
                  ) with a native desktop window launcher and automatic Desktop
                  Shortcut creator.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-3 font-mono text-[11px] space-y-1 text-slate-700">
              <div>
                • <strong>Start_MAISHAA_PC_App.bat</strong> — Opens a dedicated
                1400×900 native desktop window (no browser tabs or URL bar)
              </div>
              <div>
                • <strong>Create_Desktop_Shortcut.vbs</strong> — Double-click
                once to place the <em>&quot;MAISHAA Annexure Tools&quot;</em>{' '}
                shortcut on your Windows Desktop
              </div>
              <div>
                • <strong>app/MAISHAA_ANNEXURE_TOOLS.html</strong> — Complete
                self-contained application with all Country Border Rules &amp;
                Image Size Rules
              </div>
              <div>
                • <strong>electron/main.cjs + package.json</strong> — Ready to
                compile a standalone Windows{' '}
                <code className="text-slate-900">.EXE</code> via{' '}
                <code className="text-slate-900">npm run dist:win</code>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadPortableZip}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Windows PC App Package (.ZIP)
            </button>
          </div>

          {/* Option 2: Direct Browser PWA Desktop Install */}
          <div className="p-4 bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              2. Install Directly as a Native Desktop App (PWA)
            </h3>
            {isInstalled ? (
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Currently running as an installed Standalone PC Application.
                </span>
              </div>
            ) : isInstallable ? (
              <div className="space-y-2.5">
                <p className="text-slate-600">
                  Your browser supports one-click PC Desktop installation with
                  Start Menu / Taskbar integration and offline Service Worker
                  caching:
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await install();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer"
                >
                  <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                  Install Desktop App Now
                </button>
              </div>
            ) : isIOS ? (
              <p className="text-slate-600">
                In Safari, tap <strong>Share</strong> in the toolbar and select{' '}
                <strong>Add to Home Screen</strong>.
              </p>
            ) : (
              <div className="space-y-1.5 text-slate-600 leading-relaxed">
                <p>
                  To install directly from <strong>Microsoft Edge</strong> or{' '}
                  <strong>Google Chrome</strong> on your PC:
                </p>
                <ol className="list-decimal list-inside space-y-1 font-medium text-slate-800">
                  <li>
                    Open this app in a full browser tab (or click{' '}
                    <strong>Download Windows PC App Package (.ZIP)</strong>{' '}
                    above).
                  </li>
                  <li>
                    Click the <strong>Install App</strong> icon in the right
                    side of the address bar (or Browser Menu{' '}
                    <code className="font-mono">⋯</code> &rarr;{' '}
                    <strong>Apps</strong> &rarr;{' '}
                    <strong>Install this site as an app</strong>).
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* Option 3: Compile Native .EXE */}
          <div className="p-4 bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Terminal className="w-4 h-4 text-slate-700" />
              <span>3. Optional: Build a Single Windows .EXE Installer</span>
            </div>
            <p className="text-slate-600">
              The ZIP package above includes an Electron configuration. Unzip it
              and run these two commands in Command Prompt or PowerShell to
              produce a standalone{' '}
              <code className="font-mono text-slate-900">.exe</code>:
            </p>
            <pre className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
              npm install{'\n'}npm run dist:win
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-slate-900 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
