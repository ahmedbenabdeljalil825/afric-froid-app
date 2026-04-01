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
    private monitoredWidgets: Widget[] = [];
    private activeAlarmWidgets: Set<string> = new Set();
    private readonly STORAGE_KEY = 'af_mqtt_state';
    public status: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected';

    constructor() {
        this.loadStateFromStorage();
    }

    private loadStateFromStorage() {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.topicState = JSON.parse(saved);
            }
        } catch (e) {
            console.error('[MQTT] Failed to load state from storage:', e);
        }
    }

    private saveStateToStorage() {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.topicState));
        } catch (e) {
            console.error('[MQTT] Failed to save state to storage:', e);
        }
    }

    public getCurrentState() {
        return JSON.parse(JSON.stringify(this.topicState));
    }

    connect(config: MqttConfig) {
        if (this.client) {
            this.client.end();
        }

        this.updateStatus('connecting');
        this.config = config;
        // console.log('Connecting to MQTT Broker:', config.brokerUrl);

        const options: mqtt.IClientOptions = {
            keepalive: 60,
            clientId: 'webapp_' + Math.random().toString(16).substr(2, 8),
            protocolId: 'MQTT',
            protocolVersion: 4,
            clean: true,
            reconnectPeriod: 1000,
            connectTimeout: 30 * 1000,
        };

        if (config.username) options.username = config.username;
        if (config.password) options.password = config.password;

        this.client = mqtt.connect(config.brokerUrl, options);

        this.client.on('connect', () => {
            console.log(`[MQTT] Connected successfully to ${config.brokerUrl}`);
            this.updateStatus('connected');
            this.subscribeToInitialTopics();
        });

        this.client.on('error', (err: Error) => {
            console.error('[MQTT] Connection Error:', err);
            this.updateStatus('error');
        });

        this.client.on('offline', () => {
            console.warn('[MQTT] Client went offline');
            this.updateStatus('disconnected');
        });

        this.client.on('reconnect', () => {
            console.log(`[MQTT] Attempting to reconnect to ${config.brokerUrl}...`);
            this.updateStatus('connecting');
        });

        this.client.on('close', () => {
            console.warn('[MQTT] Connection closed');
        });

        this.client.on('disconnect', (packet) => {
            console.warn('[MQTT] Disconnect packet received from broker:', packet);
        });

        this.client.on('message', (topic: string, message: Buffer) => {
            this.handleMessage(topic, message);
        });
    }

    private subscribeToInitialTopics() {
        if (!this.client || !this.config) return;

        // Default telemetry topic from config
        const { telemetry } = this.config.topics;
        this.client.subscribe(telemetry, (err) => {
            if (err) console.error('Subscription error:', err);
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
        try {
            const payload = JSON.parse(message.toString());

            // Store locally for future "Read-Modify-Write" operations
            this.topicState[topic] = payload;
            this.saveStateToStorage();

            // Check for alarms
            this.checkThresholds(topic, payload);

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
                this.saveStateToStorage();
            }
        });
    }

    publishRaw(topic: string, payload: any) {
        if (!this.client || !this.client.connected) return;
        this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
    }

    disconnect() {
        if (this.client) {
            this.client.end();
            this.client = null;
            this.topicState = {};
            this.topicCallbacks.clear();
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
        this.monitoredWidgets = widgets.filter(w => w.alarmEnabled);
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
