# AfricFroid Comprehensive Architectural, Code-Quality & Security Audit Report

**Target System**: AfricFroid Industrial Refrigeration Monitoring & Control Platform  
**Target Repository**: `C:/Users/a.baj/Desktop/afric-froid-app`  
**Audit Date**: September 4, 2026  
**Auditor**: Teamwork Forensic Engineering & Code-Quality Audit Team  
**Governance Framework**: Karpathy Guidelines (`karpathy-guidelines`), Open Skills Ecosystem (`find-skills`)  
**Audit Mode**: Read-Only Non-Destructive Static & Architectural Analysis  

---

## 1. Executive Summary & Architectural Reality Check

### 1.1 The "Next.js" Misconception vs. Empirical Reality
The initial project specification describes AfricFroid as a *"Vercel Next.js dashboard application"*. 

**Empirical Finding**: **AfricFroid is NOT a Next.js application.**
A forensic scan across the repository confirmed that:
- Zero Next.js configuration files exist (`next.config.js`, `next.config.mjs`, `next.config.ts`).
- Zero Next.js App Router or Pages Router directories exist (`app/`, `pages/api/`, `src/app/`).
- Zero Next.js server actions, API route handlers, or server-side middleware exist.
- `package.json` (lines 6–8, 23–27) explicitly defines:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.13.0",
    "recharts": "^3.7.0"
  },
  "devDependencies": {
    "vite": "^6.2.0"
  }
  ```
- `vercel.json` (line 3) explicitly instructs Vercel:
  ```json
  {
    "name": "afric-froid-dashboard",
    "framework": "vite"
  }
  ```
- `App.tsx` (lines 2, 215) mounts `<HashRouter>`, routing entirely within the client's browser hash fragment (`#/dashboard`, `#/controls`, `#/admin`).
- `capacitor.config.ts` wraps this Vite SPA for Android deployment via Capacitor 8.3.0.

**Architectural Reality**: AfricFroid is a **pure client-side Single Page Application (SPA)** built with **Vite 6.2.0, React 19.2.4, React Router v7 (`HashRouter`), and Tailwind CSS**, communicating directly from the browser to:
1. **Supabase (BaaS)** via `@supabase/supabase-js` for PostgreSQL data, authentication, and PostgREST API queries.
2. **Industrial MQTT Broker** via WebSockets (`mqtt.js`) for bidirectional telemetry and control.
3. **External Ingestion Daemon**: A standalone Node.js process (`telemetry-bridge/index.js`) responsible for scheduled server-side polling and persisting MQTT telemetry to Supabase.

### 1.2 System Health & Risk Assessment Scorecard

| Dimension | Grade | Severity | Primary Drivers |
| :--- | :---: | :---: | :--- |
| **Security & Credentials** | **F** | **CRITICAL** | Production database administrator credentials hardcoded in `telemetry-bridge/index.js:215`; live MQTT broker credentials committed in `tmp_test_credentials.js:3–5`; plaintext customer passwords stored in database column `public.profiles.password` and loaded into admin frontend memory (`AdminDashboard.tsx:44`). |
| **State Management & Memory** | **D-** | **CRITICAL** | Monotonic unbounded client memory leak in `services/mqttService.ts:439` (telemetry pushed to buffer, flush disabled); client disconnects due to non-compliant `keepalive: 0`; read-modify-write race conditions stomping concurrent PLC telemetry. |
| **Component Architecture** | **C-** | **HIGH** | Monolithic 1,284-line `WidgetRenderer.tsx` (413 kB bundle chunk); full-page DOM destruction and remounting on route navigation caused by `key={location.pathname}` on `<Routes>` in `App.tsx:57`; duplicate polling timers in `Layout.tsx`. |
| **Data Integrity & Reporting** | **D** | **HIGH** | Unpaginated PostgREST query in `services/telemetryExport.ts` truncates 7-day CSV telemetry exports to 1,000 rows (~2.7 hours); silent telemetry loss for all widgets configured with `mqtt_action = 'SYNC'` in `telemetry-bridge/index.js:51`. |
| **Repository Hygiene & Bloat** | **F** | **HIGH** | 2.32 GB repository bloat in `New folder (3)/` containing a 964.8 MB log file; 4 exact duplicate root source files; 18 abandoned CommonJS regex patch scripts; dual-engine Tailwind architecture (CDN runtime v3 + PostCSS v4). |
| **Overall Production Readiness** | **D+** | **HIGH RISK** | High UI aesthetic quality, but compromised by severe security vulnerabilities, memory leaks, and uncontrolled technical debt. |

---

## 2. Layer-by-Layer Detailed Audit

### Layer 1: Frontend Architecture & React Logic

#### 1.1 Preview Mode Logic Bug & Unreachable Constant
- **File & Line**: `components/WidgetRenderer.tsx:1200`
- **Verbatim Code**:
  ```tsx
  const displayValue = isPreview ? (ReadingWidgetType.GAUGE ? 67 : 24.5) : currentData;
  ```
- **Flaw Analysis**:
  `ReadingWidgetType.GAUGE` is an enum string constant (`'GAUGE'`). In JavaScript/TypeScript, any non-empty string evaluates to `true` in a boolean context. Thus, `(ReadingWidgetType.GAUGE ? 67 : 24.5)` strictly and unconditionally evaluates to `67`. 
