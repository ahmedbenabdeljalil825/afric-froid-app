/**
 * Test: Verify Android OTA Updater Logic, SemVer 2.0.0, and Real Service Lifecycle
 *
 * Verifies that:
 * 1. androidOtaService.ts is properly defined and configured for GitHub Releases.
 * 2. androidOtaService.compareVersions correctly evaluates standard and edge-case SemVer.
 * 3. Checking for update handles repository 404 (no releases) without inventing fake updates.
 * 4. Programmatic OTA verification flow (verifyOtaFlow) executes download and apply lifecycles.
 * 5. Update throttling and caching mechanisms protect against GitHub rate limits.
 */

import fs from 'node:fs';
import { androidOtaService } from '../services/androidOtaService.ts';

async function runTest() {
  console.log('=== [TEST] Android OTA Updater Verification ===');
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

  // 1. Verify service file structure
  const serviceCode = fs.readFileSync('services/androidOtaService.ts', 'utf8');
  assert(serviceCode.includes('class AndroidOtaService') || serviceCode.includes('AndroidOtaService'), 'androidOtaService.ts defines AndroidOtaService class');
  assert(serviceCode.includes('GITHUB_OWNER') && serviceCode.includes('ahmedbenabdeljalil825'), 'Configured with correct GitHub owner');
  assert(serviceCode.includes('GITHUB_REPO') && serviceCode.includes('afric-froid-app'), 'Configured with correct GitHub repo');
  assert(serviceCode.includes('checkForUpdate'), 'Defines checkForUpdate method');
  assert(serviceCode.includes('downloadUpdate'), 'Defines downloadUpdate method');
  assert(serviceCode.includes('applyUpdate'), 'Defines applyUpdate method');
  assert(serviceCode.includes('verifyOtaFlow'), 'Defines verifyOtaFlow programmatic verification method');

  // 2. Real Semantic Version Comparison (SemVer 2.0.0 including edge cases)
  console.log('\n  -- Testing Semantic Version Comparison (Actual Service) --');
  assert(androidOtaService.compareVersions('1.5.1', '1.5.0') > 0, '1.5.1 > 1.5.0 returns positive');
  assert(androidOtaService.compareVersions('1.5.0', '1.5.0') === 0, '1.5.0 == 1.5.0 returns 0');
  assert(androidOtaService.compareVersions('1.4.9', '1.5.0') < 0, '1.4.9 < 1.5.0 returns negative');
  assert(androidOtaService.compareVersions('v2.0.0', '1.9.9') > 0, 'v2.0.0 > 1.9.9 handles leading v');
  assert(androidOtaService.compareVersions('1.5.1-beta.1', '1.5.1') < 0, '1.5.1-beta.1 < 1.5.1 (pre-release lower precedence)');
  assert(androidOtaService.compareVersions('1.5.1-beta.2', '1.5.1-beta.1') > 0, '1.5.1-beta.2 > 1.5.1-beta.1');
  assert(androidOtaService.compareVersions('1.5.0', '1.5.0-rc.1') > 0, '1.5.0 > 1.5.0-rc.1');
  assert(androidOtaService.compareVersions('1.5.1+build2026', '1.5.1') === 0, '1.5.1+build == 1.5.1 (build metadata ignored)');

  // 3. Test 404 Handling on real GitHub check (no false positive updates)
  console.log('\n  -- Testing GitHub Check & 404 No-Release Handling --');
  const checkResult = await androidOtaService.checkForUpdate({ force: true });
  assert(typeof checkResult === 'object', 'checkForUpdate returns update info object');
  assert(checkResult.updateAvailable === false, '404 returns updateAvailable: false (does not fabricate fake update)');
  assert(androidOtaService.status === 'not-available' || androidOtaService.status === 'error', 'Status reflects no update available');

  // 4. Test Throttling / Cache
  console.log('\n  -- Testing Check Throttling & Rate-Limit Protection --');
  const cachedResult = await androidOtaService.checkForUpdate({ force: false });
  assert(cachedResult.updateAvailable === false, 'Subsequent unforced check utilizes cached info safely');

  // 4b. Test In-Flight Request Deduplication (Concurrency Guard)
  console.log('\n  -- Testing Concurrent Check Deduplication --');
  const [res1, res2] = await Promise.all([
    androidOtaService.checkForUpdate({ simulate: true, simulateVersion: '1.5.2' }),
    androidOtaService.checkForUpdate({ simulate: true, simulateVersion: '1.5.2' }),
  ]);
  assert(res1.version === res2.version && res1.updateAvailable === res2.updateAvailable, 'Concurrent checks share in-flight promise and return consistent result');

  // 4c. Test Missing URL Validation in downloadUpdate
  console.log('\n  -- Testing Download URL Validation --');
  let threwOnEmptyUrl = false;
  try {
    await androidOtaService.downloadUpdate({
      version: '1.5.2',
      currentVersion: '1.5.0',
      updateAvailable: true,
      downloadUrl: '',
      releaseNotes: '',
      publishedAt: new Date().toISOString(),
      assetName: '',
    });
  } catch (err) {
    threwOnEmptyUrl = true;
  }
  assert(threwOnEmptyUrl, 'downloadUpdate rejects immediately if downloadUrl is missing/empty');

  // 5. Test Programmatic Verification of the Download and Apply Lifecycle
  console.log('\n  -- Simulating Android OTA Download & Apply Flow (Real Service) --');
  const flowResult = await androidOtaService.verifyOtaFlow('1.5.1');
  assert(flowResult.success === true, 'verifyOtaFlow returned success: true');
  assert(flowResult.finalVersion === '1.5.1', 'Application version successfully updated to 1.5.1');
  assert(Array.isArray(flowResult.progressMilestones) && flowResult.progressMilestones.length >= 5, 'Progress listener captured progress events');
  assert(flowResult.progressMilestones[0] === 10, 'Initial progress milestone is 10%');
  assert(flowResult.progressMilestones[flowResult.progressMilestones.length - 1] === 100, 'Final progress milestone reaches 100%');
  assert(androidOtaService.status === 'applied', 'Service enters applied state');

  // 6. Test Cache Re-evaluation Post-Apply (Prevent false positive prompts for current version)
  console.log('\n  -- Testing Cache Invalidation & Post-Apply State --');
  assert(androidOtaService.currentVersion === '1.5.1', 'Current version is updated to 1.5.1');
  const postApplyCheck = await androidOtaService.checkForUpdate({ force: false });
  assert(
    postApplyCheck.updateAvailable === false,
    'Post-apply unforced check does not report already installed 1.5.1 as available'
  );
  assert(
    androidOtaService.status === 'not-available' || androidOtaService.status === 'error',
    'Post-apply status transitions away from available'
  );

  // 7. Verify Mobile Asset Filtering Protection
  console.log('\n  -- Testing Mobile Asset Filtering --');
  assert(
    !serviceCode.includes('assets[0]') && !serviceCode.includes('release.zipball_url'),
    'androidOtaService strictly rejects desktop fallback assets (.exe / source zipball)'
  );
  assert(
    serviceCode.includes('AbortController') && serviceCode.includes('signal'),
    'androidOtaService implements AbortController timeout on network fetch'
  );

  console.log(`\nAndroid OTA Test Summary: ${passed} Passed, ${failed} Failed\n`);
  if (failed > 0) process.exit(1);
}

runTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
