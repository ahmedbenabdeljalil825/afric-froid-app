import { contextBridge, ipcRenderer } from 'electron';

// --------- Expose dedicated Electron Updater API securely ---------
contextBridge.exposeInMainWorld('electronUpdater', {
  isElectron: true,
  checkForUpdates: async () => {
    const res = await ipcRenderer.invoke('updater-check');
    if (res && res.success === false) {
      throw new Error(res.error || 'Failed to check for updates');
    }
    return res;
  },
  startDownload: async () => {
    const res = await ipcRenderer.invoke('updater-start-download');
    if (res && res.success === false) {
      throw new Error(res.error || 'Failed to start download');
    }
    return res;
  },
  installUpdate: async () => {
    const res = await ipcRenderer.invoke('updater-install');
    if (res && res.success === false) {
      throw new Error(res.error || 'Failed to install update');
    }
    return res;
  },
  simulateUpdateFlow: (options?: { stepDelayMs?: number }) =>
    ipcRenderer.invoke('updater-simulate-flow', options),
  onChecking: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('updater-checking', listener);
    return () => ipcRenderer.off('updater-checking', listener);
  },
  onUpdateAvailable: (callback: (info: any) => void) => {
    const listener = (_: any, info: any) => callback(info);
    ipcRenderer.on('updater-available', listener);
    return () => ipcRenderer.off('updater-available', listener);
  },
  onUpdateNotAvailable: (callback: (info: any) => void) => {
    const listener = (_: any, info: any) => callback(info);
    ipcRenderer.on('updater-not-available', listener);
    return () => ipcRenderer.off('updater-not-available', listener);
  },
  onProgress: (callback: (progress: { percent: number; bytesPerSecond?: number; transferred?: number; total?: number }) => void) => {
    const listener = (_: any, p: any) => callback(p);
    ipcRenderer.on('updater-progress', listener);
    return () => ipcRenderer.off('updater-progress', listener);
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    const listener = (_: any, info: any) => callback(info);
    ipcRenderer.on('updater-downloaded', listener);
    return () => ipcRenderer.off('updater-downloaded', listener);
  },
  onError: (callback: (errorMsg: string) => void) => {
    const listener = (_: any, err: any) => callback(typeof err === 'string' ? err : err?.message || 'Update error');
    ipcRenderer.on('updater-error', listener);
    return () => ipcRenderer.off('updater-error', listener);
  },
});