- **Impact**: The ternary branch `24.5` is permanently dead code. In `AdminUserDesigner.tsx`, every single preview widget (thermometers, pressure gauges, digital readouts, tank levels) renders a static value of `67`, failing to reflect realistic baseline values for temperature or pressure.
- **Surgical Remedy**:
  ```tsx
  const displayValue = isPreview 
    ? (widget.widgetType === ReadingWidgetType.GAUGE ? 67 : 24.5) 
    : currentData;
  ```

#### 1.2 Broken Line Chart Preview in Admin Designer
- **File & Lines**: `components/WidgetRenderer.tsx:1201, 1209–1217`
- **Verbatim Code**:
  ```tsx
  const displayHistory = isPreview ? generateDemoTimeSeries() : (historyData || []);
  ...
  case ReadingWidgetType.LINE_CHART:
      return (
          <LineChartWidget 
              widget={widget} 
              colorIndex={colorIndex} 
              historyData={historyData} // <-- BUG: Passes raw historyData instead of displayHistory
              timeRange={timeRange}
              onRangeChange={onRangeChange}
              language={language}
              showExportButton={!isPreview}
          />
      );
  ```
- **Flaw Analysis**: Line 1201 specifically constructs `displayHistory` containing mock time-series data for preview rendering. However, at line 1212, `LineChartWidget` is passed `historyData={historyData}`. In `AdminUserDesigner.tsx`, the `historyData` prop is `undefined`.
- **Impact**: In the Admin User Designer, line chart widgets render blank with an *"Awaiting data..."* placeholder, preventing administrators from previewing chart styling or color schemes.
- **Surgical Remedy**: Pass `historyData={displayHistory}` to `<LineChartWidget />`.

#### 1.3 Text Log Preview Type Incompatibility
- **File & Lines**: `components/WidgetRenderer.tsx:88–94, 634–637, 1234`
- **Flaw Analysis**: `TextLogWidget` receives `liveLogs={displayHistory}`. However, `generateDemoTimeSeries()` produces an array of objects shaped as `{ timestamp: number, value: number }`, whereas `TextLogWidget` expects `{ time: string, msg: string }`.
- **Impact**: Text log widgets in designer preview render blank rows with `[undefined]`.

#### 1.4 Operator Input Overwritten by Inbound Telemetry Race Condition
- **File & Lines**: `components/WidgetRenderer.tsx:880–882, 931–935, 984–988, 1028–1032, 1092–1096, 1136–1140`
- **Affected Widgets**: `SliderWidget`, `TextInputWidget`, `NumberInputWidget`, `ComboBoxWidget`, `RadioButtonsWidget`.
- **Verbatim Code (`SliderWidget:931–935`)**:
  ```tsx
  useEffect(() => {
      if (currentValue !== undefined && !isNaN(Number(currentValue))) {
          setDraftVal(Number(currentValue));
      }
  }, [currentValue]);
  ```
- **Flaw Analysis**: The UI implements a two-step adjustment pattern (operator modifies draft value → clicks "Send"). However, the `useEffect` hook unconditionally syncs `currentValue` into `draftVal` whenever an inbound MQTT message arrives. In an industrial setup where PLCs publish telemetry at 1–5 Hz, an operator dragging a setpoint slider or typing a new temperature threshold will have their active input wiped out mid-keystroke or mid-drag.
- **Surgical Remedy**: Track active focus/interaction state (`isInteracting` or `isFocused`) and inhibit `draftVal` overwrites while the operator is actively editing.

#### 1.5 Route Unmount Churn & Layout Thrashing
- **File & Lines**: `App.tsx:56–58`
- **Verbatim Code**:
  ```tsx
  <AnimatePresence mode="wait">
    <Routes location={location} key={location.pathname}>
      <Route element={<Layout user={currentUser} onLogout={handleLogout} />}>
  ```
- **Flaw Analysis**: Binding `key={location.pathname}` directly to `<Routes>` causes React to destroy and reconstruct the entire route tree on every URL change.
- **Impact**:
  - The shared `<Layout>` component is completely unmounted and remounted.
  - The navigation sidebar DOM is torn down and rebuilt.
  - `<BrokerStatus>` is re-instantiated, resetting connection status badges and restarting polling timers.
  - Creates noticeable UI flickering and layout jank.
- **Surgical Remedy**: Remove `key={location.pathname}` from `<Routes>`. Place animation keys exclusively on individual page containers inside the `<Outlet />`.

#### 1.6 Duplicate Component Instances & Interval Duplication
- **File & Lines**: `components/Layout.tsx:141, 154`
- **Verbatim Code**:
  ```tsx
  {/* Mobile Header */}
  <header className="h-16 lg:hidden ...">
    <BrokerStatus user={user} />
  ...
  {/* Desktop Header */}
  <div className="hidden lg:flex justify-end ...">
    <BrokerStatus user={user} />
  ```
- **Flaw Analysis**: Because both the mobile `<header>` and desktop `<div>` exist concurrently in the DOM (toggled only via Tailwind CSS `hidden lg:flex` classes), React mounts two independent instances of `<BrokerStatus>`.
- **Impact**: In `BrokerStatus.tsx:36–48`, each instance starts a 5-second polling timer (`setInterval`) and attaches a listener to `mqttService.onStatusChange`. Two identical intervals run continuously in parallel, generating duplicate function executions and double state updates.

#### 1.7 Silent Telemetry CSV Export Truncation
- **File & Lines**: `services/telemetryExport.ts:12–23`
- **Verbatim Code**:
  ```typescript
  export async function fetchAllTelemetryForWidget(widgetId: string): Promise<TelemetryExportRow[]> {
    const start = new Date(Date.now() - TELEMETRY_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('telemetry_readings')
      .select('created_at, value, variable_name, unit')
      .eq('widget_id', widgetId)
      .gte('created_at', start)
      .order('created_at', { ascending: true });
  ```
