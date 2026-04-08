import mqtt, { MqttClient } from 'mqtt';
import { MqttConfig, Widget } from '../types';
import { supabase } from './supabase';

type MessageCallback = (data: any) => void;
type StatusCallback = (status: 'connected' | 'disconnected' | 'connecting' | 'error') => void;

class MQTTService {
    private client: MqttClient | null = null;
    private config: MqttConfig | null = null;
    private topicCallbacks: Map<string, Set<MessageCallback>> = new Map();
    private onStatusCallbacks: Set<StatusCallback> = new Set();
    private topicState: Record<string, any> = {};
    private topicTimestamps: Record<string, number> = {};
    private monitoredWidgets: Widget[] = [];
    private allWidgets: Widget[] = [];
    private activeAlarmWidgets: Set<string> = new Set();
    private telemetryBuffer: Array<{ widget_id: string; variable_name: string; value: number; unit?: string; created_at: string }> = [];
    private lastStoredTimestamps: Map<string, number> = new Map();
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private readonly FLUSH_INTERVAL = 10000; // 10 seconds
    private readonly STORAGE_KEY = 'af_mqtt_statev2';
    public status: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected';
    private lastErrorMessage: string | null = null;

    /** Background tabs throttle timers — MQTT keepalive pings stop → false “offline”. 0 = no client pings (broker must allow). */
    private readonly MQTT_KEEPALIVE_SEC = 0;

    private offlineUiTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly OFFLINE_UI_DEBOUNCE_MS = 12_000;
    private visibilityUiBound = false;
    private telemetryLifecycleBound = false;
    private brokerAutoUpgradedToWss = false;

    constructor() {
        this.loadStateFromStorage();
    }

