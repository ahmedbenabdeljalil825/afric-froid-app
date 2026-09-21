# AfricFroid Architecture Context

## 1. Stateful Alarms
- Managed via Postgres larm_events table in Supabase.
- The 	elemetry-bridge daemon (Node.js) evaluates incoming MQTT payloads and inserts/resolves alarms in real-time.
- **Security:** Admins have a global RLS bypass to see all alarms. Clients are strictly filtered by their user_id so they only see their own alarms.

## 2. UI Rules & Isolation
- WidgetRenderer strips MQTT topics and variable names for CLIENT roles.
- This is achieved globally via a React ClientContext. 
- Technical tooltips are hidden from clients but remain visible to ADMIN accounts for debugging.

## 3. Internationalization (i18n)
- All UI strings use the TRANSLATIONS dictionary (en/fr) in constants.ts.
- The user.language preference dynamically swaps the UI between English and French.
- Dates and timestamps dynamically format to r-FR or en-US depending on the active locale.

## 4. Infrastructure & Future Migration
- **Current:** Supabase Cloud backend.
- **Pending:** Migration to a self-hosted VPS via the komodo MCP once the sysadmin grants ADMIN network permissions to the Komodo service account (to orchestrate the 11-container docker-compose setup without overlapping with existing services).