- **Flaw Analysis**: Supabase PostgREST endpoints enforce a default server-side maximum query limit of **1,000 rows**. For an industrial widget logging every 10 seconds, 7 days of telemetry comprises ~60,480 rows. Because this function does not implement chunked range pagination (`.range(start, end)`), the query returns only the first 1,000 rows.
- **Impact**: The exported CSV contains only the first ~2.7 hours of the requested 7-day period. 6.8 days of operational telemetry are silently dropped without error or user warning.

---

### Layer 2: API, Backend & Security Audit

#### 2.1 Hardcoded Production Admin Credentials in Tracked Source Code
- **File & Line**: `telemetry-bridge/index.js:215`
- **Severity**: **CRITICAL (Zero-Day Vulnerability)**
- **Verbatim Code**:
  ```javascript
  async function main() {
    console.log('[bridge] Authenticating with Supabase...');
    const { error } = await supabase.auth.signInWithPassword({ 
      email: 'admin@africfroid.app', 
      password: 'ahmed123' 
    });
  ```
- **Flaw Analysis**: Production administrative account credentials (`admin@africfroid.app` / `ahmed123`) are committed in cleartext inside a git-tracked file.
- **Impact**: Any individual with access to the source code or git history possesses unconditional administrative control over the Supabase tenant, database tables, user accounts, and industrial configurations.
- **Remediation**:
  1. Immediately rotate the password for `admin@africfroid.app` in Supabase Auth.
  2. Migrate `telemetry-bridge` authentication to Supabase Service Role Key stored exclusively in environment variables (`SUPABASE_SERVICE_ROLE_KEY`), or a dedicated non-admin ingestion service account.

#### 2.2 Production MQTT Broker Credentials Committed to Repository
- **File & Lines**: `tmp_test_credentials.js:3–5`
- **Severity**: **CRITICAL (Security / Infrastructure Exposure)**
- **Verbatim Code**:
  ```javascript
  const BROKER_URL = 'ws://mqts.frigoindus.net:9001/mqtt';
  const USERNAME = 'affimqtt1';
  const PASSWORD = 'Lmx54!s@';
  ```
- **Flaw Analysis**: Live operational credentials for the production MQTT broker `mqts.frigoindus.net` are committed in plaintext to a tracked file in git.
- **Impact**: External actors can connect to the industrial broker, eavesdrop on real-time refrigeration telemetry, and inject malicious control payloads into running equipment.
- **Remediation**:
  1. Rotate the MQTT user password on `mqts.frigoindus.net`.
  2. Remove `tmp_test_credentials.js` from git tracking.

#### 2.3 Plaintext Customer Passwords Stored in Database & Client State
- **Files & Lines**:
  - `supabase_schema.sql:11`: `password text,` column inside `public.profiles`.
  - `pages/AdminDashboard.tsx:44`: `.select('id, company_id, full_name, role, is_active, config, mqtt_config, language, password')`
  - `pages/AdminDashboard.tsx:257–260`:
    ```typescript
    if (trimmedNewPassword) {
      profilePatch.password = trimmedNewPassword;
    }
    ```
  - `pages/Settings.tsx:46–50`:
    ```typescript
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ password: newPassword })
      .eq('id', user.id);
    ```
- **Severity**: **HIGH (Security Architecture Violation)**
- **Flaw Analysis**: Rather than relying strictly on Supabase Auth's hashed credentials (`auth.users`), the schema maintains a plaintext `password` column on `public.profiles`. Whenever an administrator lists users, plaintext passwords are sent across the wire and stored in client browser state.
- **Impact**: Customer passwords are completely exposed to anyone with database read access or browser DevTools access, violating GDPR and standard security baselines.
- **Remediation**: Drop the `password` column from `public.profiles`. Manage user credentials strictly through Supabase Auth admin APIs and Edge Functions.

#### 2.4 Incomplete User Deletion (Auth Account Orphanage)
- **File & Line**: `pages/AdminDashboard.tsx:327`
- **Verbatim Code**:
  ```typescript
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  ```
- **Flaw Analysis**: The client-side Supabase client (operating with the public `anon` key) lacks permissions to access or modify the internal `auth.users` table. Consequently, clicking "Delete" removes the user's profile row from `public.profiles`, but leaves the authentication account intact in `auth.users`.
- **Impact**: Deleted operators can still authenticate, obtain valid JWTs, and make authenticated API calls against any endpoint not gated by a profile join.
- **Remediation**: Implement user deletion through a Supabase Edge Function (`delete-user`) that invokes `supabase.auth.admin.deleteUser(userId)` using the service role key.

#### 2.5 Unversioned Missing Edge Functions
- **File & Lines**: `pages/AdminDashboard.tsx:238, 292`
- **Verbatim Code**:
  ```typescript
  await supabase.functions.invoke('update-user', { body: ... });
  await supabase.functions.invoke('create-user', { body: ... });
  ```
- **Flaw Analysis**: `AdminDashboard` invokes two Supabase Edge Functions: `create-user` and `update-user`. However, the repository contains **no `supabase/functions/` directory**.
- **Impact**: The backend user creation and modification logic is completely unversioned, cannot be inspected, and cannot be deployed in CI/CD pipelines from this repository.

