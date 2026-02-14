import { PLCTelemetry } from '../types';

// This service simulates the MQTT connection for the demo
class MockMqttService {
  private subscribers: ((data: PLCTelemetry) => void)[] = [];
  private intervalId: number | null = null;
  private currentData: PLCTelemetry = {
    temperature: -4.5,
    setpoint: -5.0,
    pressure: 120,
    powerUsage: 3.2,
    status: 'RUNNING',
    timestamp: Date.now()
  };

  connect() {
    console.log('Connecting to MQTT broker...');
    // Simulate incoming data stream
    this.intervalId = window.setInterval(() => {
      this.simulateDataChange();
      this.notifySubscribers();
    }, 2000);
  }

  disconnect() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  subscribe(callback: (data: PLCTelemetry) => void) {
    this.subscribers.push(callback);
    // Send immediate initial data
    callback(this.currentData);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // Simulate remote control command
  publishControl(topic: string, value: any) {
    console.log(`[MQTT] Published to ${topic}:`, value);
    
    // Optimistic UI update simulation
    if (topic === 'setpoint') {
      this.currentData.setpoint = parseFloat(value);
    } else if (topic === 'power') {
      this.currentData.status = value === 'ON' ? 'RUNNING' : 'IDLE';
    }
    this.notifySubscribers();
  }

  private simulateDataChange() {
    // Random walk for simulation
    const tempChange = (Math.random() - 0.5) * 0.5;
    const pressChange = (Math.random() - 0.5) * 2;
    
    this.currentData = {
      ...this.currentData,
      temperature: Number((this.currentData.temperature + tempChange).toFixed(1)),
      pressure: Number((this.currentData.pressure + pressChange).toFixed(0)),
      timestamp: Date.now(),
      // Simulate system reacting to setpoint
      status: this.currentData.temperature > this.currentData.setpoint + 2 ? 'RUNNING' : 
              (this.currentData.temperature < this.currentData.setpoint - 1 ? 'IDLE' : this.currentData.status)
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.currentData));
  }
}

export const mqttService = new MockMqttService();
