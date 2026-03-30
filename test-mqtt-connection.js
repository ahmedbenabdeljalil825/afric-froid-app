/**
 * MQTT Connectivity Verification Script
 * Tests bidirectional communication on the public HiveMQ broker.
 * 
 * Run with: node test-mqtt-connection.js
 */
import mqtt from 'mqtt';

const BROKER_URL = 'mqtt://broker.hivemq.com:1883';
const TELEMETRY_TOPIC = 'afric-froid/simulator/telemetry';

const testClientId = 'test_verifier_' + Math.random().toString(16).substring(2, 8);
let receivedMessages = 0;
let testPassed = false;

console.log('='.repeat(55));
console.log('  AFRIC-FROID MQTT CONNECTIVITY VERIFICATION TEST');
console.log('='.repeat(55));
console.log(`\n📡 Broker   : ${BROKER_URL}`);
console.log(`📬 Topic    : ${TELEMETRY_TOPIC}`);
console.log(`🔑 Client ID: ${testClientId}`);
console.log('\n⏳ Connecting...\n');

const client = mqtt.connect(BROKER_URL, {
  clientId: testClientId,
  clean: true,
  connectTimeout: 8000,
  reconnectPeriod: 0, // No reconnect for test
});

client.on('connect', () => {
  console.log('✅ [1/3] BROKER CONNECTION - SUCCESS');
  console.log('         Connected to HiveMQ public broker.\n');

  client.subscribe(TELEMETRY_TOPIC, { qos: 1 }, (err, granted) => {
    if (err) {
      console.error('❌ [2/3] TOPIC SUBSCRIPTION - FAILED:', err.message);
      client.end();
      process.exit(1);
    } else {
      console.log(`✅ [2/3] TOPIC SUBSCRIPTION - SUCCESS`);
      console.log(`         Subscribed to topic: ${granted[0].topic} (QoS ${granted[0].qos})\n`);
      console.log('⏳ [3/3] LIVE DATA RECEPTION - Waiting 15s for simulator messages...');
      console.log('         (Make sure node mqtt-simulator.js is running in another terminal)\n');
    }
  });
});

client.on('message', (topic, message) => {
  receivedMessages++;
  try {
    const data = JSON.parse(message.toString());

    if (receivedMessages === 1) {
      console.log('✅ [3/3] LIVE DATA RECEPTION - SUCCESS');
      console.log('         First message received!\n');
      console.log('  📊 Telemetry Payload:');
      Object.entries(data).forEach(([key, val]) => {
        console.log(`     ${key.padEnd(20)}: ${val}`);
      });
      console.log('');
      testPassed = true;
    } else {
      // Show updates compactly
      const tempStr = data.temperature ? `${data.temperature}°C` : 'N/A';
      const statusStr = data.status || 'N/A';
      const spStr = data.setpoint !== undefined ? `${data.setpoint}°C` : 'N/A';
      process.stdout.write(`\r  📡 Live Update #${receivedMessages}: temp=${tempStr}, status=${statusStr}, setpoint=${spStr}    `);
    }
  } catch (e) {
    console.log(`  📨 Raw message #${receivedMessages}: ${message.toString().substring(0, 80)}`);
  }
});

client.on('error', (err) => {
  console.error('❌ BROKER CONNECTION - FAILED');
  console.error('   Error:', err.message);
});

// Timeout after 20 seconds
setTimeout(() => {
  console.log('\n\n' + '='.repeat(55));
  if (testPassed) {
    console.log('  🎉 ALL TESTS PASSED!');
    console.log(`     Received ${receivedMessages} live telemetry messages.`);
    console.log('     MQTT Connection: ✅ VERIFIED');
    console.log('     Live Streaming : ✅ VERIFIED');
    console.log('     Browser app should display live data when widgets are configured.');
  } else {
    console.log('  ❌ TEST FAILED: No messages received in 20 seconds.');
    console.log('     Possible causes:');
    console.log('     1. mqtt-simulator.js is not running (run it in another terminal)');
    console.log('     2. Broker is unreachable');
    console.log('     3. Topic mismatch');
  }
  console.log('='.repeat(55) + '\n');
  client.end();
  process.exit(testPassed ? 0 : 1);
}, 20000);