#### 2.6 Silent Telemetry Loss for 'SYNC' Widgets in Ingestion Bridge
- **File & Lines**: `telemetry-bridge/index.js:48–53`
- **Verbatim Code**:
  ```javascript
  const { data, error } = await supabase
    .from('widgets')
    .select('id, mqtt_topic, variable_name, history_interval, config, mqtt_action, category, is_active')
    .eq('is_active', true)
    .eq('mqtt_action', 'SUBSCRIBE')
    .in('category', ['READING', 'CONTROLLING']);
  ```
- **Flaw Analysis**: Migration `supabase/migrations/20260903090310_add_sync_to_mqtt_action.sql` added `'SYNC'` to `widgets.mqtt_action`. The bridge queries exclusively for `mqtt_action = 'SUBSCRIBE'`.
- **Impact**: Any widget configured with `mqtt_action = 'SYNC'` is omitted by the bridge daemon. Combined with the disabled browser telemetry buffer, telemetry for `'SYNC'` widgets is never persisted.

---

### Layer 3: MQTT Protocol & State Machine Logic

#### 3.1 Unbounded Memory Leak in MQTT Service
- **File & Lines**: `services/mqttService.ts:17, 403, 439, 455, 510`
- **Severity**: **CRITICAL (Reliability / System Stability)**
- **Verbatim Code**:
  ```typescript
  // Line 17
  private telemetryBuffer: Array<{ widget_id: string; variable_name: string; value: number; unit?: string; created_at: string }> = [];
  ...
  // Line 403 (handleMessage)
  this.persistTelemetry(topic, payload);
  ...
  // Line 439 (persistTelemetry)
  this.telemetryBuffer.push({
      widget_id: widget.id,
      variable_name: key,
      value: value,
      unit: (widget.config as any)?.unit || undefined,
      created_at: now
  });
  ...
  // Line 455
  private async flushTelemetryBuffer() { /* Disabled: Handled by PC bridge */ }
  ```
- **Flaw Analysis**: When telemetry ingestion was moved to the standalone Node.js bridge, the developer commented out the body of `flushTelemetryBuffer()`. However, `persistTelemetry()` remains active and continues appending records to `this.telemetryBuffer` on every incoming message. Because `flushTelemetryBuffer()` is an empty stub, the array is never sliced, cleared, or garbage collected.
- **Impact**: Memory consumption increases monotonically. In a 24/7 industrial kiosk, tablet, or monitoring screen receiving multiple messages per second, browser memory grows unbounded until the tab crashes with an out-of-memory error.
- **Additionally**: A 10-second timer (`this.startFlushTimer()`) and three window lifecycle event listeners (`visibilitychange`, `pagehide`, `beforeunload`) continue firing pointlessly to invoke this disabled function.
- **Remediation**: Remove `telemetryBuffer`, `persistTelemetry()`, `flushTelemetryBuffer()`, and their flush timers entirely from `mqttService.ts`.

#### 3.2 Non-Compliant Protocol Keepalive (`keepalive: 0`)
- **File & Lines**: `services/mqttService.ts:26, 205`
- **Verbatim Code**:
  ```typescript
  /** Background tabs throttle timers — MQTT keepalive pings stop → false “offline”. 0 = no client pings (broker must allow). */
  private readonly MQTT_KEEPALIVE_SEC = 0;
  ...
  const options: mqtt.IClientOptions = {
      keepalive: this.MQTT_KEEPALIVE_SEC,
  ```
- **Flaw Analysis**: The author set `keepalive: 0` to prevent background browser tab throttling from triggering keepalive timeouts. Under MQTT 3.1.1/5.0 specifications, `keepalive: 0` disables client heartbeat packets (`PINGREQ`).
- **Impact**: Commercial and production MQTT brokers (e.g. Mosquitto, EMQX, HiveMQ) or reverse proxies (e.g. NGINX, HAProxy, AWS ALB) enforcing inactivity timeouts will drop the WebSocket connection without a clean `DISCONNECT` handshake. The client drops into silent disconnect states.
- **Remediation**: Set `keepalive: 30` (or `60`). Handle background tab throttling via Web Workers or visibility-change re-pings instead of disabling protocol heartbeats.

#### 3.3 Concurrency Race Condition in Topic Publishing (Lost Updates)
- **File & Lines**: `services/mqttService.ts:470–492`
- **Verbatim Code**:
  ```typescript
  publishVariableUpdate(topic: string, variableName: string, newValue: any, qos: 0 | 1 | 2 = 0, retain: boolean = false) {
      if (!this.client || !this.client.connected) return;

      // 1. Get current state (Read)
      const currentState = this.topicState[topic] || {};

      // 2. Modify (Deep clone to avoid side effects)
      const newState = { ...currentState, [variableName]: newValue };

      // 3. Write
      const payload = JSON.stringify(newState);
      this.client.publish(topic, payload, { qos, retain }, ...);
  }
  ```
- **Flaw Analysis**:
  1. **Monolithic Payload Assumption**: The design assumes that all variables on a topic must be broadcast as a single combined JSON object.
  2. **Read-Modify-Write Concurrency**: When an operator adjusts a control, `publishVariableUpdate` reads the local cache `this.topicState[topic]`, mutates a single variable, and republishes the entire object. If the PLC or another operator updated other variables on that topic while this tab was backgrounded or delayed, this client will overwrite and revert those concurrent updates to its stale cached values.
  3. **Shallow Copy Defect**: The comment asserts `// Deep clone to avoid side effects`, but `{ ...currentState }` is a shallow copy. If any variable is an object or array, nested references are directly mutated.

