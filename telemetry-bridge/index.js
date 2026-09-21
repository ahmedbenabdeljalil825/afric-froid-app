/**
 * Afric Froid — 24/7 telemetry bridge
 *
 * Subscribes to MQTT topics derived from active widgets in Supabase and writes
 * numeric samples to telemetry_readings using the service role key.
 * Run this on a server / PC that stays on (PM2, systemd, Docker) so history
 * keeps filling when all browser tabs are closed.
 *
 * One process is normally tied to ONE MQTT broker (typical single-site setup).
 */

import 'dotenv/config';
import mqtt from 'mqtt';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

let firebaseApp = null;
try {
  // Uses GOOGLE_APPLICATION_CREDENTIALS environment variable
  firebaseApp = admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
  console.log('[bridge] Firebase Admin initialized for push notifications');
} catch (e) {
  console.warn('[bridge] Firebase Admin not initialized. Push notifications disabled until credentials are provided.');
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const MQTT_URL = process.env.MQTT_BROKER_URL;
const MQTT_USER = process.env.MQTT_USERNAME || undefined;
const MQTT_PASS = process.env.MQTT_PASSWORD || undefined;
const FLUSH_MS = Number(process.env.BRIDGE_FLUSH_MS) || 10_000;
const WIDGET_REFRESH_MS = Number(process.env.BRIDGE_WIDGET_REFRESH_MS) || 5 * 60 * 1000;
const TELEMETRY_RETENTION_HOURS = Number(process.env.BRIDGE_TELEMETRY_RETENTION_HOURS) || 168; // ~7 days
const PRUNE_INTERVAL_MS = Number(process.env.BRIDGE_PRUNE_INTERVAL_MS) || 6 * 60 * 60 * 1000; // prune every ~6 hours

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}
if (!MQTT_URL) {
  console.error('Missing MQTT_BROKER_URL');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: true },
});

/** @type {Array<{ id: string; mqtt_topic: string; variable_name: string; history_interval: number | null; config: Record<string, unknown> | null; mqtt_action: string }>} */
let widgets = [];
const lastStoredMs = new Map();
const telemetryBuffer = [];
let mqttClient = null;
const subscribedTopics = new Set();

async function loadWidgets() {
  const { data, error } = await supabase
    .from('widgets')
    .select('id, user_id, mqtt_topic, variable_name, history_interval, config, mqtt_action, category, is_active')
    .eq('is_active', true)
    .eq('mqtt_action', 'SUBSCRIBE')
    .in('category', ['READING', 'CONTROLLING', 'ALARM']);

  if (error) {
    console.error('[bridge] Failed to load widgets:', error.message);
    return;
  }
  widgets = data || [];
  console.log(`[bridge] Loaded ${widgets.length} active SUBSCRIBE widgets`);
  syncMqttSubscriptions();
}

async function handleAlarmTrigger(w, isActive) {
  try {
    if (isActive) {
      // Check if there's already an active (unresolved) alarm for this widget
      const { data, error } = await supabase
        .from('alarm_events')
        .select('id')
        .eq('widget_id', w.id)
        .eq('is_resolved', false)
        .limit(1);
      
      if (!error && (!data || data.length === 0)) {
        await supabase.from('alarm_events').insert({
          user_id: w.user_id,
          widget_id: w.id,
          variable_name: w.variable_name,
          custom_message: w.config?.customMessage || 'System Alarm Triggered',
          is_resolved: false,
          is_acknowledged: false
        });
        console.log('[bridge] ALARM TRIGGERED: ' + w.variable_name);
        
        // Dispatch push notification to device
        if (firebaseApp) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('config')
              .eq('id', w.user_id)
              .single();
            const fcmToken = profile?.config?.fcm_token;
            if (fcmToken) {
              await admin.messaging().send({
                token: fcmToken,
                notification: {
                  title: '🚨 System Alarm',
                  body: w.config?.customMessage || `Alarm triggered for ${w.variable_name}`
                },
                data: { type: 'alarm' }
              });
              console.log(`[bridge] Push notification sent to user ${w.user_id}`);
            }
          } catch (pushErr) {
            console.error('[bridge] Push notification failed:', pushErr);
          }
        }
      }
    } else {
      // Resolve active alarms for this widget
      const { data, error } = await supabase
        .from('alarm_events')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('widget_id', w.id)
        .eq('is_resolved', false)
        .select('id');
      
      if (!error && data && data.length > 0) {
        console.log('[bridge] ALARM RESOLVED: ' + w.variable_name);
      }
    }
  } catch (e) {
    console.error('[bridge] Error handling alarm trigger:', e);
  }
}

let pruneInFlight = false;
async function pruneOldTelemetry() {
  if (pruneInFlight) return;
  pruneInFlight = true;
  try {
    const { error } = await supabase.rpc('prune_telemetry_readings', {
      p_retention_hours: TELEMETRY_RETENTION_HOURS,
    });
    if (error) throw error;
    console.log(
      `[bridge] Pruned telemetry older than ${TELEMETRY_RETENTION_HOURS}h`
    );
  } catch (e) {
    console.error('[bridge] Telemetry prune failed:', e?.message || e);
  } finally {
    pruneInFlight = false;
  }
}

