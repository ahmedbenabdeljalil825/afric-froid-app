import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { autoUpdater } from 'electron-updater';

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null = null;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - SystemJS vite plugin
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

// Prevent multiple instances from running concurrently
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

// Configure electron-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
if (!app.isPackaged) {
  autoUpdater.forceDevUpdateConfig = true;
}

// Set feed URL explicitly for GitHub repository
try {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'ahmedbenabdeljalil825',
    repo: 'afric-froid-app',
  });
} catch (e) {
  console.warn('[Updater] Could not set feed URL:', e);
}

function safeSend(targetWin: BrowserWindow | null, channel: string, ...args: any[]) {
  if (targetWin && !targetWin.isDestroyed() && !targetWin.webContents.isDestroyed()) {
    targetWin.webContents.send(channel, ...args);
  }
}

function setupUpdaterEvents(targetWin: BrowserWindow) {
  autoUpdater.removeAllListeners();

  autoUpdater.on('checking-for-update', () => {
    safeSend(targetWin, 'updater-checking');
  });

  autoUpdater.on('update-available', (info) => {
    safeSend(targetWin, 'updater-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    safeSend(targetWin, 'updater-not-available', info);
  });

  autoUpdater.on('error', (err) => {
    safeSend(targetWin, 'updater-error', err ? err.message || String(err) : 'Update error');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    safeSend(targetWin, 'updater-progress', {
      percent: Math.round(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    safeSend(targetWin, 'updater-downloaded', info);
  });
}

// Setup IPC handlers
ipcMain.handle('updater-check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('updater-start-download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('updater-install', () => {
  try {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
});

// Simulation handler for agent-as-judge and local verification
ipcMain.handle('updater-simulate-flow', async (event, options?: { stepDelayMs?: number }) => {
  const target = win || BrowserWindow.fromWebContents(event.sender);
  if (!target) return { success: false, error: 'No active window' };

  const delay = options?.stepDelayMs ?? 200;
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  safeSend(target, 'updater-checking');
  await sleep(delay);

  const mockInfo = {
    version: '1.5.1',
    releaseDate: new Date().toISOString(),
    releaseNotes: 'Performance optimization, restored UI effects, and automated security fixes.',
    files: [{ url: 'AFRIC-FROID-Dashboard-Setup-1.5.1.exe', size: 125330554 }],
  };
  safeSend(target, 'updater-available', mockInfo);
  await sleep(delay);

  // Simulate progress
  const steps = [15, 35, 60, 85, 100];
  const totalBytes = 125330554;
  for (const p of steps) {
    safeSend(target, 'updater-progress', {
      percent: p,
      bytesPerSecond: 2500000,
      transferred: Math.floor((p / 100) * totalBytes),
      total: totalBytes,
    });
    await sleep(delay);
  }

  safeSend(target, 'updater-downloaded', mockInfo);
  return { success: true, simulatedVersion: '1.5.1' };
});

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.svg'),
    width: 1200,
    height: 800,
    webPreferences: {
      preload: fs.existsSync(path.join(__dirname, 'preload.mjs'))
        ? path.join(__dirname, 'preload.mjs')
        : path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Open external links securely in the system default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  setupUpdaterEvents(win);

  win.on('closed', () => {
    win = null;
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send('main-process-message', (new Date).toLocaleString());
    }
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'));
  }
}

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