#### 3.4 Asynchronous `useEffect` Subscription Leak
- **Files & Lines**: `pages/ClientDashboard.tsx:151–222` and `pages/ClientControls.tsx:53–108`
- **Verbatim Code**:
  ```typescript
  useEffect(() => {
    let activeSubscriptions: (() => void)[] = [];

    const fetchAndSubscribe = async () => {
      const { data, error } = await supabase.from('widgets').select(...);
      ...
      uniqueTopicsMap.forEach((qos, topic) => {
        const unsub = mqttService.subscribe((data: any) => {
          setLiveData(prev => ({ ...prev, [topic]: { ...(prev[topic] || {}), ...data } }));
        }, topic, qos as 0|1|2);
        activeSubscriptions.push(unsub);
      });
    };

    fetchAndSubscribe();

    return () => {
      activeSubscriptions.forEach(unsub => unsub());
    };
  }, [user.id, user.mqttConfig?.topics.telemetry]);
  ```
- **Flaw Analysis**: The cleanup function is returned synchronously before `fetchAndSubscribe()` resolves. If the user navigates away from the page while the Supabase query is awaiting network response:
  1. The cleanup function runs immediately on `activeSubscriptions = []`.
  2. When `await supabase` resolves, `mqttService.subscribe()` executes and pushes unsubscription functions into the abandoned closure.
  3. The subscription is never unsubscribed and remains registered in `mqttService.topicCallbacks`.
  4. Incoming MQTT messages invoke `setLiveData` on unmounted component instances, leaking memory and producing React warnings.
- **Remediation**: Use a mounted cancellation flag (`let isMounted = true; return () => { isMounted = false; ... }`) and guard the subscription registration.

#### 3.5 Missing Broker-Level Topic Unsubscribe
- **File & Lines**: `services/mqttService.ts:377–385`
- **Verbatim Code**:
  ```typescript
  return () => {
      const callbacks = this.topicCallbacks.get(targetTopic);
      if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
              this.topicCallbacks.delete(targetTopic);
          }
      }
  };
  ```
- **Flaw Analysis**: When the last UI component unsubscribes from `targetTopic`, the service deletes the entry from `this.topicCallbacks`, but **never calls `this.client.unsubscribe(targetTopic)`**.
- **Impact**: The MQTT WebSocket client remains subscribed to the broker topic. The broker continues pushing traffic across the network, and the client continues parsing incoming JSON payloads that no UI component is listening to.

#### 3.6 Synchronous Blocking Storage on Every Inbound Message
- **File & Lines**: `services/mqttService.ts:73–83, 400`
- **Verbatim Code**:
  ```typescript
  localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      state: this.topicState,
      timestamps: this.topicTimestamps
  }));
  ```
- **Flaw Analysis**: Synchronously serializing large state objects and writing to `localStorage` on every incoming message (`handleMessage:400`) blocks the browser's single-threaded event loop. Under rapid telemetry streams (5–10 Hz), this causes dropped frames, UI lag, and risks throwing `QuotaExceededError`.

---

## 3. Orphaned Code, Bloatware & Dead Modules

### 3.1 Root Duplicate Files (Exact Copies)
Four critical source files exist as exact duplicates at the repository root and inside subdirectories. In all four cases, active components import the subdirectory versions, leaving the root files completely orphaned:

| Root Orphan File | Canonical Subdirectory File | Size | Verification Proof |
| :--- | :--- | :---: | :--- |
| `ConfirmProvider.tsx` | `components/ConfirmProvider.tsx` | 3,735 B | `App.tsx:27`, `AdminDashboard.tsx:8`, `AdminUserDesigner.tsx:10` import from `./components/ConfirmProvider`. Root file has 0 imports. |
| `ToastProvider.tsx` | `components/ToastProvider.tsx` | 3,245 B | `App.tsx:26`, `AdminDashboard.tsx:7`, `AdminUserDesigner.tsx:9` import from `./components/ToastProvider`. Root file has 0 imports. |
| `chartSeries.ts` | `utils/chartSeries.ts` | 1,512 B | `ClientControls.tsx:7`, `ClientDashboard.tsx:7` import from `../utils/chartSeries`. Root file has 0 imports. |
| `apply-migrations.mjs` | `scripts/apply-migrations.mjs` | 2,222 B | `package.json:10` executes `"node scripts/apply-migrations.mjs"`. Root file is never executed. |

### 3.2 Completely Orphaned Application Modules
The following active TypeScript modules are compiled in the project but have **zero incoming references** from any component, page, or service:

1. **`components/DashboardWidgets.tsx` (172 lines, 6.6 KB)**:
   - Defines and exports `StatCard` and `LiveChart`.
   - `git grep "StatCard"` and `git grep "LiveChart"` reveal zero usages across the entire codebase. The application exclusively renders widgets via `WidgetRenderer.tsx`.
2. **`utils/audio.ts` (76 lines, 2.5 KB)**:
   - Implements Web Audio API sirens (`initAudio`, `playSiren`) with dual oscillators, frequency modulation LFOs, and gain envelopes.
   - Never imported or called anywhere. Abandoned prototype for an audio alarm system.
3. **`utils/jsonPathExtractor.ts` (89 lines, 2.7 KB)**:
   - Implements recursive JSON path extraction (`extractValue`, `isValidJsonPath`, `setValue`).
   - Never imported anywhere. Widgets read flat keys directly via `liveData[topic][variableName]`.

### 3.3 18 Ad-Hoc Root Patch Scripts & 5 Abandoned Test Scripts
The root directory is littered with 23 throwaway CommonJS and test scripts committed during previous development sprints:

