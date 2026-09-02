import mqtt from 'mqtt';

const BROKER_URL = 'ws://mqts.frigoindus.net:9001/mqtt';
const USERNAME = 'affimqtt1';
const PASSWORD = 'Lmx54!s@';

console.log('Testing MQTT Connection with provided credentials...');
console.log(`URL: ${BROKER_URL}`);
console.log(`User: ${USERNAME}`);
console.log(`Pass: ${PASSWORD}`);

const client = mqtt.connect(BROKER_URL, {
  username: USERNAME,
  password: PASSWORD,
  connectTimeout: 5000,
  reconnectPeriod: 0,
});

client.on('connect', () => {
  console.log('✅ Connected successfully!');
  client.end();
});

client.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
  client.end();
});

client.on('close', () => {
    console.log('Connection closed.');
});

setTimeout(() => {
    console.log('Test timed out.');
    client.end();
}, 6000);
