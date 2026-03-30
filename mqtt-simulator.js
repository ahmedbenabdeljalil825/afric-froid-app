import mqtt from 'mqtt';

// Use standard unencrypted TCP connection for the Node.js script.
// The browser app will connect using WebSockets via wss://broker.hivemq.com:8000/mqtt
const brokerUrl = 'mqtt://broker.hivemq.com:1883';
const telemetryTopic = 'afric-froid/simulator/telemetry';
const commandTopic = 'afric-froid/simulator/command'; // Though publishVariableUpdate uses telemetryTopic directly by default

const clientId = 'simulator_' + Math.random().toString(16).substring(2, 8);

console.log(`📡 Connecting to MQTT broker at ${brokerUrl} with ID ${clientId}...`);
const client = mqtt.connect(brokerUrl, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});

// Initial state
let compressorState = false;
let setpoint = 5;
let systemStatus = 'RUNNING';

client.on('connect', () => {
  console.log('✅ Connected to broker!');
  
  client.subscribe(telemetryTopic, (err) => {
      if (!err) console.log(`👂 Listening for commands/updates on topic: ${telemetryTopic}`);
  });

  console.log(`📤 Starting telemetry publishing to topic: ${telemetryTopic}`);
  setInterval(publishTelemetry, 3000);
  publishTelemetry();
});

client.on('message', (topic, message) => {
  if (topic === telemetryTopic || topic === commandTopic) {
    try {
      const payload = JSON.parse(message.toString());
      
      let changed = false;
      // App overrides send flat changes, e.g. { setpoint: 4 }
      if (payload.setpoint !== undefined && payload.setpoint !== setpoint) {
          setpoint = Number(payload.setpoint);
          console.log(`\n📥 => Setpoint changed to: ${setpoint}°C`);
          changed = true;
      }
      if (payload.status !== undefined && payload.status !== systemStatus) {
          systemStatus = payload.status;
          console.log(`\n📥 => System Power changed to: ${systemStatus}`);
          changed = true;
      }
      
      if (changed) {
          publishTelemetry();
      }
    } catch (e) {
      // Ignore
    }
  }
});

client.on('error', (err) => {
  console.error('Connection error:', err);
});

function publishTelemetry() {
  if (!client.connected) return;

  const telemetryData = {
    timestamp: new Date().toISOString(),
    temperature: parseFloat((20 + (Math.random() * 5 - 2.5)).toFixed(1)),
    humidity: parseFloat((50 + (Math.random() * 10 - 5)).toFixed(1)),
    compressorActive: systemStatus === 'RUNNING',
    setpoint: setpoint,
    status: systemStatus,
    alarms: Math.random() > 0.95 ? 1 : 0,
    voltage: parseFloat((220 + (Math.random() * 10 - 5)).toFixed(1)),
    current: systemStatus === 'RUNNING' ? parseFloat((5 + Math.random()).toFixed(2)) : 0.00
  };

  const payloadString = JSON.stringify(telemetryData);
  client.publish(telemetryTopic, payloadString, { qos: 1 });
}