- **18 Regex Patching Scripts**: `addDnd.cjs`, `changeLabels.cjs`, `fixGradient.cjs`, `fixQosUndefined.cjs`, `fixStyles.cjs`, `fixTopicQos.cjs`, `removeDuplicate.cjs`, `rewrite.cjs` (461 lines), `test.cjs`, `updateAdminQos.cjs`, `updateClientDashboard.cjs`, `updateClientQos.cjs`, `updateMqtt.cjs`, `updateMqttQosMap.cjs`, `updateToggle.cjs`, `updateTooltip.cjs`, `updateWidgetRendererPublish.cjs`, `updateWidgetRendererQoS.cjs`.
- **5 Abandoned Test Scripts**: `tmp_test_credentials.js` (contains plaintext credentials), `test-mqtt-connection.js` (public HiveMQ test), `browser-mqtt-test.js` (DevTools snippet), `test-tailwind.html` (20-line test), `get_broker.js` (Node CLI query).

### 3.4 2.32 GB Repository Bloat in `New folder (3)/`
- The root directory contains `New folder (3)/` measuring **2.32 GB across 31,200 files**.
- It contains nested legacy git clones (`afric-froid-app` and `afric-froid-app LEGACY`) with full `.git` trees and `node_modules`.
- Contains `New folder (3)/afric-froid-app/simulator.log` measuring **964.8 MB** committed to disk.
- Causes continuous git status noise:
  ```text
  modified:   New folder (3)/afric-froid-app (modified content, untracked content)
  modified:   New folder (3)/afric-froid-app LEGACY (modified content, untracked content)
  ```

### 3.5 The Dual-Engine Tailwind Architecture Risk
- **File Observations**:
  - `package.json:19, 36`: Installs `@tailwindcss/postcss: ^4.1.18` and `tailwindcss: ^4.1.18`.
  - `index.css:1`: Imports `@import "tailwindcss";`, compiling into a 109 kB static stylesheet (`dist/assets/index-DmRJt7oc.css`).
  - `index.html:31–53`: Concurrently loads:
    ```html
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = { theme: { extend: { colors: { frost: { ... } } } } }
    </script>
    ```
- **Hazard Analysis**:
  1. **Offline & Kiosk Breakdown**: In cold-storage plant networks or remote facilities without internet access (or in Capacitor Android builds), `cdn.tailwindcss.com` fails to load, causing unstyled content and broken layouts.
  2. **Performance & Compilation Clash**: The browser runs the runtime Tailwind v3 JIT compiler simultaneously with the precompiled Tailwind v4 stylesheet, resulting in FOUC (Flash of Unstyled Content), redundant DOM style injections, and memory overhead.
  3. **Official Warning**: Tailwind documentation explicitly prohibits `cdn.tailwindcss.com` in production environments.
- **Surgical Remedy**: Remove the CDN `<script>` tag and inline config from `index.html`. Define the `frost` palette directly in `index.css` using Tailwind v4's `@theme` directive.

### 3.6 Contradictory & Dead Logic in `ClientControls.tsx`
- **File & Lines**: `pages/ClientControls.tsx:72, 141–167, 224–228`
- **Flaw Analysis**:
  - Line 72 filters widgets exclusively to `WidgetCategory.CONTROLLING` (buttons, toggles, sliders).
  - Lines 141–167 set up a 45-second polling interval and execute `fetchWidgetHistory` for any widget matching `w.widgetType === ReadingWidgetType.LINE_CHART`.
  - In the widget type model, `LINE_CHART` is strictly a `READING` widget. A controlling widget can never be a line chart.
  - The loop condition `if (w.widgetType !== ReadingWidgetType.LINE_CHART) continue;` is always true.
- **Impact**: ~100 lines of line-chart history state, intervals, and downsampling imports execute as complete dead weight on the controls page.

---

## 4. Karpathy Guidelines Compliance Review

Applying Andrej Karpathy's four foundational behavioral guidelines to the codebase:

### 4.1 Principle 1: Think Before Coding (State Assumptions, Surface Tradeoffs)
- **Framework Mismatch**: The prompt and specifications stated Next.js, yet development proceeded on Vite SPA without explicitly surfacing the architectural tradeoff.
- **Plaintext Password Storage**: Rather than implementing secure password reset tokens or Supabase admin APIs, developers took a dangerous shortcut by storing plaintext passwords in `public.profiles.password` simply to display them in the admin dashboard.
- **Single-Topic JSON Model**: The MQTT implementation assumed all variables would share one monolithic topic JSON payload, creating severe read-modify-write race conditions instead of atomic variable updates.

### 4.2 Principle 2: Simplicity First (Minimum Code That Solves the Problem)
- **Uncalled Audio Synthesizer (`utils/audio.ts`)**: 76 lines of complex Web Audio API synthesizer code with LFO modulators were written speculatively before alarm UI integration was even planned.
- **Speculative JSON Path Parser (`utils/jsonPathExtractor.ts`)**: 89 lines of recursive dot/bracket notation parsers were created "just in case", while all actual PLCs publish flat JSON objects.
- **Duplicate Dashboard Cards (`components/DashboardWidgets.tsx`)**: 172 lines of duplicate card and chart widgets were written and abandoned when `WidgetRenderer.tsx` was implemented.
- **Heavy Animation Dependency (`framer-motion`)**: A 150 kB minified library was pulled in for three trivial fade/slide transitions that can be accomplished with 5 lines of pure CSS.

