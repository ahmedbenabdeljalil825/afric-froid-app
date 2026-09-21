# AfricFroid Architecture Context
*(Auto-generated memory checkpoint)*

## 1. Stateful Alarms
- Managed via Postgres larm_events table in Supabase Cloud.
- The 	elemetry-bridge daemon (Node.js) evaluates incoming MQTT payloads against widgets where category === 'ALARM'.
- If an alarm triggers, the bridge inserts a row. If it resolves, it updates the row to is_resolved = true.
- **Security Trap:** Admins authenticate the bridge via email/password, so we created an RLS bypass policy (Admins can insert alarms) to allow the bridge to write data for clients. Standard clients are filtered by user_id.

## 2. Dashboard UI & ClientContext
- WidgetRenderer.tsx evaluates isClient via a React ClientContext provider.
- All technical metadata (MQTT topics like fricfroid/machine1/telemetry, variable names like par_alarme, and internal tooltips) are stripped/hidden when isClient === true. Admins can still see them for debugging.

## 3. i18n Translation Matrix
- No hardcoded text! All UI text uses the TRANSLATIONS dictionary (en/fr) in constants.ts.
- Dates and times explicitly format using user.language === 'fr' ? 'fr-FR' : 'en-US'.

## 4. Infrastructure Roadmap
- Currently running on Supabase Cloud.
- Pending full migration to a self-hosted VPS via the **Komodo MCP** once the sysadmin upgrades our Komodo account to 'Admin' (to allow Docker network inspection and bridging).

## 5. Version Control
- Current Release: v1.2.0 (Alarm System Update).
- Tracked in ersion.json and CHANGELOG.md.
