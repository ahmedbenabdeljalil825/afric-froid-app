/**
 * AfricFroid IIOT - UI Effects & Animation Verification Suite
 * 
 * Verifies:
 * 1. CSS Theme configuration (@theme frost tokens and @config in index.css)
 * 2. Animation utility classes (.slide-in-from-bottom-2, .delay-700, durations)
 * 3. Route & Page transition configuration in PageTransition.tsx
 * 4. Staggered card animations in ClientDashboard.tsx & ClientControls.tsx
 * 5. Accordion expand/collapse motion in Controller & System headers
 * 6. Modal and confirmation dialog animations (ConfirmProvider.tsx, AdminDashboard.tsx, UpdatePrompt.tsx)
 * 7. Active navigation styling tokens in Layout.tsx
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

const ROOT_DIR = path.resolve(process.cwd());
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

console.log('=== AfricFroid UI Effects & Animation Verification ===\n');

// 1. Theme Configuration in index.css
console.log('Group 1: CSS Theme Tokens & Utility Classes');
const indexCssPath = path.join(ROOT_DIR, 'index.css');
const indexCss = fs.readFileSync(indexCssPath, 'utf8');

test('index.css contains @theme block defining frost color scale', () => {
  assert.ok(indexCss.includes('@theme'), 'Missing @theme directive');
  assert.ok(indexCss.includes('--color-frost-500: #009fe3'), 'Missing --color-frost-500');
  assert.ok(indexCss.includes('--color-frost-50:'), 'Missing --color-frost-50');
  assert.ok(indexCss.includes('--color-frost-900:'), 'Missing --color-frost-900');
});

test('index.css includes @config for tailwind.config.js', () => {
  assert.ok(indexCss.includes('@config "./tailwind.config.js"'), 'Missing @config directive');
});

test('index.css defines slide-in-from-bottom-2 and slide-in-from-top-2 utilities', () => {
  assert.ok(indexCss.includes('.slide-in-from-bottom-2'), 'Missing .slide-in-from-bottom-2 class');
  assert.ok(indexCss.includes('.slide-in-from-top-2'), 'Missing .slide-in-from-top-2 class');
  assert.ok(indexCss.includes('--tw-enter-translate-y: 0.5rem'), 'Missing enter translate value');
});

test('index.css defines delay-700 and animation duration utilities', () => {
  assert.ok(indexCss.includes('.delay-700'), 'Missing .delay-700 class');
  assert.ok(indexCss.includes('.duration-200'), 'Missing duration-200');
  assert.ok(indexCss.includes('.duration-500'), 'Missing duration-500');
  assert.ok(indexCss.includes('.duration-1000'), 'Missing duration-1000');
});

// 2. Page Transition
console.log('\nGroup 2: Route & Page Transitions');
const pageTransitionPath = path.join(ROOT_DIR, 'components', 'PageTransition.tsx');
const pageTransitionContent = fs.readFileSync(pageTransitionPath, 'utf8');

test('PageTransition uses AnimatePresence and motion.div with location key', () => {
  assert.ok(pageTransitionContent.includes('AnimatePresence'), 'Missing AnimatePresence in PageTransition');
  assert.ok(pageTransitionContent.includes('motion.div'), 'Missing motion.div in PageTransition');
  assert.ok(pageTransitionContent.includes('key={location.pathname}'), 'Missing key={location.pathname} for route transitions');
});

test('PageTransition defines initial, animate, and exit animations', () => {
  assert.ok(pageTransitionContent.includes('initial: { opacity: 0') || pageTransitionContent.includes('initial={{ opacity: 0'), 'Missing initial opacity state');
  assert.ok(pageTransitionContent.includes('animate: { opacity: 1') || pageTransitionContent.includes('animate={{ opacity: 1'), 'Missing animate opacity state');
  assert.ok(pageTransitionContent.includes('exit: { opacity: 0') || pageTransitionContent.includes('exit={{ opacity: 0'), 'Missing exit opacity state');
});

const appTsxPath = path.join(ROOT_DIR, 'App.tsx');
const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');

test('App.tsx Routes has key={location.pathname} for AnimatePresence synchronization', () => {
  assert.ok(appTsxContent.includes('<Routes location={location} key={location.pathname}>'), 'App.tsx Routes missing key={location.pathname}');
});

// 3. Staggered Card Animations & Accordions in Dashboards
console.log('\nGroup 3: Staggered Widget Animations & Collapsible Accordions');
const clientDashboardPath = path.join(ROOT_DIR, 'pages', 'ClientDashboard.tsx');
const clientDashboardContent = fs.readFileSync(clientDashboardPath, 'utf8');

test('ClientDashboard implements staggered animation delays on cards', () => {
  assert.ok(clientDashboardContent.includes('animationDelay'), 'Missing animationDelay styling on widget cards');
  assert.ok(clientDashboardContent.includes('animate-in fade-in slide-in-from-bottom-2'), 'Missing animate-in class composition');
});

test('ClientDashboard implements smooth motion accordion for Controller & System sections', () => {
  assert.ok(clientDashboardContent.includes('motion.div'), 'Missing motion.div for accordion sections');
  assert.ok(clientDashboardContent.includes('AnimatePresence'), 'Missing AnimatePresence for conditional expand');
  assert.ok(clientDashboardContent.includes('initial={{ opacity: 0, height: 0 }}') || clientDashboardContent.includes('initial={{ height: 0, opacity: 0 }}'), 'Missing accordion entrance state');
  assert.ok(clientDashboardContent.includes('exit={{ opacity: 0, height: 0 }}') || clientDashboardContent.includes('exit={{ height: 0, opacity: 0 }}'), 'Missing accordion exit state');
});

const clientControlsPath = path.join(ROOT_DIR, 'pages', 'ClientControls.tsx');
const clientControlsContent = fs.readFileSync(clientControlsPath, 'utf8');

test('ClientControls implements staggered animations on control groups', () => {
  assert.ok(clientControlsContent.includes('animate-in fade-in slide-in-from-bottom-2'), 'Missing entrance animation classes in ClientControls');
  assert.ok(clientControlsContent.includes('animationDelay'), 'Missing staggered animationDelay in ClientControls');
});

// 4. Modal and Dialog Transitions
console.log('\nGroup 4: Modal & Overlay Animations');
const confirmProviderPath = path.join(ROOT_DIR, 'components', 'ConfirmProvider.tsx');
const confirmProviderContent = fs.readFileSync(confirmProviderPath, 'utf8');

test('ConfirmProvider uses Framer Motion for modal backdrop and container', () => {
  assert.ok(confirmProviderContent.includes('AnimatePresence'), 'Missing AnimatePresence in ConfirmProvider');
  assert.ok(confirmProviderContent.includes('motion.div'), 'Missing motion.div in ConfirmProvider');
  assert.ok(confirmProviderContent.includes('scale: 1'), 'Missing scale animation in confirmation dialog');
  assert.ok(confirmProviderContent.includes("e.key === 'Escape'"), 'Missing Escape key dismissal handler in ConfirmProvider');
  assert.ok(confirmProviderContent.includes('prev.resolve(false)'), 'Missing prior pending confirm promise resolution');
});

const updatePromptPath = path.join(ROOT_DIR, 'components', 'UpdatePrompt.tsx');
const updatePromptContent = fs.readFileSync(updatePromptPath, 'utf8');

test('UpdatePrompt features animated modal and animated progress bar', () => {
  assert.ok(updatePromptContent.includes('AnimatePresence'), 'Missing AnimatePresence in UpdatePrompt');
  assert.ok(updatePromptContent.includes('motion.div'), 'Missing motion.div in UpdatePrompt');
  assert.ok(updatePromptContent.includes('progress.percent'), 'Missing animated progress bar percentage binding');
});

// 5. Active Navigation & Layout Styling
console.log('\nGroup 5: Navigation & Frost Palette Integration');
const layoutPath = path.join(ROOT_DIR, 'components', 'Layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

test('Layout.tsx utilizes frost palette tokens for active indicators', () => {
  assert.ok(layoutContent.includes('bg-frost-500') || layoutContent.includes('text-frost-500') || layoutContent.includes('frost'), 'Layout missing frost tokens');
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