### 4.3 Principle 3: Surgical Changes (Touch Only What You Must, Clean Up Your Own Mess)
- **Sloppy Refactoring**: When telemetry ingestion was moved to `telemetry-bridge`, the developer simply emptied `flushTelemetryBuffer()` rather than surgically removing the telemetry buffering logic, leaving behind a monotonic memory leak.
- **Littered Root Directory**: 18 `.cjs` scripts and 5 test scripts were left in the repository root rather than being cleaned up after one-off refactoring tasks.
- **Zombie Unused Imports**: Refactoring left unreferenced imports across multiple core files:
  - `App.tsx:22, 24`: `UserConfig`, `DEFAULT_USER_CONFIG`
  - `pages/Settings.tsx:4`: `DEFAULT_USER_CONFIG`
  - `pages/Login.tsx:2`: `CheckCircle2`
  - `components/Layout.tsx:12, 20`: `Bell`, unused `children` in `LayoutProps`
  - `components/BrokerStatus.tsx:3`: `WifiOff`
  - `pages/AdminDashboard.tsx:220`: unused `const needsEdgeFunction = true;`

### 4.4 Principle 4: Goal-Driven Execution (Define Success Criteria, Loop Until Verified)
- **Zero Automated Tests**: `package.json` contains no `test` script. No Vitest, Jest, or React Testing Library tests exist anywhere in the repository.
- **Ad-Hoc Manual Verification**: Developers relied on throwaway scripts (`test.cjs`, `browser-mqtt-test.js`, `tmp_test_credentials.js`) instead of writing repeatable, automated unit and integration tests.

---

## 5. Ecosystem Skills Recommendations (via `find-skills`)

