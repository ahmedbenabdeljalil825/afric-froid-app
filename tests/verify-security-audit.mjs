/**
 * AfricFroid IIOT - Security & Code Quality Audit Verification
 * 
 * Verifies:
 * 1. npm audit results (0 critical, 0 high vulnerabilities)
 * 2. Absence of plaintext customer password exposure in AdminDashboard and Settings
 * 3. Repository hygiene: no legacy patch scripts in root directory
 * 4. .gitignore covers build artifacts (dist-electron, release, etc.)
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { execSync } from 'node:child_process';

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

console.log('=== AfricFroid Security & Code Quality Audit Verification ===\n');

// 1. npm audit check
console.log('Group 1: Dependency Vulnerabilities (npm audit)');
test('npm audit reports 0 high and 0 critical vulnerabilities', () => {
  let auditJson;
  try {
    const raw = execSync('npm audit --json', { cwd: ROOT_DIR, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    auditJson = JSON.parse(raw);
  } catch (err) {
    // npm audit exits with non-zero if any vulnerability exists
    if (err.stdout) {
      auditJson = JSON.parse(err.stdout);
    } else {
      throw new Error(`Failed to run npm audit: ${err.message}`);
    }
  }

  const vulnerabilities = auditJson.metadata?.vulnerabilities || {};
  const critical = vulnerabilities.critical || 0;
  const high = vulnerabilities.high || 0;

  console.log(`    Audited vulnerabilities summary: Critical=${critical}, High=${high}, Moderate=${vulnerabilities.moderate || 0}, Low=${vulnerabilities.low || 0}, Info=${vulnerabilities.info || 0}`);
  assert.strictEqual(critical, 0, `Expected 0 critical vulnerabilities, found ${critical}`);
  assert.strictEqual(high, 0, `Expected 0 high vulnerabilities, found ${high}`);
});

// 2. Customer credential protection
console.log('\nGroup 2: Credential Exposure & Plaintext Password Checks');
const adminDashboardPath = path.join(ROOT_DIR, 'pages', 'AdminDashboard.tsx');
const adminDashboardContent = fs.readFileSync(adminDashboardPath, 'utf8');

test('AdminDashboard does not select plaintext password from profiles table', () => {
  // Check the select statement
  const profileSelectMatches = adminDashboardContent.match(/\.from\(['"]profiles['"]\)\s*\.select\(['"]([^'"]+)['"]\)/);
  if (profileSelectMatches) {
    const selectedFields = profileSelectMatches[1];
    assert.ok(!selectedFields.split(',').map(s => s.trim()).includes('password'), 'profiles.select() still explicitly selects password!');
  }
});

test('AdminDashboard does not render raw customer passwords in the user table', () => {
  assert.ok(!adminDashboardContent.includes('user.password'), 'Found user.password rendered in AdminDashboard');
  assert.ok(adminDashboardContent.includes('••••••••'), 'Expected masked password indicator badge');
});

const settingsPath = path.join(ROOT_DIR, 'pages', 'Settings.tsx');
const settingsContent = fs.readFileSync(settingsPath, 'utf8');

test('Settings page uses official supabase.auth.updateUser and does not sync plaintext password to profiles row', () => {
  assert.ok(settingsContent.includes("supabase.auth.updateUser"), 'Expected supabase.auth.updateUser for secure password change');
  assert.ok(!settingsContent.match(/\.from\(['"]profiles['"]\)\s*\.update\([^)]*password/), 'Found plaintext password sync to profiles table in Settings.tsx');
});

// 3. Repository hygiene (no abandoned root patch scripts)
console.log('\nGroup 3: Repository Hygiene (Orphan Scripts Elimination)');
test('No legacy one-off patch scripts remain in root directory', () => {
  const rootFiles = fs.readdirSync(ROOT_DIR);
  const bannedLegacyScripts = [
    'addDnd.cjs',
    'changeLabels.cjs',
    'fixGradient.cjs',
    'fixNav.cjs',
    'fix_admin_designer.cjs',
    'update_widget.py',
    'remove_tailwind_cdn.cjs',
    'fix_active_tab.cjs'
  ];

  for (const script of bannedLegacyScripts) {
    assert.ok(!rootFiles.includes(script), `Legacy patch script ${script} should have been removed from root!`);
  }
});

// 4. Gitignore protection
console.log('\nGroup 4: .gitignore Protection');
const gitignorePath = path.join(ROOT_DIR, '.gitignore');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

test('.gitignore includes dist-electron and release directories', () => {
  assert.ok(gitignoreContent.includes('dist-electron'), '.gitignore missing dist-electron');
  assert.ok(gitignoreContent.includes('release'), '.gitignore missing release');
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
