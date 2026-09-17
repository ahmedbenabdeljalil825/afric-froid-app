# Changelog

All notable changes to the AfricFroid project (Web Dashboard, Android App, Telemetry Bridge) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