Using the Skills CLI (`npx skills`) and the [skills.sh](https://skills.sh/) leaderboard, the following battle-tested open agent skills are recommended for immediate adoption:

### 5.1 `antfu/skills@vitest`
- **Installs**: 34,500+ | **Source**: Anthony Fu (Vitest Core Team)
- **Command**:
  ```bash
  npx skills add antfu/skills@vitest
  ```
- **Rationale**: AfricFroid currently has **zero automated tests**. Vitest integrates seamlessly with Vite 6. This skill introduces unit testing configurations for `chartSeries.ts`, downsampling algorithms, MQTT connection status logic, and `WidgetRenderer` value calculations without Babel or Webpack friction.

### 5.2 `supabase/agent-skills@supabase-postgres-best-practices`
- **Installs**: 385,500+ | **Source**: Supabase (Official)
- **Command**:
  ```bash
  npx skills add supabase/agent-skills@supabase-postgres-best-practices
  ```
- **Rationale**: Provides expert guidance for PostgreSQL schema design, time-series indexing on `telemetry_readings (widget_id, created_at DESC)`, partitioning strategies for high-frequency IoT telemetry, and eliminating plaintext password columns in favor of secure auth schemas.

### 5.3 `vercel-labs/agent-skills@vercel-react-best-practices`
- **Installs**: 688,600+ | **Source**: Vercel Labs (Official)
- **Command**:
  ```bash
  npx skills add vercel-labs/agent-skills@vercel-react-best-practices
  ```
- **Rationale**: Provides React 19 performance guidelines: eliminating re-render thrashing in high-frequency live WebSocket/MQTT dashboards, code-splitting monolithic mega-components (`WidgetRenderer.tsx`), and managing lifecycle cleanup to eliminate memory leaks.

### 5.4 `lombiq/tailwind-agent-skills@tailwind-4-docs`
- **Installs**: 12,800+ | **Source**: Lombiq
- **Command**:
  ```bash
  npx skills add lombiq/tailwind-agent-skills@tailwind-4-docs
  ```
- **Rationale**: Guides the complete migration from legacy Tailwind v3 runtime CDN to clean Tailwind v4 `@theme` configuration in `index.css`, removing external CDN dependencies for offline industrial kiosks.

### 5.5 `yoanbernabeu/supabase-pentest-skills@supabase-audit-rls`
- **Installs**: 870+ | **Source**: Yoan Bernabeu
- **Command**:
  ```bash
  npx skills add yoanbernabeu/supabase-pentest-skills@supabase-audit-rls
  ```
- **Rationale**: Automatically audits Supabase PostgreSQL Row Level Security (RLS) policies, identifying leaky public policies, privilege escalation vectors, and unauthenticated read access to tables.

---

## 6. Open Questions for Engineering & Product Stakeholders

1. **Target Architecture (Vite SPA vs. Next.js)**:
   Does the product roadmap intend to keep AfricFroid as a client-side Vite SPA with Capacitor mobile packaging, or is an active migration to Next.js App Router (SSR) planned?
2. **Telemetry Ingestion Ownership**:
   Is the standalone Node.js `telemetry-bridge` daemon the permanent, sole mechanism for persisting historical telemetry to Supabase, or should the browser client retain fallback buffering? *(If bridge-only, all buffering code in `mqttService.ts` must be pruned immediately).*
3. **Password Security & Profiles Schema**:
   Can the `password` column in `public.profiles` be dropped immediately, migrating all password resets and user creation strictly to Supabase Auth Edge Functions?
4. **Retention of `New folder (3)/`**:
   Can `New folder (3)/` (2.32 GB containing legacy repositories and a 964 MB log file) be permanently removed from git tracking and added to `.gitignore`?
5. **Offline & Kiosk Deployment Requirements**:
   Is AfricFroid required to function on air-gapped industrial plant networks without public internet access? *(If yes, the runtime CDN Tailwind script in `index.html` must be removed immediately).*
6. **Edge Function Source Code Location**:
   Where are the source repositories for `create-user` and `update-user` located? Can they be placed inside `supabase/functions/` in this repository?
7. **Production Credential Rotation**:
   Have the exposed credentials for `admin@africfroid.app` (`ahmed123`) and the MQTT broker `mqts.frigoindus.net:9001` (`affimqtt1` / `Lmx54!s@`) been scheduled for immediate rotation?

---

## 7. Actionable Remediation Roadmap

### Phase 0: Critical Security & Memory Leak Fixes (P0 — Immediate / Day 1)
- [ ] **Rotate Exposed Credentials**:
  - Rotate Supabase password for `admin@africfroid.app`.
  - Rotate MQTT broker password for `affimqtt1` on `mqts.frigoindus.net`.
  - Remove `tmp_test_credentials.js` from the repository.
- [ ] **Fix MQTT Service Memory Leak**:
  - In `services/mqttService.ts`, delete `telemetryBuffer`, `persistTelemetry()`, `flushTelemetryBuffer()`, `flushTimer`, and associated window lifecycle listeners.
- [ ] **Restore MQTT Keepalive**:
  - In `services/mqttService.ts:26`, change `MQTT_KEEPALIVE_SEC` from `0` to `30`.
- [ ] **Fix Inbound Draft Value Overwriting**:
  - In `components/WidgetRenderer.tsx` (lines 880, 931, 984, 1028, 1092), add an active editing guard to prevent incoming MQTT packets from wiping operator input.
- [ ] **Fix Telemetry Loss in Ingestion Bridge**:
  - In `telemetry-bridge/index.js:51`, update `.in('mqtt_action', ['SUBSCRIBE', 'SYNC'])`.

### Phase 1: Functional Bug Fixes & UI Stability (P1 — Week 1)
- [ ] **Fix WidgetRenderer Logic Bugs**:
  - Line 1200: Change `(ReadingWidgetType.GAUGE ? 67 : 24.5)` to `(widget.widgetType === ReadingWidgetType.GAUGE ? 67 : 24.5)`.
  - Line 1212: Pass `historyData={displayHistory}` to `<LineChartWidget />`.
  - Line 1234: Provide mock logs with `{ time, msg }` structure to `TextLogWidget`.
- [ ] **Stop Route Remount Churn**:
  - In `App.tsx:57`, remove `key={location.pathname}` from `<Routes>`. Place animation keys on page components inside `<Outlet />`.
- [ ] **Deduplicate `<BrokerStatus>`**:
  - In `components/Layout.tsx`, consolidate desktop and mobile headers into a single `<BrokerStatus>` instance to eliminate duplicate 5s polling intervals.
- [ ] **Fix Async Subscription Leaks**:
  - In `pages/ClientDashboard.tsx` and `pages/ClientControls.tsx`, implement a mounted cancellation flag inside `useEffect` to guarantee clean unsubscription when unmounting prior to promise resolution.
- [ ] **Paginate Telemetry CSV Export**:
  - In `services/telemetryExport.ts`, implement chunked `.range(start, end)` pagination to retrieve all readings across the 7-day retention window.

### Phase 2: Code Hygiene, Orphan Pruning & Bloat Removal (P2 — Week 2)
- [ ] **Purge Root Duplicates**:
  - Delete `ConfirmProvider.tsx`, `ToastProvider.tsx`, `chartSeries.ts`, and `apply-migrations.mjs` from the project root.
- [ ] **Delete Completely Dead Modules**:
  - Delete `components/DashboardWidgets.tsx`, `utils/audio.ts`, and `utils/jsonPathExtractor.ts`.
  - Delete `public/sitemap-main.xml`.
- [ ] **Purge Root Patch & Test Scripts**:
  - Delete all 18 `.cjs` regex scripts and abandoned test scripts (`test-mqtt-connection.js`, `browser-mqtt-test.js`, `test-tailwind.html`, `get_broker.js`, `mqtt-simulator.js`).
- [ ] **Clean Up `ClientControls.tsx`**:
  - Strip dead line-chart history fetching, downsample imports, and 45-second polling intervals.
- [ ] **Remove `New folder (3)/` Bloat**:
  - Remove `New folder (3)/` (2.32 GB) from disk and git tracking; add `New folder*/` to `.gitignore`.
- [ ] **Remove Unused Imports**:
  - Clean up dead imports in `App.tsx`, `Layout.tsx`, `Settings.tsx`, `Login.tsx`, and `BrokerStatus.tsx`.

### Phase 3: Architectural Consolidation & Long-Term Robustness (P3 — Week 3)
- [ ] **Unify Tailwind CSS Architecture**:
  - Remove `<script src="https://cdn.tailwindcss.com"></script>` and inline configuration from `index.html`.
  - Add the `frost` color palette to `index.css` via Tailwind v4 `@theme` block.
- [ ] **Eliminate Plaintext Password Column**:
  - Execute a migration dropping `public.profiles.password`.
  - Update `AdminDashboard.tsx` and `Settings.tsx` to handle password resets via Supabase Auth.
- [ ] **Version Supabase Edge Functions**:
  - Create `supabase/functions/create-user/index.ts`, `update-user/index.ts`, and `delete-user/index.ts`.
- [ ] **Modularize `WidgetRenderer.tsx`**:
  - Split the 1,284-line monolithic file into modular subdirectories (`components/widgets/readings/`, `components/widgets/controls/`) with dynamic `React.lazy` imports to reduce the initial bundle chunk from 413 kB.
- [ ] **Implement Automated Testing Suite**:
  - Install Vitest (`npx skills add antfu/skills@vitest`).
  - Add unit tests for MQTT service, downsampling algorithms, and widget renderers.
