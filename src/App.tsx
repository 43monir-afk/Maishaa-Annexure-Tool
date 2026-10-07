/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AdminSettingsConfig,
  AttachmentTarget,
  ConsoleLogEntry,
  CountryOption,
  EffectiveCountry,
  ImageSourceGroup,
  LoadedDocxState,
  OpenXmlValidationReport,
  UploadedImageItem,
} from './types/annexure';
import {
  DEFAULT_ADMIN_SETTINGS,
  getBorderProfile,
  getBorderPtForCountry,
  ptToEmu,
  resolveEffectiveCountry,
} from './modules/adminConfig';
import { parseDocxFile } from './modules/docxParser';
import {
  calculatePlannedDimensions,
  inspectUploadedJpgFile,
} from './modules/imageProcessor';
import { resolveEffectiveCategory } from './modules/imageClassifier';
import { deduplicateUploadedImages } from './modules/duplicateRegistry';
import { runMultiFactorAutoMatcher } from './modules/imageMatcher';
import {
  DocxInsertionProgress,
  insertImagesAndBuildDocx,
} from './modules/docxInserter';
import {
  generateFahmidaFariaAustriaReportBundle,
  generateIqbalGreeceReportBundle,
  generateBushraAkterFinlandReportBundle,
} from './modules/acceptanceTestSuite';
import {
  exportStandaloneHtmlBuild,
  exportBloggerThemeXmlFile,
  getBloggerThemeXmlDocument,
  getBloggerPostCode,
  validateXmlForBloggerExport,
  copyTextToClipboardRobust,
} from './modules/standaloneExporter';
import { PreProcessingModal } from './components/PreProcessingModal';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { AdvertisementBanner } from './components/AdvertisementBanner';
import { LoginScreen } from './components/LoginScreen';
import { authService, AuthSession } from './services/authService';
import {
  OfflineIndicator,
  PWAInstallButton,
  PcDesktopAppModal,
} from './components/PcDesktopAppModal';
import { exportWindowsPcDesktopAppPackage } from './modules/pcDesktopExporter';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Trash2,
  Copy,
  RefreshCw,
  Download,
  ShieldCheck,
  Eye,
  Play,
  FileCode,
  Sparkles,
  LogOut,
  User,
  Lock,
} from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<AdminSettingsConfig>(
    DEFAULT_ADMIN_SETTINGS
  );
  const [countryOption, setCountryOption] =
    useState<CountryOption>('Auto Detect');
  const [docxState, setDocxState] = useState<LoadedDocxState | null>(null);
  const [targets, setTargets] = useState<AttachmentTarget[]>([]);
  const [images, setImages] = useState<UploadedImageItem[]>([]);

  // Processing & Validation States
  const [isBusyLoading, setIsBusyLoading] = useState<boolean>(false);
  const [isBuildingDocx, setIsBuildingDocx] = useState<boolean>(false);
  const [buildProgress, setBuildProgress] =
    useState<DocxInsertionProgress | null>(null);
  const [generatedDocxBlob, setGeneratedDocxBlob] = useState<Blob | null>(null);
  const [generatedDocxBytes, setGeneratedDocxBytes] = useState<number | null>(
    null
  );
  const [validationReport, setValidationReport] =
    useState<OpenXmlValidationReport | null>(null);
  const [allowPartialProcessing, setAllowPartialProcessing] =
    useState<boolean>(false);
  const [borderConfirmMessage, setBorderConfirmMessage] = useState<
    string | null
  >(null);

  // Modals
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [adminModalTab, setAdminModalTab] = useState<'config' | 'rules'>('config');
  const [isPcAppModalOpen, setIsPcAppModalOpen] = useState<boolean>(false);

  // Authentication State
  const [session, setSession] = useState<AuthSession | null>(() =>
    authService.getSession()
  );
  const [sessionExpiredNotice, setSessionExpiredNotice] =
    useState<boolean>(false);

  useEffect(() => {
    const unsub = authService.subscribe((s) => {
      setSession(s);
    });
    const unsubExpiry = authService.onSessionExpired(() => {
      setSessionExpiredNotice(true);
    });
    return () => {
      unsub();
      unsubExpiry();
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    setSession(null);
  };

  // Console Logs
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toTimeString().split(' ')[0],
      level: 'INFO',
      message:
        'MAISHAA.ANNEXURE-TOOLS initialized. 100% Client-Side Processing active — no document or image is uploaded to an external server.',
    },
  ]);

  // Hidden File Inputs
  const docxInputRef = useRef<HTMLInputElement | null>(null);
  const uploadCopyInputRef = useRef<HTMLInputElement | null>(null);
  const applicantCopyInputRef = useRef<HTMLInputElement | null>(null);

  const appendLogs = (
    entries: {
      level: ConsoleLogEntry['level'];
      message: string;
    }[]
  ) => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    setConsoleLogs((prev) => [
      ...prev,
      ...entries.map((e, idx) => ({
        id: `log_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: timeStr,
        level: e.level,
        message: e.message,
      })),
    ]);
  };

  // Effective Country & Border Resolution
  const effectiveCountry: EffectiveCountry = useMemo(() => {
    return resolveEffectiveCountry(
      countryOption,
      docxState?.detectedCountry || 'Other'
    );
  }, [countryOption, docxState?.detectedCountry]);

  const activeBorderProfile = useMemo(() => {
    return getBorderProfile(effectiveCountry, settings);
  }, [effectiveCountry, settings]);

  // Separate Upload Copy and Applicant Copy lists
  const uploadCopyList = useMemo(
    () => images.filter((i) => i.source === 'upload_copy'),
    [images]
  );
  const applicantCopyList = useMemo(
    () => images.filter((i) => i.source === 'applicant_copy'),
    [images]
  );

  // Separate Counts & Statistics (Section 14)
  const metrics = useMemo(() => {
    const headingsScanned = docxState?.scannedHeadings.length || 0;
    const attachmentTargetsCount = targets.length;
    const matchedCount = targets.filter(
      (t) =>
        t.status === 'MATCHED' ||
        t.status === 'MANUAL' ||
        t.status === 'REVIEW'
    ).length;
    const readyToAttachCount = targets.filter(
      (t) => Boolean(t.assignedImageId) && t.status !== 'MANUAL_LATER'
    ).length;
    const pendingTargets = targets.filter(
      (t) => !t.assignedImageId && t.status !== 'MANUAL_LATER'
    );
    const manualLaterTargets = targets.filter(
      (t) => t.status === 'MANUAL_LATER'
    );
    const unattachedTargets = targets.filter(
      (t) => !t.assignedImageId || t.status === 'MANUAL_LATER'
    );

    // Estimated final DOCX size = base DOCX size + sum of estimated compressed bytes of assigned images
    const baseDocxBytes = docxState?.sizeBytes || 0;
    const estimatedImagesBytes = targets.reduce((acc, t) => {
      if (!t.assignedImageId || t.status === 'MANUAL_LATER') return acc;
      const found = images.find((img) => img.id === t.assignedImageId);
      if (!found) return acc;
      return acc + (found.optimizedBytes ?? found.estimatedCompressedBytes);
    }, 0);

    return {
      headingsScanned,
      attachmentTargetsCount,
      matchedCount,
      readyToAttachCount,
      pendingCount: pendingTargets.length,
      pendingTargets,
      manualLaterCount: manualLaterTargets.length,
      manualLaterTargets,
      unattachedCount: unattachedTargets.length,
      unattachedTargets,
      estimatedFinalMb: (
        (baseDocxBytes + estimatedImagesBytes) /
        (1024 * 1024)
      ).toFixed(2),
    };
  }, [docxState, targets, images]);

  // Invalidate previous generated DOCX when inputs or assignments change
  const clearGeneratedOutput = () => {
    setGeneratedDocxBlob(null);
    setGeneratedDocxBytes(null);
    setValidationReport(null);
  };

  // Load Word DOCX Handler
  const handleLoadDocxFile = async (
    file: File,
    currentImagesPool: UploadedImageItem[] = images
  ) => {
    setIsBusyLoading(true);
    clearGeneratedOutput();
    try {
      const normalizedNames = currentImagesPool.map((i) => i.normalizedName);
      const parsed = await parseDocxFile(file, settings, normalizedNames);
      setDocxState(parsed);

      const newLogs: { level: ConsoleLogEntry['level']; message: string }[] = [
        {
          level: 'INFO',
          message: `DOCX selected: "${file.name}" (${(file.size / 1024).toFixed(
            1
          )} KB) · Auto-detected country: ${parsed.detectedCountry}`,
        },
        {
          level: 'INFO',
          message: `Found ${parsed.scannedHeadings.length} Annexure headings (${parsed.attachmentTargets.length} attachment targets).`,
        },
      ];

      if (parsed.ignoredReferencesCount > 0) {
        newLogs.push({
          level: 'INFO',
          message: `Ignored ${parsed.ignoredReferencesCount} non-heading cross-reference paragraph(s) ("Refer Annexure...", "See Annexure...").`,
        });
      }

      const normalHeadings = parsed.scannedHeadings.filter(
        (h) => h.headingKind === 'normal'
      );
      const singlePhotoHeadings = parsed.scannedHeadings.filter(
        (h) => h.headingKind === 'single_photo'
      );
      const containerHeadings = parsed.scannedHeadings.filter(
        (h) => h.headingKind === 'multi_photo_container'
      );

      if (normalHeadings.length > 0) {
        newLogs.push({
          level: 'INFO',
          message: `Normal Annexure Targets (${normalHeadings.length}): ${normalHeadings
            .map((h) => `Annexure ${h.letter}`)
            .join(', ')}`,
        });
      }

      for (const sp of singlePhotoHeadings) {
        newLogs.push({
          level: 'INFO',
          message: `${sp.rawText} detected as SINGLE-PHOTO ANNEXURE (1 direct attachment target below heading · 0 child captions).`,
        });
      }

      for (const h of containerHeadings) {
        newLogs.push({
          level: 'INFO',
          message: `${h.rawText} detected as MULTI-PHOTO CONTAINER (Container receives no image · ${h.childTargetsCount} child photograph captions extracted: ${h.letter}.1–${h.letter}.${h.childTargetsCount}).`,
        });
      }

      if (parsed.excludedFooterParagraphsCount > 0) {
        newLogs.push({
          level: 'INFO',
          message: `Excluded ${parsed.excludedFooterParagraphsCount} report closing/confidential footer paragraph(s) from photograph captions.`,
        });
      }

      const resolvedCountry = resolveEffectiveCountry(
        countryOption,
        parsed.detectedCountry
      );

      // If images are already loaded, run auto-matcher immediately
      if (currentImagesPool.length > 0) {
        const matchRes = runMultiFactorAutoMatcher(
          parsed.attachmentTargets,
          currentImagesPool,
          resolvedCountry,
          settings
        );
        setTargets(matchRes.updatedTargets);
        newLogs.push(...matchRes.logs);
      } else {
        setTargets(parsed.attachmentTargets);
      }

      appendLogs(newLogs);
    } catch (err) {
      appendLogs([
        {
          level: 'ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      ]);
    } finally {
      setIsBusyLoading(false);
    }
  };

  // Load JPG/JPEG Files Handler
  const handleAddImages = async (
    fileList: FileList | File[],
    source: ImageSourceGroup
  ) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    setIsBusyLoading(true);
    clearGeneratedOutput();
    const inspectedItems: UploadedImageItem[] = [];
    const newLogs: { level: ConsoleLogEntry['level']; message: string }[] = [];

    for (const file of filesArray) {
      try {
        const item = await inspectUploadedJpgFile(file, source, settings);
        inspectedItems.push(item);
        if (item.isIgnoredBranding) {
          newLogs.push({
            level: 'WARNING',
            message: `Excluded logo/watermark file "${file.name}" by default.`,
          });
        }
      } catch (err) {
        newLogs.push({
          level: 'ERROR',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const { merged, skippedDuplicates } = deduplicateUploadedImages(
      images,
      inspectedItems
    );

    for (const dupName of skippedDuplicates) {
      newLogs.push({
        level: 'SKIP DUPLICATE',
        message: `Duplicate physical file "${dupName}" skipped during upload.`,
      });
    }

    newLogs.push({
      level: 'INFO',
      message: `Loaded ${inspectedItems.length - skippedDuplicates.length} valid JPEG file(s) into ${
        source === 'upload_copy' ? 'Upload Copy (Primary)' : 'Applicant Copy (Secondary)'
      }.`,
    });

    setImages(merged);

    if (docxState) {
      const matchRes = runMultiFactorAutoMatcher(
        targets,
        merged,
        effectiveCountry,
        settings
      );
      setTargets(matchRes.updatedTargets);
      newLogs.push(...matchRes.logs);
    }

    appendLogs(newLogs);
    setIsBusyLoading(false);
  };

  // Re-run Auto Matcher Button Handler
  const handleStartMatching = () => {
    if (!docxState || images.length === 0 || targets.length === 0 || isBusyLoading) return;
    clearGeneratedOutput();

    // Reset manual locks and deduplicate targets so auto-matcher performs a clean full pass
    const seenTargetIds = new Set<string>();
    const resetTargets: AttachmentTarget[] = [];
    for (const t of targets) {
      if (seenTargetIds.has(t.id)) continue;
      seenTargetIds.add(t.id);
      resetTargets.push({
        ...t,
        status: 'PENDING',
        assignedImageId: null,
        orientation: '—',
      });
    }

    const matchRes = runMultiFactorAutoMatcher(
      resetTargets,
      images,
      effectiveCountry,
      settings
    );
    setTargets(matchRes.updatedTargets);
    appendLogs([
      {
        level: 'INFO',
        message: `Executed multi-factor auto-matcher across ${resetTargets.length} attachment targets (${effectiveCountry} border rules). Deduplication active.`,
      },
      ...matchRes.logs,
    ]);
  };

  // Country Option Switcher & Apply Border Rules Handler
  const applyBorderRulesForCountry = (
    targetCountryOption: CountryOption,
    explicitConfirm: boolean = false
  ) => {
    setCountryOption(targetCountryOption);
    clearGeneratedOutput();
    const resolved = resolveEffectiveCountry(
      targetCountryOption,
      docxState?.detectedCountry || 'Other'
    );
    const profile = getBorderProfile(resolved, settings);
    setTargets((prev) =>
      prev.map((t) => ({
        ...t,
        borderPt: profile.pt,
      }))
    );

    const labelCountry =
      targetCountryOption === 'Auto Detect'
        ? `Auto Detect (${resolved})`
        : resolved;
    const msg = `${labelCountry} border profile applied: ${profile.pt.toFixed(
      2
    )} pt solid black border (${profile.emu} EMU) will be used for all inserted images.`;

    if (explicitConfirm) {
      setBorderConfirmMessage(msg);
    } else {
      setBorderConfirmMessage(
        `Country Border Profile: ${labelCountry} selected (${profile.pt.toFixed(
          2
        )} pt solid black · ${profile.emu} EMU). Click "Apply Border Rules" to confirm or generate directly.`
      );
    }

    appendLogs([
      {
        level: explicitConfirm ? 'SUCCESS' : 'INFO',
        message: msg,
      },
    ]);
  };

  const handleSelectCountry = (nextCountry: CountryOption) => {
    applyBorderRulesForCountry(nextCountry, false);
  };

  const handleApplyBorderRules = () => {
    applyBorderRulesForCountry(countryOption, true);
  };

  // Manual Dropdown Override (Section 34 + MANUAL_LATER row-level option)
  const handleManualTargetSelect = (
    targetId: string,
    selectedImageId: string
  ) => {
    clearGeneratedOutput();

    if (selectedImageId === '__MANUAL_LATER__') {
      const targetObj = targets.find((t) => t.id === targetId);
      setTargets((prev) =>
        prev.map((t) =>
          t.id === targetId
            ? {
                ...t,
                assignedImageId: null,
                status: 'MANUAL_LATER',
                confidence: 'Manual',
                matchScore: 0,
                matchReason: 'Left for manual attachment in Word',
                orientation: '—',
              }
            : t
        )
      );
      if (targetObj) {
        appendLogs([
          {
            level: 'WARNING',
            message: `Pending for manual attachment: ${targetObj.displayCode} — ${targetObj.rawText} (Status set to MANUAL_LATER · caption will remain untouched in Word).`,
          },
        ]);
      }
      return;
    }

    if (!selectedImageId) {
      setTargets((prev) =>
        prev.map((t) =>
          t.id === targetId
            ? {
                ...t,
                assignedImageId: null,
                status: 'PENDING',
                confidence: 'Low',
                matchReason: 'Manually unassigned',
                orientation: '—',
              }
            : t
        )
      );
      return;
    }

    const chosenImage = images.find((img) => img.id === selectedImageId);
    if (!chosenImage) return;

    // Check if another target currently holds this physical image
    const existingHolder = targets.find(
      (t) =>
        t.id !== targetId &&
        t.assignedImageId &&
        (t.assignedImageId === chosenImage.id ||
          images.find((i) => i.id === t.assignedImageId)?.sourceKey ===
            chosenImage.sourceKey)
    );

    if (existingHolder) {
      appendLogs([
        {
          level: 'SKIP DUPLICATE',
          message: `Manual reassignment: Released "${chosenImage.filename}" from [${existingHolder.displayCode}] and assigned to new target (Strict 1-to-1 registry).`,
        },
      ]);
    } else {
      appendLogs([
        {
          level: 'MATCH',
          message: `Manual override: Assigned "${chosenImage.filename}" (${
            chosenImage.source === 'upload_copy' ? 'Upload Copy' : 'Applicant Copy'
          }).`,
        },
      ]);
    }

    setTargets((prev) =>
      prev.map((t) => {
        // Release from previous holder
        if (
          existingHolder &&
          t.id === existingHolder.id
        ) {
          return {
            ...t,
            assignedImageId: null,
            status: 'PENDING',
            confidence: 'Low',
            matchReason: `Released for [${
              prev.find((x) => x.id === targetId)?.displayCode || ''
            }]`,
            orientation: '—',
          };
        }

        if (t.id === targetId) {
          const effectiveCat = resolveEffectiveCategory(
            t.classification,
            chosenImage.inferredCategory,
            t.isPhotoChild
          );
          const planned = calculatePlannedDimensions(
            chosenImage.widthPx,
            chosenImage.heightPx,
            effectiveCat,
            settings
          );
          return {
            ...t,
            assignedImageId: chosenImage.id,
            status: 'MANUAL',
            confidence: 'Manual',
            matchScore: 100,
            matchReason: 'Manual dropdown selection',
            orientation: chosenImage.orientation,
            plannedDimensionsLabel: planned.label,
          };
        }
        return t;
      })
    );
  };

  // Final DOCX Generation & OpenXML Validation Handler
  const handleGenerateFinalDocx = async () => {
    if (!docxState || isBuildingDocx) return;
    if (
      metrics.pendingCount > 0 &&
      !allowPartialProcessing
    ) {
      appendLogs([
        {
          level: 'WARNING',
          message: `${metrics.pendingCount} target(s) are still pending (${metrics.pendingTargets
            .map((p) => p.displayCode)
            .join(', ')}). Match them or enable Partial Processing.`,
        },
      ]);
      return;
    }

    setIsBuildingDocx(true);
    clearGeneratedOutput();

    const preGenLogs: { level: ConsoleLogEntry['level']; message: string }[] = [
      {
        level: 'INFO',
        message: `Pre-Generation Summary — Total Targets: ${metrics.attachmentTargetsCount} | Attached Automatically / Manually: ${metrics.readyToAttachCount} | Left for Manual Attachment in Word: ${metrics.unattachedCount}`,
      },
    ];

    if (metrics.unattachedCount > 0) {
      preGenLogs.push({
        level: 'WARNING',
        message: `Partial Processing Enabled: ${metrics.unattachedCount} attachment target(s) will remain unattached for manual insertion in Word.`,
      });
      for (const u of metrics.unattachedTargets) {
        preGenLogs.push({
          level: 'WARNING',
          message: `Pending for manual attachment: ${u.displayCode} — ${u.rawText}`,
        });
      }
    }

    preGenLogs.push({
      level: 'INFO',
      message: `Starting OpenXML image insertion for ${metrics.readyToAttachCount} matched target(s) (${effectiveCountry} border rules)...`,
    });

    appendLogs(preGenLogs);

    try {
      const result = await insertImagesAndBuildDocx(
        docxState.file,
        targets,
        images,
        effectiveCountry,
        settings,
        (prog) => setBuildProgress(prog)
      );

      appendLogs(result.logs);
      setValidationReport(result.validationReport);

      if (result.validationReport.isValid) {
        setGeneratedDocxBlob(result.blob);
        setGeneratedDocxBytes(result.sizeBytes);
      } else {
        setGeneratedDocxBlob(null);
      }
    } catch (err) {
      appendLogs([
        {
          level: 'ERROR',
          message: `Final DOCX generation failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
      ]);
    } finally {
      setIsBuildingDocx(false);
      setBuildProgress(null);
    }
  };

  // Download Validated DOCX Handler (Section 50 + _PARTIAL_MODIFIED.docx rule)
  const handleDownloadFinalDocx = () => {
    if (!generatedDocxBlob || !docxState || !validationReport?.isValid) return;
    const baseName = docxState.filename.replace(/\.docx$/i, '');
    const isPartial = metrics.unattachedCount > 0;
    const outName = isPartial
      ? `${baseName}_PARTIAL_MODIFIED.docx`
      : `${baseName}_MODIFIED.docx`;
    const url = URL.createObjectURL(generatedDocxBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    appendLogs([
      {
        level: 'SUCCESS',
        message: `Downloaded verified Word document: "${outName}" (${metrics.readyToAttachCount} attached, ${metrics.unattachedCount} left for manual insertion in Word).`,
      },
    ]);
  };

  // Load Built-In Real Verification Report Test Bundles (Fahmida Faria - Austria, Iqbal Ahmmed - Greece, Bushra Akter - Finland)
  const handleLoadAcceptanceTest = async (
    testType: 'fahmida_austria' | 'iqbal_greece' | 'bushra_finland'
  ) => {
    setIsBusyLoading(true);
    clearGeneratedOutput();
    try {
      const bundle =
        testType === 'fahmida_austria'
          ? await generateFahmidaFariaAustriaReportBundle()
          : testType === 'iqbal_greece'
          ? await generateIqbalGreeceReportBundle()
          : await generateBushraAkterFinlandReportBundle();

      const inspectedUpload = await Promise.all(
        bundle.uploadCopyFiles.map((f) =>
          inspectUploadedJpgFile(f, 'upload_copy', settings)
        )
      );
      const inspectedApplicant = await Promise.all(
        bundle.applicantCopyFiles.map((f) =>
          inspectUploadedJpgFile(f, 'applicant_copy', settings)
        )
      );
      const combinedImages = [...inspectedUpload, ...inspectedApplicant];
      setImages(combinedImages);
      setCountryOption('Auto Detect');

      await handleLoadDocxFile(bundle.docxFile, combinedImages);

      appendLogs([
        {
          level: 'SUCCESS',
          message:
            testType === 'fahmida_austria'
              ? 'Loaded Fahmida Faria Report (Embassy of Austria · 2894-003769): 7 Headings Scanned (A–F Normal, G Multi-Photo Container), 11 Attachment Targets (A–F + G.1–G.5), 11 Matched, 0 Pending.'
              : testType === 'iqbal_greece'
              ? 'Loaded Iqbal Ahmmed Report (Embassy of Greece · 2895-001083): 14 Headings Scanned (11 Normal; D & F Single-Photo Annexures; N Multi-Photo Container), 22 Attachment Targets (A–M + N.1–N.9), 22 Matched, 0 Pending.'
              : 'Loaded Bushra Akter Report (Embassy of Finland): 12 Headings Scanned (A–G Referee Verified + H–L Applicant Provided), 12 Attachment Targets, 12 Matched, 0 Pending.',
        },
      ]);
    } finally {
      setIsBusyLoading(false);
    }
  };

  // Reset All Handler (Section 40)
  const handleResetAll = () => {
    images.forEach((i) => URL.revokeObjectURL(i.thumbUrl));
    setDocxState(null);
    setTargets([]);
    setImages([]);
    setCountryOption('Auto Detect');
    setAllowPartialProcessing(false);
    setBorderConfirmMessage(null);
    clearGeneratedOutput();
    setConsoleLogs([
      {
        id: `reset_${Date.now()}`,
        timestamp: new Date().toTimeString().split(' ')[0],
        level: 'INFO',
        message:
          'Workspace reset complete. Ready for new DOCX and JPG/JPEG inputs.',
      },
    ]);
  };

  const canStartMatching =
    Boolean(docxState) && images.length > 0 && targets.length > 0;
  const canGenerateFinalDocx =
    Boolean(docxState) &&
    metrics.readyToAttachCount > 0 &&
    (metrics.pendingCount === 0 || allowPartialProcessing) &&
    !isBuildingDocx;

  // Session Authentication Gate (Hides all annexure tools, upload controls, and admin settings before login)
  if (!session) {
    return (
      <LoginScreen
        sessionExpiredNotice={sessionExpiredNotice}
        onLoginSuccess={() => {
          setSessionExpiredNotice(false);
          setSession(authService.getSession());
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* STRICT 3-ZONE TOP HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 min-h-[64px] flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark with enlarged prominent brand logo */}
          <a
            href="#top"
            onClick={(e) => e.preventDefault()}
            className="flex items-center gap-3 text-base font-bold tracking-tight text-slate-900 font-mono whitespace-nowrap group cursor-default"
          >
            <div className="p-1 bg-white rounded-xl border border-slate-300 shadow-xs shrink-0 flex items-center justify-center">
              <img
                src="/maishaa_brand_logo.jpg"
                alt="MAISHAA Brand Logo"
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-lg"
              />
            </div>
            <div className="flex flex-col">
              <span className="flex items-center gap-1.5 font-bold tracking-tight text-slate-900 font-mono text-sm sm:text-base leading-tight">
                <span>MAISHAA</span>
                <span className="text-cyan-600 font-normal">/</span>
                <span className="text-xs font-semibold text-slate-600 font-sans tracking-wide uppercase">ANNEXURE-TOOLS</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                OFFICIAL SYSTEM · v2.4
              </span>
            </div>
          </a>

          {/* Zone 2: Quick Country Selector & Workspace Tools */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-600">
            {(
              [
                'Auto Detect',
                'Austria',
                'Finland',
                'Italy',
                'Greece',
              ] as CountryOption[]
            ).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleSelectCountry(c)}
                className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                  countryOption === c
                    ? 'text-slate-900 font-semibold underline underline-offset-8 decoration-2'
                    : 'hover:text-slate-900'
                }`}
              >
                {c === 'Austria' ? 'Austria / Austia' : c}
              </button>
            ))}
          </nav>

          {/* Zone 3: Primary Actions + Role-Based Admin Controls & Logout */}
          <div className="flex items-center gap-2">
            {/* Authenticated user & role badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-[11px] max-w-[140px] truncate" title={session.user.email}>
                {session.user.email}
              </span>
              <span
                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded font-mono ${
                  session.user.role === 'admin'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}
              >
                {session.user.role}
              </span>
            </div>

            {/* Admin-only PWA / Desktop App shortcut */}
            {session.user.role === 'admin' && (
              <PWAInstallButton
                onOpenPcModal={() => setIsPcAppModalOpen(true)}
                onLogMessage={(msg) =>
                  appendLogs([{ level: 'SUCCESS', message: msg }])
                }
              />
            )}

            {/* Admin Settings Button (Role-restricted) */}
            {session.user.role === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  setAdminModalTab('config');
                  setIsAdminModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-400 transition-colors whitespace-nowrap cursor-pointer rounded"
              >
                <Sliders className="w-3.5 h-3.5" />
                Admin Settings
              </button>
            )}

            <button
              type="button"
              onClick={handleResetAll}
              className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors whitespace-nowrap cursor-pointer rounded"
            >
              Reset All
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors whitespace-nowrap cursor-pointer rounded"
              title="Sign out of MAISHAA"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* MAISHAA OFFICIAL BRAND HERO & REFERENCE SHOWCASE (From Attached Reference) */}
        <section
          id="hero-showcase-section"
          className="maishaa-hero-bg relative overflow-hidden border border-slate-700/80 shadow-md text-white rounded-xl"
          style={{
            backgroundColor: '#071228',
            backgroundPosition: 'center right',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Subtle atmospheric teal & blue glows */}
          <div
            className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 p-5 sm:p-7 md:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-3.5">
                {/* Official Brand Logo - Prominent Size ("LOgo boro koro") */}
                <div className="p-1.5 bg-white rounded-xl shadow-lg shrink-0 border-2 border-white/40 flex items-center justify-center">
                  <img
                    src="/maishaa_brand_logo.jpg"
                    alt="MAISHAA Brand Logo"
                    className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain rounded-lg"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-blue-500/25 text-blue-300 border border-blue-400/40 font-semibold shadow-xs rounded">
                      OFFICIAL SYSTEM
                    </span>
                    <span className="text-xs text-slate-300 font-mono drop-shadow-sm">
                      v2.4 Production
                    </span>
                  </div>
                  <h1
                    className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white font-mono mt-0.5"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}
                  >
                    MAISHAA<span className="text-cyan-400">.</span>ANNEXURE-TOOLS
                  </h1>
                </div>
              </div>

              <p
                className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
              >
                Automated Microsoft Word (.DOCX) Annexure &amp; High-Precision Document Matching System. Zero duplicate attachments, consular border presets, and adaptive OpenXML document generation.
              </p>

              <div
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-200 pt-0.5"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
              >
                <span className="text-emerald-300 font-medium flex items-center gap-1.5 bg-slate-900/60 px-2 py-0.5 border border-slate-700/50 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  100% Client-Side In-Memory
                </span>
                <span className="text-slate-400">·</span>
                <span className="bg-slate-900/60 px-2 py-0.5 border border-slate-700/50 rounded">
                  Active Profile: <strong className="text-white font-mono">{effectiveCountry}</strong>
                </span>
                <span className="text-slate-400">·</span>
                <span className="bg-slate-900/60 px-2 py-0.5 border border-slate-700/50 rounded">
                  Strict 1-to-1 Deduplication Engine
                </span>
                <span className="text-slate-400">·</span>
                <span className="bg-slate-900/60 px-2 py-0.5 border border-slate-700/50 rounded">
                  Exact Consular Bounding Presets
                </span>
              </div>
            </div>

            {/* Quick action buttons & sample loader with clean visual zone */}
            <div className="bg-slate-950/75 backdrop-blur-md p-3.5 rounded-xl border border-white/10 shadow-xl flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full lg:w-auto shrink-0">
              <div className="text-[11px] font-mono text-cyan-300 font-medium px-1 flex items-center justify-between">
                <span>QUICK AUTOMATION LAUNCH</span>
                <span className="text-[10px] text-slate-400">DOCX Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isBusyLoading}
                  onClick={() => handleLoadAcceptanceTest('fahmida_austria')}
                  className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-md cursor-pointer whitespace-nowrap rounded"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Sample 1: Austria (A–F)
                </button>
                <button
                  type="button"
                  disabled={isBusyLoading}
                  onClick={() => handleLoadAcceptanceTest('iqbal_greece')}
                  className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-md cursor-pointer whitespace-nowrap rounded"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Sample 2: Greece (A–M)
                </button>
              </div>
              <button
                type="button"
                onClick={() => docxInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-md cursor-pointer whitespace-nowrap rounded"
              >
                <FileText className="w-4 h-4" />
                Select / Drag &amp; Drop Word DOCX
              </button>
            </div>
          </div>
        </section>
        {/* 100% Client-Side Privacy Banner + Acceptance Test Suite Bar */}
        <div className="bg-white border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs">
              <span className="font-semibold text-slate-900">
                100% Client-Side In-Memory Processing
              </span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="text-slate-600">
                Zero document uploads to external servers. High-precision local OpenXML matching.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isBusyLoading}
              onClick={() => handleLoadAcceptanceTest('fahmida_austria')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Report 1: Fahmida Faria (Austria · A–F + G.1–G.5)
            </button>
            <button
              type="button"
              disabled={isBusyLoading}
              onClick={() => handleLoadAcceptanceTest('iqbal_greece')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Report 2: Iqbal Ahmmed (Greece · A–M + N.1–N.9)
            </button>
            <button
              type="button"
              disabled={isBusyLoading}
              onClick={() => handleLoadAcceptanceTest('bushra_finland')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Report 3: Bushra Akter (Finland · A–G Referee + H–L Applicant)
            </button>
            {/* Admin-Only Export & Build Tools */}
            {session.user.role === 'admin' ? (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    const xml = getBloggerThemeXmlDocument();
                    const res = validateXmlForBloggerExport(xml);
                    if (!res.isValid) {
                      appendLogs([
                        {
                          level: 'ERROR',
                          message: `Blogger XML Export Blocked: ${res.errorMessage}`,
                        },
                      ]);
                      return;
                    }
                    const copied = await copyTextToClipboardRobust(xml);
                    appendLogs([
                      {
                        level: 'VALIDATION',
                        message: `${res.statusLabel} — Single <${res.rootTagName}> root, <b:skin> count=${res.skinCount}, 0 DOMParser errors. ${
                          copied
                            ? 'Blogger Theme XML copied to clipboard.'
                            : 'Clipboard blocked by iframe; downloading XML file instead.'
                        }`,
                      },
                    ]);
                    if (!copied) {
                      exportBloggerThemeXmlFile();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-700" />
                  Copy Blogger Theme XML (1 &lt;b:skin&gt;)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const res = exportBloggerThemeXmlFile();
                    if (!res.isValid) {
                      appendLogs([
                        {
                          level: 'ERROR',
                          message: `Blogger XML Download Blocked: ${res.errorMessage}`,
                        },
                      ]);
                      return;
                    }
                    appendLogs([
                      {
                        level: 'VALIDATION',
                        message: `${res.statusLabel} — Downloaded MAISHAA_ANNEXURE_TOOLS_Blogger_Theme.xml (<b:skin> count=${res.skinCount}, 0 parsererror).`,
                      },
                    ]);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Blogger Theme XML
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await exportWindowsPcDesktopAppPackage();
                    appendLogs([
                      {
                        level: 'SUCCESS',
                        message:
                          'Downloaded MAISHAA_ANNEXURE_TOOLS_Windows_PC_App.zip (Windows Desktop App Launcher + Desktop Shortcut Creator + Electron .EXE config).',
                      },
                    ]);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Download Windows PC App (.ZIP)
                </button>
                <button
                  type="button"
                  onClick={exportStandaloneHtmlBuild}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Standalone HTML
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* MAIN SCREEN SIMPLIFIED RULE DISPLAY (Showing strictly the 6 requested items) */}
        <div className="bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                System Rules &amp; Profile Summary
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setAdminModalTab('rules');
                setIsAdminModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold cursor-pointer whitespace-nowrap"
            >
              <span>View Detailed Rules &amp; Specs in Admin Settings</span>
              <span>→</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 text-xs">
            {/* 1. Active Country/Profile */}
            <div className="p-2.5 bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block truncate">
                Active Country/Profile
              </span>
              <span className="font-mono font-bold text-slate-900 mt-1 block truncate">
                {effectiveCountry}
              </span>
            </div>

            {/* 2. Active Border Rule */}
            <div className="p-2.5 bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block truncate">
                Active Border Rule
              </span>
              <span className="font-mono font-bold text-emerald-700 mt-1 block truncate">
                {activeBorderProfile.pt.toFixed(2)} pt ({activeBorderProfile.emu} EMU)
              </span>
            </div>

            {/* 3. Certificate Portrait Size */}
            <div className="p-2.5 bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block truncate">
                Certificate Portrait Size
              </span>
              <span className="font-mono font-bold text-slate-900 mt-1 block">
                5.80&quot; × 8.20&quot;
              </span>
            </div>

            {/* 4. Certificate Landscape Size */}
            <div className="p-2.5 bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block truncate">
                Certificate Landscape Size
              </span>
              <span className="font-mono font-bold text-slate-900 mt-1 block">
                6.27&quot; × 4.40&quot;
              </span>
            </div>

            {/* 5. Photograph Rule: Active */}
            <div className="p-2.5 bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block truncate">
                Photograph Rule
              </span>
              <span className="font-mono font-bold text-blue-700 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                Active
              </span>
            </div>

            {/* 6. Duplicate Protection: ON */}
            <div className="p-2.5 bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block truncate">
                Duplicate Protection
              </span>
              <span className="font-mono font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                ON
              </span>
            </div>
          </div>
        </div>

        {/* THREE CORE INPUT CARDS (Section 3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* CARD A: WORD DOCUMENT (.DOCX) */}
          <div className="bg-white border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-slate-900 text-white font-mono font-semibold text-xs flex items-center justify-center">
                    A
                  </span>
                  <h2 className="text-sm font-semibold text-slate-900">
                    WORD DOCUMENT (.DOCX)
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  .docx only
                </span>
              </div>

              <div
                onClick={() => docxInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.length) {
                    handleLoadDocxFile(e.dataTransfer.files[0]);
                  }
                }}
                className="mt-4 border-2 border-dashed border-slate-300 hover:border-slate-900 bg-slate-50/60 p-5 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={docxInputRef}
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleLoadDocxFile(e.target.files[0]);
                    }
                  }}
                />
                <FileText className="w-7 h-7 mx-auto text-slate-700 mb-2" />
                <p className="text-xs font-semibold text-slate-900">
                  {docxState
                    ? docxState.filename
                    : 'Drag & Drop or Browse Word (.DOCX)'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Unpacks word/document.xml &amp; detects Annexure headings
                </p>
              </div>

              {docxState && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Filename:</span>
                    <span className="font-mono font-medium text-slate-900 truncate max-w-[180px]">
                      {docxState.filename}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">File Size:</span>
                    <span className="font-mono tabular-nums text-slate-900">
                      {(docxState.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Annexure Headings Scanned:
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {docxState.scannedHeadings.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Attachment Targets:</span>
                    <span className="font-mono tabular-nums font-semibold text-emerald-700">
                      {targets.length}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              {docxState ? (
                <button
                  type="button"
                  onClick={() => {
                    setDocxState(null);
                    setTargets([]);
                    clearGeneratedOutput();
                  }}
                  className="inline-flex items-center gap-1 text-rose-700 hover:text-rose-900 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove DOCX
                </button>
              ) : (
                <span className="text-slate-400">No DOCX loaded</span>
              )}
              <span className="font-mono text-[11px] text-slate-400">
                OpenXML 2007+
              </span>
            </div>
          </div>

          {/* CARD B: UPLOAD COPY (PRIMARY SOURCE) */}
          <div className="bg-white border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-slate-900 text-white font-mono font-semibold text-xs flex items-center justify-center">
                    B
                  </span>
                  <h2 className="text-sm font-semibold text-slate-900">
                    UPLOAD COPY (PRIMARY)
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  JPG / JPEG
                </span>
              </div>

              <div
                onClick={() => uploadCopyInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.length) {
                    handleAddImages(e.dataTransfer.files, 'upload_copy');
                  }
                }}
                className="mt-4 border-2 border-dashed border-slate-300 hover:border-slate-900 bg-slate-50/60 p-4 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={uploadCopyInputRef}
                  type="file"
                  accept=".jpg,.jpeg,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleAddImages(e.target.files, 'upload_copy');
                    }
                  }}
                />
                <Upload className="w-6 h-6 mx-auto text-slate-700 mb-1.5" />
                <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-medium">
                  Select Upload Copy JPGs
                </span>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Referee verified certificates, transcripts &amp; field photographs
                </p>
              </div>

              {/* Scrollable File List Preview (Section 46) */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                  <span>
                    UPLOAD COPY —{' '}
                    <strong className="font-mono tabular-nums text-slate-900">
                      {uploadCopyList.length}
                    </strong>{' '}
                    files
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {(
                      uploadCopyList.reduce((s, i) => s + i.sizeBytes, 0) /
                      (1024 * 1024)
                    ).toFixed(2)}{' '}
                    MB
                  </span>
                </div>
                <div className="h-28 overflow-y-auto border border-slate-200 bg-slate-50 p-2 text-[11px] font-mono space-y-1">
                  {uploadCopyList.length === 0 ? (
                    <div className="text-slate-400 italic py-6 text-center">
                      No Upload Copy files selected
                    </div>
                  ) : (
                    uploadCopyList.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 text-slate-700"
                      >
                        <span className="truncate">- {item.filename}</span>
                        <span className="text-slate-400 shrink-0">
                          {(item.sizeBytes / 1024).toFixed(0)}KB
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={uploadCopyList.length === 0}
                onClick={() => {
                  const remaining = images.filter(
                    (i) => i.source !== 'upload_copy'
                  );
                  setImages(remaining);
                  clearGeneratedOutput();
                  if (docxState) {
                    const res = runMultiFactorAutoMatcher(
                      targets.map((t) => ({
                        ...t,
                        assignedImageId: null,
                        status: 'PENDING',
                      })),
                      remaining,
                      effectiveCountry,
                      settings
                    );
                    setTargets(res.updatedTargets);
                  }
                }}
                className="text-rose-700 hover:text-rose-900 disabled:text-slate-300 font-medium cursor-pointer disabled:cursor-not-allowed"
              >
                Clear Upload Copy
              </button>
              <span className="text-[11px] text-slate-400">Priority 1</span>
            </div>
          </div>

          {/* CARD C: APPLICANT COPY (SECONDARY SOURCE) */}
          <div className="bg-white border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-slate-900 text-white font-mono font-semibold text-xs flex items-center justify-center">
                    C
                  </span>
                  <h2 className="text-sm font-semibold text-slate-900">
                    APPLICANT COPY (SECONDARY)
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  JPG / JPEG
                </span>
              </div>

              <div
                onClick={() => applicantCopyInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.length) {
                    handleAddImages(e.dataTransfer.files, 'applicant_copy');
                  }
                }}
                className="mt-4 border-2 border-dashed border-slate-300 hover:border-slate-900 bg-slate-50/60 p-4 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={applicantCopyInputRef}
                  type="file"
                  accept=".jpg,.jpeg,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleAddImages(e.target.files, 'applicant_copy');
                    }
                  }}
                />
                <Upload className="w-6 h-6 mx-auto text-slate-700 mb-1.5" />
                <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-medium">
                  Select Applicant Copy JPGs
                </span>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Applicant-provided certificates, transcripts &amp; records
                </p>
              </div>

              {/* Scrollable File List Preview (Section 46) */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                  <span>
                    APPLICANT COPY —{' '}
                    <strong className="font-mono tabular-nums text-slate-900">
                      {applicantCopyList.length}
                    </strong>{' '}
                    files
                  </span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {(
                      applicantCopyList.reduce((s, i) => s + i.sizeBytes, 0) /
                      (1024 * 1024)
                    ).toFixed(2)}{' '}
                    MB
                  </span>
                </div>
                <div className="h-28 overflow-y-auto border border-slate-200 bg-slate-50 p-2 text-[11px] font-mono space-y-1">
                  {applicantCopyList.length === 0 ? (
                    <div className="text-slate-400 italic py-6 text-center">
                      No Applicant Copy files selected
                    </div>
                  ) : (
                    applicantCopyList.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 text-slate-700"
                      >
                        <span className="truncate">- {item.filename}</span>
                        <span className="text-slate-400 shrink-0">
                          {(item.sizeBytes / 1024).toFixed(0)}KB
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={applicantCopyList.length === 0}
                onClick={() => {
                  const remaining = images.filter(
                    (i) => i.source !== 'applicant_copy'
                  );
                  setImages(remaining);
                  clearGeneratedOutput();
                  if (docxState) {
                    const res = runMultiFactorAutoMatcher(
                      targets.map((t) => ({
                        ...t,
                        assignedImageId: null,
                        status: 'PENDING',
                      })),
                      remaining,
                      effectiveCountry,
                      settings
                    );
                    setTargets(res.updatedTargets);
                  }
                }}
                className="text-rose-700 hover:text-rose-900 disabled:text-slate-300 font-medium cursor-pointer disabled:cursor-not-allowed"
              >
                Clear Applicant Copy
              </button>
              <span className="text-[11px] text-slate-400">Priority 2</span>
            </div>
          </div>
        </div>

        {/* COUNTRY BORDER PROFILE CONTROL SECTION */}
        <div
          id="country-border-profile-section"
          className="bg-white border border-slate-200 p-5 space-y-3.5"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                  COUNTRY BORDER PROFILE
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                  Country Border Profile:{' '}
                  {countryOption === 'Auto Detect'
                    ? `Auto Detect (${effectiveCountry})`
                    : countryOption}{' '}
                  selected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Select a country preset to update document borders. Detailed border specs and rules are in Admin Settings.
              </p>
            </div>

            {/* Individual Country Border Buttons + Apply Border Rules */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  'Austria',
                  'Greece',
                  'Finland',
                  'Italy',
                  'Auto Detect',
                ] as CountryOption[]
              ).map((c) => {
                const isSelected = countryOption === c;
                const resolvedForBtn =
                  c === 'Auto Detect'
                    ? docxState?.detectedCountry || 'Other'
                    : c;
                const btnProfile = getBorderProfile(resolvedForBtn, settings);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleSelectCountry(c)}
                    className={`px-3.5 py-2 text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                    }`}
                  >
                    <span>{c}</span>
                    <span
                      className={`ml-1.5 font-mono text-[10px] ${
                        isSelected ? 'text-emerald-300' : 'text-slate-500'
                      }`}
                    >
                      ({btnProfile.pt.toFixed(2)}pt)
                    </span>
                  </button>
                );
              })}

              <button
                id="apply-border-rules-btn"
                type="button"
                onClick={handleApplyBorderRules}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 border border-emerald-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Apply Border Rules
              </button>
            </div>
          </div>

          {/* Active Border State Summary & Confirmation Banner */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-700">
              <span>
                Selected Profile:{' '}
                <strong className="text-slate-900">{countryOption}</strong>
              </span>
              <span>·</span>
              <span>
                Effective Country:{' '}
                <strong className="text-slate-900">{effectiveCountry}</strong>
              </span>
              <span>·</span>
              <span>
                Active Border:{' '}
                <strong className="text-emerald-700">
                  {activeBorderProfile.pt.toFixed(2)} pt
                </strong>
              </span>
            </div>

            {borderConfirmMessage && (
              <div className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1">
                {borderConfirmMessage}
              </div>
            )}
          </div>
        </div>

        {/* COUNTS & STATISTICS + PROCESSING ACTIONS BAR (Sections 14 & 15) */}
        <div className="bg-white border border-slate-200 p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pb-4 border-b border-slate-100 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">
                Annexure Headings Scanned
              </span>
              <span className="mt-1 text-lg font-mono tabular-nums font-bold text-slate-900 block">
                {metrics.headingsScanned}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Attachment Targets</span>
              <span className="mt-1 text-lg font-mono tabular-nums font-bold text-slate-900 block">
                {metrics.attachmentTargetsCount}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Images Matched</span>
              <span className="mt-1 text-lg font-mono tabular-nums font-bold text-slate-900 block">
                {metrics.matchedCount}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Ready To Attach</span>
              <span className="mt-1 text-lg font-mono tabular-nums font-bold text-emerald-700 block">
                {metrics.readyToAttachCount}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">Pending</span>
              <span
                className={`mt-1 text-lg font-mono tabular-nums font-bold block ${
                  metrics.pendingCount > 0
                    ? 'text-amber-700'
                    : 'text-slate-900'
                }`}
              >
                {metrics.pendingCount}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">
                {generatedDocxBytes
                  ? 'Actual Final DOCX Size'
                  : 'Estimated DOCX Size'}
              </span>
              <span className="mt-1 text-lg font-mono tabular-nums font-bold text-slate-900 block">
                {generatedDocxBytes
                  ? `${(generatedDocxBytes / (1024 * 1024)).toFixed(2)} MB`
                  : `${metrics.estimatedFinalMb} MB`}
              </span>
            </div>
          </div>

          {/* Pending / Manual Later Warning & Partial Processing Toggle */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 text-xs flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label
                htmlFor="allow-partial-processing"
                className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900"
              >
                <input
                  id="allow-partial-processing"
                  type="checkbox"
                  checked={allowPartialProcessing}
                  onChange={(e) => setAllowPartialProcessing(e.target.checked)}
                  className="accent-slate-900 w-4 h-4"
                />
                <span>Allow Partial Processing (when Pending &gt; 0)</span>
              </label>

              {docxState && (
                <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-700">
                  <span>
                    Total Targets:{' '}
                    <strong className="text-slate-900">
                      {metrics.attachmentTargetsCount}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Attached Automatically / Manually:{' '}
                    <strong className="text-emerald-700">
                      {metrics.readyToAttachCount}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Left for Manual Attachment in Word:{' '}
                    <strong
                      className={
                        metrics.unattachedCount > 0
                          ? 'text-amber-700'
                          : 'text-slate-900'
                      }
                    >
                      {metrics.unattachedCount}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {docxState && metrics.unattachedCount > 0 && (
              <div
                className={`p-3 border text-xs space-y-1.5 ${
                  allowPartialProcessing || metrics.pendingCount === 0
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {allowPartialProcessing || metrics.pendingCount === 0 ? (
                      <div className="font-semibold">
                        Partial Processing Enabled: {metrics.unattachedCount}{' '}
                        attachment target(s) will remain unattached for manual
                        insertion in Word.
                      </div>
                    ) : (
                      <div className="font-semibold">
                        {metrics.pendingCount} target(s) are still pending.
                        Match them, set individual rows to &quot;Leave for Manual
                        Attachment in Word&quot;, or enable Partial Processing.
                      </div>
                    )}
                    <div className="font-mono text-[11px] space-y-0.5">
                      {metrics.unattachedTargets.map((u) => (
                        <div key={u.id}>
                          Pending for manual attachment: {u.displayCode} —{' '}
                          {u.rawText}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* OpenXML Validation Status Banner */}
          {validationReport && (
            <div
              className={`p-3 border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                validationReport.isValid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {validationReport.isValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                )}
                <span className="font-semibold">
                  {validationReport.isValid
                    ? `DOCX generated successfully. ${validationReport.insertedImagesCount} attached, ${metrics.unattachedCount} left for manual insertion in Word.`
                    : 'Final DOCX validation failed.'}
                </span>
              </div>
              <div className="font-mono text-[11px]">
                ZIP: {validationReport.zipOpens ? 'OK' : 'FAIL'} · document.xml:{' '}
                {validationReport.documentXmlValid ? 'OK' : 'FAIL'} · rels:{' '}
                {validationReport.relsXmlValid ? 'OK' : 'FAIL'} · Media:{' '}
                {validationReport.allMediaFilesExist ? 'OK' : 'FAIL'}
              </div>
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              {isBuildingDocx && buildProgress ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-700">
                      {buildProgress.statusMessage}
                    </span>
                    <span>
                      {Math.round(
                        (buildProgress.currentStep /
                          Math.max(1, buildProgress.totalSteps)) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-slate-900 transition-all duration-200"
                      style={{
                        width: `${Math.round(
                          (buildProgress.currentStep /
                            Math.max(1, buildProgress.totalSteps)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-600">
                  {!docxState
                    ? 'Step 1: Load a Word .DOCX file or click Test 1 / Test 2 above to inspect Annexure headings.'
                    : images.length === 0
                    ? 'Step 2: Select Upload Copy and/or Applicant Copy JPG/JPEG files.'
                    : 'Step 3: Review the Annexure Matching & Attachment Report below and generate the final validated DOCX.'}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                disabled={images.length === 0}
                onClick={() => setIsPreviewModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:border-slate-900 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5" />
                Pre-Processing Preview
              </button>

              <button
                type="button"
                disabled={!canStartMatching}
                onClick={handleStartMatching}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Start Processing &amp; Matching
              </button>

              <button
                type="button"
                disabled={!canGenerateFinalDocx}
                onClick={handleGenerateFinalDocx}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5" />
                {isBuildingDocx
                  ? 'Building & Validating DOCX...'
                  : 'Generate Final DOCX'}
              </button>

              {validationReport?.isValid && generatedDocxBlob && (
                <button
                  type="button"
                  onClick={handleDownloadFinalDocx}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  {metrics.unattachedCount > 0
                    ? 'Download Partial Modified DOCX (_PARTIAL_MODIFIED.docx)'
                    : 'Download Modified Word Document'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ANNEXURE MATCHING & ATTACHMENT REPORT (Section 13) */}
        <div className="bg-white border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                ANNEXURE MATCHING &amp; ATTACHMENT REPORT
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Strict 1-to-1 source assignment · Single-Photo Annexures (e.g. &quot;Photograph of ...&quot;) attach 1 image directly; Multi-Photo Containers (&quot;Photographs&quot; / &quot;Photos&quot;) extract child captions (`E.1`–`E.4`, `G.1`–`G.8`, `N.1`–`N.9`)
              </p>
            </div>
            <div className="text-xs font-mono text-slate-500">
              {targets.length} Attachment Target(s)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 w-14">#</th>
                  <th className="py-2.5 px-3 min-w-[290px]">
                    Annexure Heading / Caption
                  </th>
                  <th className="py-2.5 px-3 min-w-[260px]">
                    Matched Image File (Manual Override)
                  </th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Orientation</th>
                  <th className="py-2.5 px-3 text-right">Dimensions</th>
                  <th className="py-2.5 px-3 text-right">Border Rule</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {targets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-10 text-center text-slate-400 italic"
                    >
                      No Annexure targets scanned yet. Load a .DOCX file or click one of the Reference DOCX buttons above.
                    </td>
                  </tr>
                ) : (
                  targets.map((target, index) => {
                    const prevTarget = index > 0 ? targets[index - 1] : null;
                    const showPhotoContainerGroupRow =
                      target.isPhotoChild &&
                      (!prevTarget ||
                        prevTarget.parentHeadingId !== target.parentHeadingId);

                    const assignedImg = images.find(
                      (i) => i.id === target.assignedImageId
                    );

                    return (
                      <React.Fragment key={target.id}>
                        {showPhotoContainerGroupRow && (
                          <tr className="bg-slate-100/90 border-y border-slate-300">
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">
                              {target.displayCode.split('.')[0]}
                            </td>
                            <td
                              colSpan={8}
                              className="py-2 px-3 font-semibold text-slate-900"
                            >
                              {target.parentHeadingText}{' '}
                              <span className="ml-2 font-mono text-[11px] font-normal text-slate-500">
                                · MULTI-PHOTO CONTAINER HEADING (Container title receives no image; child captions below receive individual photos)
                              </span>
                            </td>
                          </tr>
                        )}

                        <tr className="hover:bg-slate-50/80 transition-colors align-top">
                          <td className="py-3 px-3 font-mono tabular-nums font-semibold text-slate-900">
                            {target.displayCode}
                          </td>
                          <td className="py-3 px-3">
                            <div
                              className={`font-medium text-slate-900 ${
                                target.isPhotoChild ? 'pl-3 border-l-2 border-slate-300' : ''
                              }`}
                            >
                              {target.rawText}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                              {target.targetKind === 'single_photo'
                                ? 'Single-Photo Annexure Target'
                                : target.targetKind === 'photo_child'
                                ? 'Multi-Photo Container Child'
                                : 'Normal Annexure Target'}{' '}
                              · {target.matchReason}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {assignedImg && (
                                <img
                                  src={assignedImg.thumbUrl}
                                  alt={assignedImg.filename}
                                  className="w-8 h-8 object-cover border border-slate-300 shrink-0"
                                />
                              )}
                              <select
                                value={
                                  target.status === 'MANUAL_LATER'
                                    ? '__MANUAL_LATER__'
                                    : target.assignedImageId || ''
                                }
                                onChange={(e) =>
                                  handleManualTargetSelect(
                                    target.id,
                                    e.target.value
                                  )
                                }
                                aria-label={`Select image for ${target.displayCode}`}
                                className="w-full py-1.5 px-2 text-xs border border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:outline-none"
                              >
                                <option value="">-- Select image --</option>
                                <option value="__MANUAL_LATER__">
                                  -- Leave for Manual Attachment in Word --
                                </option>
                                {uploadCopyList.length > 0 && (
                                  <optgroup label="Upload Copy (Primary)">
                                    {uploadCopyList
                                      .filter((i) => !i.isIgnoredBranding)
                                      .map((img) => {
                                        const heldByOther = targets.find(
                                          (t) =>
                                            t.id !== target.id &&
                                            t.assignedImageId === img.id
                                        );
                                        return (
                                          <option key={img.id} value={img.id}>
                                            Upload: {img.filename}
                                            {heldByOther
                                              ? ` (Assigned to ${heldByOther.displayCode})`
                                              : ''}
                                          </option>
                                        );
                                      })}
                                  </optgroup>
                                )}
                                {applicantCopyList.length > 0 && (
                                  <optgroup label="Applicant Copy (Secondary)">
                                    {applicantCopyList
                                      .filter((i) => !i.isIgnoredBranding)
                                      .map((img) => {
                                        const heldByOther = targets.find(
                                          (t) =>
                                            t.id !== target.id &&
                                            t.assignedImageId === img.id
                                        );
                                        return (
                                          <option key={img.id} value={img.id}>
                                            Applicant: {img.filename}
                                            {heldByOther
                                              ? ` (Assigned to ${heldByOther.displayCode})`
                                              : ''}
                                          </option>
                                        );
                                      })}
                                  </optgroup>
                                )}
                              </select>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                            {assignedImg
                              ? assignedImg.source === 'upload_copy'
                                ? 'Upload Copy'
                                : 'Applicant Copy'
                              : '—'}
                          </td>
                          <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                            {resolveEffectiveCategory(
                              target.classification,
                              assignedImg?.inferredCategory,
                              target.isPhotoChild
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                            {target.orientation}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                            {target.plannedDimensionsLabel}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                            {target.borderPt.toFixed(2)} pt ({ptToEmu(target.borderPt)} EMU)
                          </td>
                          <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                            {target.status === 'MATCHED' && (
                              <span className="text-emerald-700 font-semibold">
                                MATCHED
                              </span>
                            )}
                            {target.status === 'MANUAL' && (
                              <span className="text-indigo-700 font-semibold">
                                MANUAL
                              </span>
                            )}
                            {target.status === 'REVIEW' && (
                              <span className="text-amber-700 font-semibold">
                                REVIEW
                              </span>
                            )}
                            {target.status === 'MANUAL_LATER' && (
                              <span className="text-amber-700 font-semibold">
                                MANUAL_LATER
                              </span>
                            )}
                            {target.status === 'PENDING' && (
                              <span className="text-rose-700 font-semibold">
                                PENDING
                              </span>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* LIVE PROCESSING CONSOLE (Section 38) */}
        <div className="bg-slate-900 border border-slate-800 overflow-hidden flex flex-col h-72">
          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-200">
              <span className="text-emerald-400">●</span>
              <span className="font-semibold">LIVE PROCESSING CONSOLE</span>
              <span className="text-slate-500">
                ({consoleLogs.length} entries)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const text = consoleLogs
                    .map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`)
                    .join('\n');
                  navigator.clipboard.writeText(text);
                  appendLogs([
                    {
                      level: 'INFO',
                      message: 'Console output copied to clipboard.',
                    },
                  ]);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:text-white bg-slate-800 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                Copy Console
              </button>
              <button
                type="button"
                onClick={() => setConsoleLogs([])}
                className="px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:text-rose-400 bg-slate-800 cursor-pointer"
              >
                Clear Console
              </button>
            </div>
          </div>

          <div className="flex-1 p-3.5 overflow-y-auto font-mono text-[11px] space-y-1.5 text-slate-300">
            {consoleLogs.length === 0 ? (
              <div className="text-slate-500 italic">Console cleared.</div>
            ) : (
              consoleLogs.map((log) => {
                let levelColor = 'text-slate-400';
                if (log.level === 'MATCH' || log.level === 'SUCCESS')
                  levelColor = 'text-emerald-400';
                else if (log.level === 'VALIDATION')
                  levelColor = 'text-sky-400';
                else if (
                  log.level === 'SKIP DUPLICATE' ||
                  log.level === 'WARNING'
                )
                  levelColor = 'text-amber-400';
                else if (log.level === 'ERROR') levelColor = 'text-rose-400';

                return (
                  <div key={log.id} className="leading-relaxed break-all">
                    <span className="text-slate-500 mr-2">
                      [{log.timestamp}]
                    </span>
                    <span className={`font-semibold mr-2 ${levelColor}`}>
                      [{log.level}]
                    </span>
                    <span>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* DEDICATED ADVERTISEMENT SECTION (Strictly isolated from controls, tables, and generators) */}
        <AdvertisementBanner />
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <img
            src="/maishaa_brand_logo.jpg"
            alt="MAISHAA"
            className="w-7 h-7 rounded-md object-contain border border-slate-200 shadow-2xs"
          />
          <span className="font-semibold text-slate-800 font-mono">
            MAISHAA.ANNEXURE-TOOLS
          </span>
          <span className="text-slate-300">·</span>
          <span>100% Client-Side OpenXML &amp; Image Automation</span>
        </div>
        {session.user.role === 'admin' ? (
          <button
            type="button"
            onClick={() => {
              setAdminModalTab('rules');
              setIsAdminModalOpen(true);
            }}
            className="font-mono text-[11px] text-slate-600 hover:text-blue-700 underline cursor-pointer"
          >
            Admin: View All System Rules &amp; Specifications →
          </button>
        ) : (
          <span className="font-mono text-[11px] text-slate-400">
            Rules &amp; Specs (Admin Protected)
          </span>
        )}
      </footer>

      {/* MODALS */}
      <PreProcessingModal
        isOpen={isPreviewModalOpen}
        images={images}
        settings={settings}
        onClose={() => setIsPreviewModalOpen(false)}
        onAcceptAndContinue={() => {
          setIsPreviewModalOpen(false);
          if (canStartMatching) {
            handleStartMatching();
          }
        }}
        onUpdateCompressedPreviews={(updatedMap) => {
          setImages((prev) =>
            prev.map((img) => {
              const found = updatedMap.get(img.id);
              if (!found) return img;
              return {
                ...img,
                optimizedBlob: found.blob,
                optimizedBytes: found.bytes,
                optimizedWidthPx: found.widthPx,
                optimizedHeightPx: found.heightPx,
              };
            })
          );
          appendLogs([
            {
              level: 'INFO',
              message: `Pre-Processing Preview: Computed exact Canvas JPEG compression across ${updatedMap.size} image(s).`,
            },
          ]);
        }}
      />

      <AdminSettingsModal
        isOpen={isAdminModalOpen}
        settings={settings}
        initialTab={adminModalTab}
        onChangeSettings={(next) => {
          setSettings(next);
          clearGeneratedOutput();
          setTargets((prev) =>
            prev.map((t) => ({
              ...t,
              borderPt: getBorderPtForCountry(
                effectiveCountry,
                t.rawText,
                next
              ),
            }))
          );
        }}
        onClose={() => setIsAdminModalOpen(false)}
      />

      <PcDesktopAppModal
        isOpen={isPcAppModalOpen}
        onClose={() => setIsPcAppModalOpen(false)}
        onLogMessage={(msg) =>
          appendLogs([{ level: 'SUCCESS', message: msg }])
        }
      />

      <OfflineIndicator />
    </div>
  );
}
