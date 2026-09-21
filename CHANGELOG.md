# Changelog

All notable changes to the AfricFroid project (Web Dashboard, Android App, Telemetry Bridge) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-09-21

### Fixed
- **Security**: User deletion now invokes the `delete-user` Supabase Edge Function, which calls `auth.admin.deleteUser()` to fully remove the user from `auth.users` — preventing deleted users from re-authenticating.
- **White Screen Bug**: Added `ErrorBoundary` component wrapping all lazy-loaded pages. Unhandled render errors now display a friendly error screen with a reload button instead of a blank white page.

### Improved
- **Android / WebView**: Alarm buzzer audio is now gated on a prior user interaction, bypassing Android WebView autoplay restrictions. Audio defers until first `click` or `touchstart` event.
- **Offline Safety**: Removed `cdn.tailwindcss.com` CDN script from `index.html`. App now relies solely on pre-compiled Tailwind CSS, ensuring full styling on air-gapped plant networks.
- **Security**: Added `supabase/functions/` exclusion to `tsconfig.json` to prevent Deno type conflicts in the browser build.

## [1.4.0] - 2026-09-21

### Added
- **Android App**: Fully integrated `@capacitor/push-notifications` with Firebase Cloud Messaging (FCM). 
- **Android App**: App automatically requests push permissions and registers the device FCM token to the user's Supabase profile upon login.
- **Telemetry Bridge (v1.2.0)**: Integrated `firebase-admin`. The bridge now intercepts MQTT alarms and dispatches real-time push notifications to the affected user's Android device.
- **Android Build**: Generated `google-services.json` and finalized the Capacitor Android configuration.

## [1.3.0] - 2026-09-21

### Added
- **Web Dashboard**: Multi-System / Multi-Controller Dashboard Grouping. Clients with multiple controllers or multiple systems per controller now see a 3-layer collapsible accordion (Controller → System → Widgets) instead of a flat widget grid.
- **Web Dashboard (Admin)**: Widget Designer modal now includes optional `Controller Name` and `System Name` fields. Values are stored inside the existing `config` JSONB column — zero database schema changes required.
- **Web Dashboard (Admin)**: Sidebar widget cards now display violet and amber grouping badges when a widget is assigned to a controller/system, for at-a-glance visibility.
- **Web Dashboard**: Backward-compatible — clients with no grouping tags set continue to see the original flat grid layout with no visual change.

## [1.2.0] - 2026-09-18

### Added
- **Web Dashboard**: Stateful Alarm Architecture. Full support for PLC-triggered system alarms via MQTT.
- **Web Dashboard**: Dedicated /alarms route to independently track real-time alarm history.
- **Web Dashboard**: Flashing red visual overlay and audio buzzer triggered globally on unacknowledged alarms.
- **Web Dashboard**: Full i18n support across all alarm interfaces (Dynamic translation between English and French based on user settings).
- **Telemetry Bridge (v1.1.0)**: Automatic resolution tracking for alarms. Bridge now intercepts alarm states and manages Postgres lifecycle.
- **Database**: larm_events table introduced with strict Row Level Security (RLS) isolation.

### Changed
- **Web Dashboard**: Alarm visual triggers are explicitly suppressed for Admin roles to prevent noise during client management.

## [1.1.0] - 2026-09-17

### Added
- **Web Dashboard**: Support for strict MQTT telemetry namespaces to prevent read/write topic collisions.
- **Web Dashboard**: New `isDirty` state machine for control widgets to prevent inbound telemetry from wiping inputs while operators are typing or dragging.
- **Android App**: Capacitor initial configuration synced with Web Dashboard v1.1.0.

### Changed
- **Web Dashboard**: App Layout root router unmount churn removed, drastically improving navigation performance.
- **Telemetry Bridge**: Standard 60-second MQTT keepalive pings enabled to maintain stable broker connection in industrial environments.

### Fixed
- **Telemetry Bridge**: Infinite monotonic memory leak in `telemetryBuffer` array patched.
- **Telemetry Bridge**: Hardcoded admin credentials and plaintext secrets removed. Strict environment variable enforcement implemented.
- **Web Dashboard**: Asynchronous MQTT ghost subscription leak in React `useEffect` unmounts patched.
- **Supabase Export**: Silent 1,000-row export truncation bypassed using a paginated loop for complete historical data extraction.
- **Bloat**: 2.32 GB legacy bloat folder and unused orphaned code files removed from repository.

## [1.0.0] - 2026-03-28

### Added
- Initial deployment of AfricFroid dashboard with React, Vite, and Recharts.
- Local telemetry bridge established for Supabase integration.