function syncMqttSubscriptions() {
  if (!mqttClient?.connected) return;
  const topics = new Set(widgets.map((w) => w.mqtt_topic).filter(Boolean));
  for (const topic of topics) {
    if (subscribedTopics.has(topic)) continue;
    mqttClient.subscribe(topic, (err) => {
      if (err) console.error('[bridge] Subscribe error:', topic, err.message);
      else {
        subscribedTopics.add(topic);
        console.log('[bridge] Subscribed:', topic);
      }
    });
  }
}

function handleMqttMessage(topic, message) {
  let payload;
  try {
    payload = JSON.parse(message.toString());
  } catch {
    return;
  }
  if (!payload || typeof payload !== 'object') return;

  const nowMs = Date.now();
  const nowIso = new Date().toISOString();

  for (let [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
      // We keep booleans as booleans for alarms, but cast to 1/0 for telemetry
      let numericValue = value;
      if (typeof value === 'boolean') numericValue = value ? 1 : 0;
      if (typeof numericValue !== 'number' || Number.isNaN(numericValue)) continue;

    const matches = widgets.filter(
      (w) => w.variable_name === key && w.mqtt_topic === topic
    );

    for (const w of matches) {
      if (w.category === 'ALARM') {
        handleAlarmTrigger(w, !!value);
        continue;
      }
      const intervalSec = Math.max(5, w.history_interval ?? 10);
      const prev = lastStoredMs.get(w.id) || 0;
      if (nowMs - prev < intervalSec * 1000) continue;

      const unit =
        w.config && typeof w.config === 'object' && 'unit' in w.config
          ? String(w.config.unit || '')
          : undefined;

      telemetryBuffer.push({
        widget_id: w.id,
        variable_name: key,
        value: numericValue,
        ...(unit ? { unit } : {}),
        created_at: nowIso,
      });
      lastStoredMs.set(w.id, nowMs);
    }
  }
}

async function flushTelemetryBuffer() {
  if (telemetryBuffer.length === 0) return;
  const batch = telemetryBuffer.splice(0, telemetryBuffer.length);
  const { error } = await supabase.from('telemetry_readings').insert(batch);
  if (error) {
    console.error('[bridge] Insert failed:', error.message);
    if (telemetryBuffer.length < 5000) {
      telemetryBuffer.unshift(...batch);
    }
  } else if (batch.length) {
    console.log(`[bridge] Inserted ${batch.length} telemetry row(s)`);
  }
}

function connectMqtt() {
  mqttClient = mqtt.connect(MQTT_URL, {
    username: MQTT_USER,
    password: MQTT_PASS,
    clientId: `af-bridge-${Math.random().toString(16).slice(2, 10)}`,
    reconnectPeriod: 5000,
    connectTimeout: 30_000,
    keepalive: 60,
    protocolVersion: 4,
    clean: true,
  });

  mqttClient.on('connect', () => {
    console.log('[bridge] MQTT connected');
    subscribedTopics.clear();
    syncMqttSubscriptions();
  });

  mqttClient.on('message', handleMqttMessage);
  mqttClient.on('error', (err) => console.error('[bridge] MQTT error:', err.message));
  mqttClient.on('offline', () => console.warn('[bridge] MQTT offline'));
  mqttClient.on('reconnect', () => console.log('[bridge] MQTT reconnecting…'));
}

async function shutdown() {
  console.log('[bridge] Shutting down…');
  await flushTelemetryBuffer();
  if (mqttClient) {
    mqttClient.end(true);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function listenForCommands() {
  console.log('[bridge] Listening for remote commands via Supabase Realtime...');
  supabase
    .channel('bridge-commands')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'device_commands', filter: 'executed_at=is.null' },
      async (payload) => {
        const cmd = payload.new;
        console.log(`[bridge] Received command for topic ${cmd.topic}:`, cmd.payload);
        if (mqttClient?.connected) {
          mqttClient.publish(cmd.topic, cmd.payload, { qos: 1 }, async (err) => {
            if (err) console.error('[bridge] Failed to publish command:', err);
            else {
              console.log(`[bridge] Command published successfully to ${cmd.topic}.`);
              await supabase.from('device_commands').update({ executed_at: new Date().toISOString() }).eq('id', cmd.id);
            }
          });
        }
      }
    ).subscribe();
}

async function main() {
  console.log('[bridge] Authenticating with Supabase...');
  const email = process.env.SUPABASE_EMAIL;
  const password = process.env.SUPABASE_PASSWORD;
  if (!email || !password) {
      console.error('[bridge] Missing SUPABASE_EMAIL or SUPABASE_PASSWORD environment variables.');
      process.exit(1);
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('[bridge] Failed to authenticate:', error.message);
    process.exit(1);
  }
  console.log('[bridge] Authentication successful!');
  listenForCommands();
  await loadWidgets();
  connectMqtt();
  setInterval(flushTelemetryBuffer, FLUSH_MS);
  setInterval(loadWidgets, WIDGET_REFRESH_MS);
  // Keep storage bounded even when no DB scheduler is available.
  // Requires the `public.prune_telemetry_readings` function to exist.
  setInterval(pruneOldTelemetry, PRUNE_INTERVAL_MS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});







