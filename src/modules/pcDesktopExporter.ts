import JSZip from 'jszip';
import { getStandaloneHtmlDocument } from './standaloneExporter';

/**
 * Generates and downloads a complete Windows PC Desktop Application Bundle (.ZIP)
 * containing:
 * 1. Start_MAISHAA_PC_App.bat — Native Windows App Window Launcher (Edge / Chrome --app mode, no address bar)
 * 2. Create_Desktop_Shortcut.vbs — One-click Windows Desktop & Start Menu Shortcut Creator
 * 3. app/MAISHAA_ANNEXURE_TOOLS.html — Full self-contained offline-capable PC application
 * 4. electron/main.cjs & electron/package.json — Native Windows .EXE compiler setup (Electron Builder)
 * 5. README_WINDOWS_PC_APP.txt — Step-by-step instructions
 */
export async function exportWindowsPcDesktopAppPackage(): Promise<void> {
  const zip = new JSZip();
  const standaloneHtml = getStandaloneHtmlDocument();

  // 1. Core Application HTML inside /app
  zip.file('app/MAISHAA_ANNEXURE_TOOLS.html', standaloneHtml);

  // 2. Windows Native Desktop App Window Launcher (.bat)
  const batchLauncher = `@echo off
title MAISHAA.ANNEXURE-TOOLS Desktop Launcher
set "APP_HTML=%~dp0app\\MAISHAA_ANNEXURE_TOOLS.html"
set "APP_URL=file:///%APP_HTML:\\=/%"

:: Try Microsoft Edge in native --app desktop window mode (pre-installed on Windows 10 & 11)
where msedge >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  start "" msedge --app="%APP_URL%" --window-size=1400,900
  exit /b 0
)

if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
  start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%APP_URL%" --window-size=1400,900
  exit /b 0
)

if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
  start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%APP_URL%" --window-size=1400,900
  exit /b 0
)

:: Fallback to Google Chrome in native --app desktop window mode
where chrome >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  start "" chrome --app="%APP_URL%" --window-size=1400,900
  exit /b 0
)

if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
  start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app="%APP_URL%" --window-size=1400,900
  exit /b 0
)

:: Final fallback: open with default system browser
start "" "%APP_HTML%"
exit /b 0
`;
  zip.file(
    'Start_MAISHAA_PC_App.bat',
    batchLauncher.replace(/\r?\n/g, '\r\n')
  );

  // 3. One-Click Desktop Shortcut Creator (.vbs)
  const vbsShortcutCreator = `Option Explicit
Dim WshShell, fso, currentDir, desktopDir, shortcutPath, oShellLink
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
desktopDir = WshShell.SpecialFolders("Desktop")
shortcutPath = desktopDir & "\\MAISHAA Annexure Tools.lnk"

Set oShellLink = WshShell.CreateShortcut(shortcutPath)
oShellLink.TargetPath = currentDir & "\\Start_MAISHAA_PC_App.bat"
oShellLink.WorkingDirectory = currentDir
oShellLink.WindowStyle = 7
oShellLink.Description = "MAISHAA.ANNEXURE-TOOLS — DOCX Annexure Image Matcher & OpenXML Word Automator"
oShellLink.IconLocation = "shell32.dll,1"
oShellLink.Save

MsgBox "Desktop Shortcut 'MAISHAA Annexure Tools' has been created on your Windows Desktop!", vbInformation, "MAISHAA PC Desktop Setup"
`;
  zip.file(
    'Create_Desktop_Shortcut.vbs',
    vbsShortcutCreator.replace(/\r?\n/g, '\r\n')
  );

  // 4. Optional Native Electron .EXE Builder files
  const electronMain = `const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1420,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'MAISHAA.ANNEXURE-TOOLS — PC Desktop Application',
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'app', 'MAISHAA_ANNEXURE_TOOLS.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
`;
  zip.file('electron/main.cjs', electronMain);

  const electronPkg = JSON.stringify(
    {
      name: 'maishaa-annexure-tools-desktop',
      productName: 'MAISHAA Annexure Tools',
      version: '1.0.0',
      description:
        '100% Client-Side DOCX Annexure Image Matcher & OpenXML Word Automator',
      main: 'electron/main.cjs',
      scripts: {
        start: 'electron .',
        'dist:win': 'electron-builder --win portable nsis',
      },
      build: {
        appId: 'com.maishaa.annexuretools',
        productName: 'MAISHAA Annexure Tools',
        files: ['app/**/*', 'electron/**/*'],
        win: {
          target: ['portable', 'nsis'],
        },
      },
      devDependencies: {
        electron: '^33.0.0',
        'electron-builder': '^25.1.8',
      },
    },
    null,
    2
  );
  zip.file('package.json', electronPkg);

  // 5. README Instructions
  const readmeTxt = `========================================================================
MAISHAA.ANNEXURE-TOOLS — WINDOWS PC DESKTOP APPLICATION
========================================================================

Thank you for downloading the MAISHAA.ANNEXURE-TOOLS PC Desktop Package.
All DOCX and JPG/JPEG processing runs 100% locally on your PC.

------------------------------------------------------------------------
OPTION 1: INSTANT WINDOWS PC DESKTOP APP (NO INSTALLATION REQUIRED)
------------------------------------------------------------------------
1. Extract this ZIP folder anywhere on your PC (for example, C:\\MAISHAA_App
   or your Desktop).
2. Double-click "Start_MAISHAA_PC_App.bat" to launch the application in a
   dedicated native desktop window (without browser tabs or address bars).
3. Double-click "Create_Desktop_Shortcut.vbs" once to place a
   "MAISHAA Annexure Tools" icon directly on your Windows Desktop!

------------------------------------------------------------------------
OPTION 2: BUILD A STANDALONE WINDOWS .EXE (OPTIONAL, FOR DEVELOPERS)
------------------------------------------------------------------------
If you have Node.js installed on your PC and want to compile a single
standalone .EXE file:
1. Open Command Prompt or PowerShell in this extracted folder.
2. Run:
   npm install
   npm run dist:win
3. Your compiled Windows .EXE will appear in the "dist/" folder.
========================================================================
`;
  zip.file(
    'README_WINDOWS_PC_APP.txt',
    readmeTxt.replace(/\r?\n/g, '\r\n')
  );

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'MAISHAA_ANNEXURE_TOOLS_Windows_PC_App.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
