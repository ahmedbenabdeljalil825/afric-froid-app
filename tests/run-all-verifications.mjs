/**
 * AfricFroid Master Verification Runner
 * Runs all test suites and generates an aggregated audit report.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const suites = [
  { name: 'UI Effects & Animations (R1)', file: 'tests/verify-ui-effects.mjs' },
  { name: 'Security & Code Quality Audit (R2)', file: 'tests/verify-security-audit.mjs' },
  { name: 'Electron OTA Auto-Update (R3)', file: 'tests/verify-electron-updater.mjs' },
  { name: 'Android OTA Auto-Update (R4)', file: 'tests/verify-android-ota.mjs' },
];

console.log('================================================================');
console.log('       AFRICFROID MASTER VERIFICATION TEST HARNESS              ');
console.log('================================================================\n');

let allPassed = true;
const summary = [];

for (const suite of suites) {
  console.log(`>>> RUNNING: ${suite.name} (${suite.file})`);
  const result = spawnSync('node', [suite.file], {
    cwd: path.resolve(process.cwd()),
    encoding: 'utf8',
    stdio: 'inherit'
  });

  if (result.status === 0) {
    summary.push({ name: suite.name, status: 'PASSED' });
    console.log(`>>> SUCCESS: ${suite.name}\n`);
  } else {
    allPassed = false;
    summary.push({ name: suite.name, status: 'FAILED' });
    console.error(`>>> FAILURE in ${suite.name} (exit code ${result.status})\n`);
  }
}

console.log('================================================================');
console.log('                 VERIFICATION SUMMARY RESULTS                   ');
console.log('================================================================');
for (const item of summary) {
  console.log(`[${item.status}] ${item.name}`);
}

if (!allPassed) {
  console.error('\n❌ One or more verification suites failed.');
  process.exit(1);
} else {
  console.log('\n✅ All verification suites passed successfully with 100% checks!');
  process.exit(0);
}
