# Original User Request

## 2026-09-21T19:21:03Z

# Teamwork Project Prompt

> Status: Launched

This is a single self-contained set of fixes and implementations; keep it small and focused.
Run a full-scale security, code quality, and functionality audit on the AfricFroid IIOT application, fix missing UI effects in the dashboard, and implement OTA (Over-The-Air) auto-update mechanisms via GitHub for both the Electron `.exe` and the Capacitor Android app.

Working directory: `c:\Users\a.baj\Desktop\afric-froid-app`
Integrity mode: development

## Requirements

### R1. UI Effects Restoration
Identify and restore the missing UI effects/animations in the React dashboard that were lost during recent changes. Ensure Framer Motion or existing CSS animations are properly integrated.

### R2. Code Quality & Security Audit
Conduct a deep audit of the codebase following Karpathy guidelines, Claude Code Review, and Vibe-Coding Security Auditor rules. Safely remove orphaned code/dependencies without breaking existing functionality.

### R3. Electron OTA Updates
Set up `electron-updater` to pull releases from the existing GitHub repository. Add a UI prompt in the dashboard that shows download progress and automatically installs the update for the `.exe`.

### R4. Android OTA Updates
Set up a Capacitor OTA update mechanism pointing to GitHub releases (or a suitable Capacitor auto-update service like Capgo). Add a UI prompt to notify the user and install the update.

## Acceptance Criteria

### Verification
- [ ] An agent-as-judge runs a simulated update check locally to verify the `electron-updater` logic triggers the download progress events correctly.
- [ ] The Android OTA updater logic is verified programmatically or via agent-as-judge to ensure the update payload can be downloaded and applied.
- [ ] The UI effects are visually verified or verified via DOM assertions to ensure animation classes/props are restored.
- [ ] The codebase passes a full `vibe-coding-security-auditor` check with no critical/high vulnerabilities introduced or remaining.
