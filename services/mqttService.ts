import mqtt, { MqttClient } from 'mqtt';
import { PLCTelemetry, MqttConfig } from '../types';

type TelemetryCallback = (data: PLCTelemetry) => void;

class MQTTService {
    private client: MqttClient | null = null;
    private config: MqttConfig | null = null;
    private onTelemetryCallback: TelemetryCallback | null = null;

    connect(config: MqttConfig) {
        if (this.client) {
            this.client.end();
        }

        this.config = config;
        console.log('Connecting to MQTT Broker:', config.brokerUrl);

        const options: mqtt.IClientOptions = {
            keepalive: 60,
            clientId: 'webapp_' + Math.random().toString(16).substr(2, 8),
            protocolId: 'MQTT',
            protocolVersion: 4,
            clean: true,
            reconnectPeriod: 1000,
            connectTimeout: 30 * 1000,
            username: config.username,
            password: config.password,
        };

        this.client = mqtt.connect(config.brokerUrl, options);

        this.client.on('connect', () => {
            console.log('MQTT Client Connected');
            this.subscribeToTopics();
        });

        this.client.on('error', (err) => {
            console.error('MQTT Connection Error:', err);
            this.client?.end();
        });

        this.client.on('message', (topic, message) => {
            this.handleMessage(topic, message);
        });
    }

    private subscribeToTopics() {
        if (!this.client || !this.config) return;

        const { telemetry } = this.config.topics;
        this.client.subscribe(telemetry, (err) => {
            if (err) {
                console.error('Subscription error:', err);
            } else {
                console.log(`Subscribed to telemetry: ${telemetry}`);
            }
        });
    }

    private handleMessage(topic: string, message: Buffer) {
        if (!this.config || !this.onTelemetryCallback) return;

        if (topic === this.config.topics.telemetry) {
            try {
                const payload = JSON.parse(message.toString());
                // Validate or map payload to PLCTelemetry if needed
                // For now assuming the PLC sends matching JSON
                this.onTelemetryCallback(payload as PLCTelemetry);
            } catch (e) {
                console.error('Failed to parse telemetry JSON:', e);
            }
        }
    }

    subscribe(callback: TelemetryCallback): () => void {
        this.onTelemetryCallback = callback;
        return () => {
            this.onTelemetryCallback = null;
        };
    }

    publishControl(type: 'setpoint' | 'power', value: string) {
        if (!this.client || !this.client.connected || !this.config) {
            console.error('Cannot publish: MQTT client not connected');
            return;
        }

        const topic = this.config.topics.command;
        const payload = JSON.stringify({
            type,
            value,
            timestamp: Date.now()
        });

        this.client.publish(topic, payload, { qos: 1 }, (err) => {
            if (err) {
                console.error('Publish error:', err);
            } else {
                console.log(`Published command to ${topic}:`, payload);
            }
        });
    }

    disconnect() {
        if (this.client) {
            this.client.end();
            this.client = null;
        }
    }
}

export const mqttService = new MQTTService();
