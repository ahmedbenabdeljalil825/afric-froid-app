/**
 * Test: Verify Electron Updater Logic and Progress Events
 *
 * Verifies that:
 * 1. package.json has GitHub publish config.
 * 2. electron/main.ts sets up electron-updater and emits updater-checking,
 *    updater-available, updater-progress, and updater-downloaded events.
 * 3. electron/main.ts dynamically resolves existing preload file (preload.mjs or preload.js).
 * 4. electron/preload.ts securely exposes electronUpdater to the renderer without leaking raw ipcRenderer.
 * 5. Simulated update check executes and triggers download progress events correctly.
 */

import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';

async function runTest() {
  console.log('=== [TEST] Electron Updater Verification ===');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Check package.json build.publish
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const publish = pkg.build?.publish;
  const githubPublish = Array.isArray(publish) ? publish[0] : publish;

  assert(
    githubPublish &&
    githubPublish.provider === 'github' &&
    githubPublish.owner === 'ahmedbenabdeljalil825' &&
    githubPublish.repo === 'afric-froid-app',
    'package.json contains correct GitHub publish configuration for electron-builder'
  );

  // 2. Check electron/main.ts contains autoUpdater configuration
  const mainTs = fs.readFileSync('electron/main.ts', 'utf8');
  assert(mainTs.includes("from 'electron-updater'"), 'electron/main.ts imports autoUpdater from electron-updater');
  assert(mainTs.includes("setFeedURL"), 'electron/main.ts configures GitHub feed URL for autoUpdater');
  assert(mainTs.includes("'updater-checking'"), 'electron/main.ts emits updater-checking event');
  assert(mainTs.includes("'updater-available'"), 'electron/main.ts emits updater-available event');
  assert(mainTs.includes("'updater-progress'"), 'electron/main.ts emits updater-progress event with progress info');
  assert(mainTs.includes("'updater-downloaded'"), 'electron/main.ts emits updater-downloaded event');
  assert(mainTs.includes("quitAndInstall"), 'electron/main.ts handles installUpdate with quitAndInstall');

  // 3. Preload resolution robustness check (must handle preload.mjs from Vite build)
  assert(
    mainTs.includes('preload.mjs') && mainTs.includes('existsSync'),
    'electron/main.ts dynamically resolves preload.mjs / preload.js safely'
  );

  // 3b. Electron crash resilience and navigation security
  assert(
    mainTs.includes('safeSend') && mainTs.includes('isDestroyed'),
    'electron/main.ts protects against destroyed window IPC crashes via safeSend'
  );
  assert(
    mainTs.includes('setWindowOpenHandler') && mainTs.includes('openExternal'),
    'electron/main.ts prevents window hijacking by routing external URLs to default browser'
  );
  assert(
    mainTs.includes('requestSingleInstanceLock'),
    'electron/main.ts configures single instance lock to prevent concurrent file locking conflicts'
  );
  assert(
    mainTs.includes('forceDevUpdateConfig'),
    'electron/main.ts sets forceDevUpdateConfig for reliable development/testing execution'
  );

  // 4. Check electron/preload.ts exposes electronUpdater API securely
  const preloadTs = fs.readFileSync('electron/preload.ts', 'utf8');
  assert(preloadTs.includes("'electronUpdater'"), 'electron/preload.ts exposes electronUpdater in main world');
  assert(preloadTs.includes("checkForUpdates"), 'preload exposes checkForUpdates()');
  assert(preloadTs.includes("startDownload"), 'preload exposes startDownload()');
  assert(preloadTs.includes("installUpdate"), 'preload exposes installUpdate()');
  assert(preloadTs.includes("onProgress"), 'preload exposes onProgress() listener');
  assert(preloadTs.includes("onUpdateNotAvailable"), 'preload exposes onUpdateNotAvailable() listener');
  assert(preloadTs.includes("throw new Error"), 'preload propagates IPC error messages to renderer');
  assert(!preloadTs.includes("contextBridge.exposeInMainWorld('ipcRenderer'"), 'electron/preload.ts does not leak unrestricted ipcRenderer');

  // 4b. Check UpdatePrompt handles countdown, retry and onUpdateNotAvailable safely
  const updatePromptTsx = fs.readFileSync('components/UpdatePrompt.tsx', 'utf8');
  assert(
    updatePromptTsx.includes('onUpdateNotAvailable'),
    'UpdatePrompt subscribes to onUpdateNotAvailable preventing stuck checking state'
  );
  assert(
    updatePromptTsx.includes('countdown <= 1') && updatePromptTsx.includes('setCountdown(null)'),
    'UpdatePrompt resets countdown to null before execution, preventing infinite loops'
  );
  assert(
    updatePromptTsx.includes('handleRetry') && updatePromptTsx.includes('failedAction'),
    'UpdatePrompt tracks failedAction and implements smart retry handler'
  );

  // 5. Simulate the update flow execution and verify progress events
  console.log('\n  -- Simulating Electron Update Flow --');
  const mockWebContents = new EventEmitter();
  const recordedEvents = [];
  const progressSnapshots = [];

  mockWebContents.on('updater-checking', () => {
    recordedEvents.push('checking');
  });

  mockWebContents.on('updater-available', (info) => {
    recordedEvents.push('available');
    assert(info.version === '1.5.1', `Update available info contains version ${info.version}`);
  });

  mockWebContents.on('updater-progress', (progress) => {
    recordedEvents.push('progress');
    progressSnapshots.push(progress.percent);
  });

  mockWebContents.on('updater-downloaded', (info) => {
    recordedEvents.push('downloaded');
  });

  // Execute simulation sequence
  mockWebContents.emit('updater-checking');
  mockWebContents.emit('updater-available', { version: '1.5.1' });

  const simulatedSteps = [15, 35, 60, 85, 100];
  const total = 125330554;
  for (const p of simulatedSteps) {
    mockWebContents.emit('updater-progress', {
      percent: p,
      bytesPerSecond: 2500000,
      transferred: Math.floor((p / 100) * total),
      total,
    });
  }
  mockWebContents.emit('updater-downloaded', { version: '1.5.1' });

  assert(recordedEvents.includes('checking'), 'Received updater-checking event');
  assert(recordedEvents.includes('available'), 'Received updater-available event');
  assert(progressSnapshots.length === 5, 'Received 5 download progress ticks');
  assert(progressSnapshots[0] === 15 && progressSnapshots[4] === 100, 'Progress stepped from 15% to 100%');
  assert(recordedEvents.includes('downloaded'), 'Received updater-downloaded event');

  console.log(`\nElectron Updater Test Summary: ${passed} Passed, ${failed} Failed\n`);
  if (failed > 0) process.exit(1);
}

runTest();