    /**
     * Best-effort flush when the tab is backgrounded/closed.
     * Browsers heavily throttle timers + can drop WebSocket traffic in background tabs,
     * so we proactively flush any buffered samples on lifecycle events.
     */
    private bindTelemetryFlushLifecycle() {
        if (this.telemetryLifecycleBound || typeof window === 'undefined' || typeof document === 'undefined') return;
        this.telemetryLifecycleBound = true;

        const flush = () => {
            // Don't block UI; this is best-effort.
            void this.flushTelemetryBuffer();
        };

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') flush();
        });
        window.addEventListener('pagehide', flush);
        window.addEventListener('beforeunload', flush);
    }

    private loadStateFromStorage() {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.topicState = parsed.state || {};
                this.topicTimestamps = parsed.timestamps || {};
            }
        } catch (e) {
            console.error('[MQTT] Failed to load state from storage:', e);
        }
    }

    private saveStateToStorage() {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                state: this.topicState,
                timestamps: this.topicTimestamps
            }));
        } catch (e) {
            console.error('[MQTT] Failed to save state to storage:', e);
        }
    }

    public getCurrentState() {
        return JSON.parse(JSON.stringify(this.topicState));
    }

    public getLastUpdate() {
        const times = Object.values(this.topicTimestamps);
        if (times.length === 0) return null;
        return Math.max(...times);
    }

    public getLastError() {
        return this.lastErrorMessage;
    }

    private sanitizeCredential(value: unknown): string | undefined {
        if (value === null || value === undefined) return undefined;
        const trimmed = String(value).trim();
        if (!trimmed) return undefined;

        // Defensive: some payload paths can accidentally wrap credentials in quotes.
        const wrappedInDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"');
        const wrappedInSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'");
        if (wrappedInDoubleQuotes || wrappedInSingleQuotes) {
            const unwrapped = trimmed.slice(1, -1).trim();
            return unwrapped || undefined;
        }
        return trimmed;
    }

    private firstDefined(obj: Record<string, any>, keys: string[]): unknown {
        for (const key of keys) {
            if (obj[key] !== undefined && obj[key] !== null) return obj[key];
        }
        return undefined;
    }

    private normalizeBrokerUrl(rawUrl: string): string {
        const trimmed = rawUrl.trim();
        if (!trimmed) return trimmed;
        this.brokerAutoUpgradedToWss = false;

        // In HTTPS production pages, browsers block insecure WebSocket (ws://).
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && trimmed.startsWith('ws://')) {
            this.brokerAutoUpgradedToWss = true;
            return 'wss://' + trimmed.slice('ws://'.length);
        }
        return trimmed;
    }

    private normalizeMqttConfig(input: unknown): MqttConfig | null {
        let cfg: any = input;
        if (typeof cfg === 'string') {
            try {
                cfg = JSON.parse(cfg);
            } catch {
                return null;
            }
        }
        if (!cfg || typeof cfg !== 'object') return null;

        const auth = (cfg.auth && typeof cfg.auth === 'object') ? cfg.auth : {};
        const brokerRaw = this.sanitizeCredential(
            this.firstDefined(cfg, ['brokerUrl', 'broker_url', 'url', 'broker'])
        );
        const brokerUrl = brokerRaw ? this.normalizeBrokerUrl(brokerRaw) : undefined;
        if (!brokerUrl) return null;

        const username = this.sanitizeCredential(
            this.firstDefined(cfg, ['username', 'user', 'userName', 'mqttUsername'])
                ?? this.firstDefined(auth, ['username', 'user', 'userName'])
        );
        const password = this.sanitizeCredential(
            this.firstDefined(cfg, ['password', 'pass', 'passWord', 'mqttPassword'])
                ?? this.firstDefined(auth, ['password', 'pass', 'passWord'])
        );
        const topicsSrc = (cfg.topics && typeof cfg.topics === 'object') ? cfg.topics : {};

        return {
            brokerUrl,
            username,
            password,
            topics: {
                telemetry: String(
                    this.firstDefined(topicsSrc, ['telemetry', 'telemetry_topic', 'data', 'read'])
                    ?? this.firstDefined(cfg, ['telemetryTopic', 'telemetry_topic'])
                    ?? ''
                ).trim(),
                command: String(
                    this.firstDefined(topicsSrc, ['command', 'command_topic', 'write', 'control'])
                    ?? this.firstDefined(cfg, ['commandTopic', 'command_topic'])
                    ?? ''
                ).trim(),
            },
        };
    }

    connect(config: MqttConfig) {
        const normalized = this.normalizeMqttConfig(config as unknown);
        if (!normalized) {
            this.lastErrorMessage = 'Invalid MQTT configuration (broker URL or JSON format).';
            this.updateStatus('error');
            return;
        }

        if (this.client) {
            try {
                this.client.removeAllListeners();
            } catch {
                /* ignore */
            }
            this.client.end(true);
            this.client = null;
        }

        this.updateStatus('connecting');
        this.lastErrorMessage = null;
        this.config = normalized;
        // console.log('Connecting to MQTT Broker:', config.brokerUrl);

        const options: mqtt.IClientOptions = {
            keepalive: this.MQTT_KEEPALIVE_SEC,
            clientId: this.getStableClientId(),
            protocolId: 'MQTT',
            protocolVersion: 4,
            clean: true,
            reconnectPeriod: 2000,
            connectTimeout: 30 * 1000,
        };

        if (normalized.username) options.username = normalized.username;
        if (normalized.password) options.password = normalized.password;

        this.client = mqtt.connect(normalized.brokerUrl, options);
        let everConnected = false;

        this.client.on('connect', () => {
            console.log(`[MQTT] Connected successfully to ${normalized.brokerUrl}`);
            everConnected = true;
            this.lastErrorMessage = null;
            this.clearOfflineUiDebounce();
            this.updateStatus('connected');
            this.resubscribeAllTopics();
        });

        this.bindVisibilityForStatusSync();

        this.client.on('error', (err: Error) => {
            console.error('[MQTT] Connection Error:', err);
            this.clearOfflineUiDebounce();
            this.lastErrorMessage = err?.message || 'Unknown MQTT error';
            this.updateStatus('error');

            const msg = (err?.message || '').toLowerCase();
            const authError =
                msg.includes('not authorized') ||
                msg.includes('bad username') ||
                msg.includes('bad user name') ||
                msg.includes('authentication');

            if (authError && this.client) {
                // Avoid endless reconnect loops when credentials are invalid/missing.
                this.client.options.reconnectPeriod = 0;
                this.client.end(true);
                this.client = null;
            }
        });

        this.client.on('offline', () => {
            console.warn('[MQTT] Client went offline');
            // In background tabs the client often flips offline when timers/WebSocket are throttled — don’t flash the UI.
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                return;
            }
            this.scheduleDisconnectedUiDebounced();
        });

        this.client.on('reconnect', () => {
            // Do not set status to 'connecting' here — brief tab switches trigger this often and flash the UI.
            // Status is already 'disconnected' from 'offline'; 'connect' will restore 'connected'.
            console.log(`[MQTT] Attempting to reconnect to ${normalized.brokerUrl}...`);
        });

        this.client.on('close', () => {
            console.warn('[MQTT] Connection closed');
            if (!everConnected && this.brokerAutoUpgradedToWss) {
                this.lastErrorMessage =
                    'Broker closed WSS handshake. Your broker likely supports ws:// only. Configure TLS/WSS on broker (or reverse proxy) for production HTTPS.';
                this.updateStatus('error');
            }
        });

        this.client.on('disconnect', (packet) => {
            console.warn('[MQTT] Disconnect packet received from broker:', packet);
        });

        this.client.on('message', (topic: string, message: Buffer) => {
            this.handleMessage(topic, message);
        });
    }

    private onVisibilityForStatusSync = () => {
        if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
        this.clearOfflineUiDebounce();
        if (this.client) {
            this.updateStatus(this.client.connected ? 'connected' : 'disconnected');
        }
    };

    private bindVisibilityForStatusSync() {
        if (this.visibilityUiBound || typeof document === 'undefined') return;
        document.addEventListener('visibilitychange', this.onVisibilityForStatusSync);
        this.visibilityUiBound = true;
    }

    private unbindVisibilityForStatusSync() {
        if (!this.visibilityUiBound || typeof document === 'undefined') return;
        document.removeEventListener('visibilitychange', this.onVisibilityForStatusSync);
        this.visibilityUiBound = false;
    }

    private clearOfflineUiDebounce() {
        if (this.offlineUiTimer) {
            clearTimeout(this.offlineUiTimer);
            this.offlineUiTimer = null;
        }
    }

    private scheduleDisconnectedUiDebounced() {
        this.clearOfflineUiDebounce();
        this.offlineUiTimer = setTimeout(() => {
            this.offlineUiTimer = null;
            this.updateStatus('disconnected');
        }, this.OFFLINE_UI_DEBOUNCE_MS);
    }

    /** One MQTT client id per browser tab session — avoids looking like a new device on every reconnect */
    private getStableClientId(): string {
        if (typeof sessionStorage === 'undefined') {
            return 'webapp_' + Math.random().toString(16).slice(2, 10);
        }
        const key = 'af_mqtt_client_id';
        let id = sessionStorage.getItem(key);
        if (!id) {
            id = 'webapp_' + Math.random().toString(16).slice(2, 10);
            sessionStorage.setItem(key, id);
        }
        return id;
    }

    /**
     * After reconnect, `clean: true` drops broker-side subscriptions.
     * Must subscribe to the default telemetry topic and every topic widgets registered.
     */
    private resubscribeAllTopics() {
        if (!this.client || !this.config) return;

        const topics = new Set<string>();
        topics.add(this.config.topics.telemetry);
        this.topicCallbacks.forEach((_cbs, topic) => topics.add(topic));

        topics.forEach((topic) => {
            this.client!.subscribe(topic, (err: Error | null) => {
                if (err) console.error('[MQTT] Subscribe error:', topic, err);
            });
        });
    }

    // Allow dynamic subscription for widgets with custom topics
    // Supports multiple simultaneous subscribers per topic
    subscribe(callback: MessageCallback, topic?: string): () => void {
        if (!this.client || !this.config) return () => { };

        const targetTopic = topic || this.config.topics.telemetry;

        // Subscribe the MQTT client to the topic if not already subscribed
        this.client.subscribe(targetTopic, (err: Error | null) => {
            if (err) console.error('Dynamic subscription error:', err);
        });

        // Add callback to the set for this topic
        if (!this.topicCallbacks.has(targetTopic)) {
            this.topicCallbacks.set(targetTopic, new Set());
        }
        this.topicCallbacks.get(targetTopic)!.add(callback);

        return () => {
            const callbacks = this.topicCallbacks.get(targetTopic);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.topicCallbacks.delete(targetTopic);
                }
            }
        };
    }

    private handleMessage(topic: string, message: Buffer) {
        this.clearOfflineUiDebounce();
        if (this.client?.connected) {
            this.updateStatus('connected');
        }

        try {
            const payload = JSON.parse(message.toString());

            // Store locally for future "Read-Modify-Write" operations
            this.topicState[topic] = payload;
            this.topicTimestamps[topic] = Date.now();
            this.saveStateToStorage();

            // Check for alarms
            this.checkThresholds(topic, payload);

            // Persist numeric telemetry to database for historical charts
            this.persistTelemetry(topic, payload);

            // Notify all subscribers for this specific topic
            const topicSubs = this.topicCallbacks.get(topic);
            if (topicSubs) {
                topicSubs.forEach(cb => cb(payload));
            }
        } catch (e) {
            console.error('Failed to parse MQTT JSON:', e);
        }
    }

    /**
     * Buffer numeric telemetry values for batch insertion to Supabase.
     * Maps each variable_name to its widget_id using allWidgets.
     */
    private persistTelemetry(topic: string, payload: any) {
        if (!this.allWidgets.length) return;
        const now = new Date().toISOString();
        const nowMs = Date.now();

        for (const [key, value] of Object.entries(payload)) {
            if (typeof value !== 'number') continue;

            // Find matching widget(s) for this variable
            const matchingWidgets = this.allWidgets.filter(
                w => w.variableName === key && w.mqttTopic === topic
            );
            
            for (const widget of matchingWidgets) {
                // Default to 10 seconds if no history interval is configured
                const intervalSeconds = Math.max(5, widget.historyInterval || 10);
                const lastStored = this.lastStoredTimestamps.get(widget.id) || 0;
                
                // Only push to buffer if the required interval has passed
                if (nowMs - lastStored >= intervalSeconds * 1000) {
                    this.telemetryBuffer.push({
                        widget_id: widget.id,
                        variable_name: key,
                        value: value,
                        unit: (widget.config as any)?.unit || undefined,
                        created_at: now
                    });
                    this.lastStoredTimestamps.set(widget.id, nowMs);
                }
            }
        }
    }

    /**
     * Flush the telemetry buffer to Supabase in a single batch insert.
     */
    private async flushTelemetryBuffer() {
        if (this.telemetryBuffer.length === 0) return;

        const batch = [...this.telemetryBuffer];
        this.telemetryBuffer = [];

        try {
            const { error } = await supabase
                .from('telemetry_readings')
                .insert(batch);

            if (error) {
                console.error('[MQTT] Failed to flush telemetry:', error.message);
                // Put failed items back for retry (but cap to prevent memory leak)
                if (this.telemetryBuffer.length < 5000) {
                    this.telemetryBuffer.unshift(...batch);
                }
            }
        } catch (err) {
            console.error('[MQTT] Telemetry flush exception:', err);
        }
    }

    /**
     * Start periodic flushing of the telemetry buffer.
     */
    private startFlushTimer() {
        if (this.flushTimer) return; // already running
        this.bindTelemetryFlushLifecycle();
        this.flushTimer = setInterval(() => this.flushTelemetryBuffer(), this.FLUSH_INTERVAL);
    }

    /**
     * Read-Modify-Write: Reads the latest state for the topic, 
     * updates one variable, and publishes the full JSON back.
     */
    publishVariableUpdate(topic: string, variableName: string, newValue: any) {
        if (!this.client || !this.client.connected) {
            console.error('Cannot publish: MQTT client not connected');
            return;
        }

        // 1. Get current state (Read)
        const currentState = this.topicState[topic] || {};

        // 2. Modify (Deep clone to avoid side effects)
        const newState = { ...currentState, [variableName]: newValue };

        // 3. Write
        const payload = JSON.stringify(newState);
        this.client.publish(topic, payload, { qos: 1, retain: false }, (err: Error | undefined) => {
            if (err) {
                console.error('Publish error:', err);
            } else {
                // console.log(`Published update to ${topic}:`, payload);
                // Optimistically update local state to avoid race conditions
                this.topicState[topic] = newState;
                this.topicTimestamps[topic] = Date.now();
                this.saveStateToStorage();
            }
        });
    }

    publishRaw(topic: string, payload: any) {
        if (!this.client || !this.client.connected) return;
        this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
    }

    disconnect() {
        this.clearOfflineUiDebounce();
        this.unbindVisibilityForStatusSync();
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('af_mqtt_client_id');
        }
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        // Flush any remaining telemetry before disconnecting
        this.flushTelemetryBuffer();
        if (this.client) {
            try {
                this.client.removeAllListeners();
            } catch {
                /* ignore */
            }
            this.client.end(true);
            this.client = null;
            this.topicState = {};
            this.topicCallbacks.clear();
            this.lastErrorMessage = null;
            this.updateStatus('disconnected');
        }
    }

    onStatusChange(callback: StatusCallback): () => void {
        this.onStatusCallbacks.add(callback);
        callback(this.status); // Initial call
        return () => {
            this.onStatusCallbacks.delete(callback);
        };
    }

    private updateStatus(newStatus: 'connected' | 'disconnected' | 'connecting' | 'error') {
        this.status = newStatus;
        this.onStatusCallbacks.forEach(cb => cb(newStatus));
    }

    setMonitoredWidgets(widgets: Widget[]) {
        this.allWidgets = widgets;
        this.monitoredWidgets = widgets.filter(w => w.alarmEnabled);
        this.startFlushTimer();
    }

    private async checkThresholds(topic: string, payload: any) {
        if (!this.monitoredWidgets.length) return;

        const widgetsOnTopic = this.monitoredWidgets.filter(w => w.mqttTopic === topic);

        for (const widget of widgetsOnTopic) {
            const value = payload[widget.variableName];
            if (value === undefined || value === null || typeof value !== 'number') continue;

            let alarmType: 'LOW' | 'HIGH' | null = null;
            let thresholdValue: number = 0;

            if (widget.alarmMax !== undefined && value > widget.alarmMax) {
                alarmType = 'HIGH';
                thresholdValue = widget.alarmMax;
            } else if (widget.alarmMin !== undefined && value < widget.alarmMin) {
                alarmType = 'LOW';
                thresholdValue = widget.alarmMin;
            }

            if (alarmType) {
                if (!this.activeAlarmWidgets.has(widget.id)) {
                    this.activeAlarmWidgets.add(widget.id);
                    await this.triggerAlarm(widget, value, thresholdValue, alarmType);
                }
            } else {
                if (this.activeAlarmWidgets.has(widget.id)) {
                    this.activeAlarmWidgets.delete(widget.id);
                    await this.resolveAlarm(widget.id);
                }
            }
        }
    }

    private async triggerAlarm(widget: Widget, value: number, threshold: number, type: 'LOW' | 'HIGH') {
        // console.log(`ALARM TRIGGERED on ${widget.name}: ${value} (Threshold: ${threshold} ${type})`);
        try {
            await supabase.from('alarms').insert({
                user_id: widget.userId,
                widget_id: widget.id,
                variable_name: widget.variableName,
                trigger_value: value,
                threshold_value: threshold,
                alarm_type: type,
                severity: 'MEDIUM',
                status: 'ACTIVE'
            });
        } catch (err) {
            console.error('Failed to create alarm in DB:', err);
        }
    }

    private async resolveAlarm(widgetId: string) {
        // console.log(`Alarm resolved for widget ${widgetId}`);
        try {
            await supabase.from('alarms')
                .update({ status: 'RESOLVED', resolved_at: new Date().toISOString() })
                .eq('widget_id', widgetId)
                .eq('status', 'ACTIVE');
        } catch (err) {
            console.error('Failed to resolve alarm in DB:', err);
        }
    }
}

export const mqttService = new MQTTService();
