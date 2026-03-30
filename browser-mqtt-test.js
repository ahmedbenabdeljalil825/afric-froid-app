/**
 * MQTT Browser Connectivity Test
 * Paste this entire script into the browser Developer Console (F12 > Console)
 * while the app is open at http://localhost:3000
 *
 * It will:
 * 1. Connect to the public HiveMQ WebSocket broker
 * 2. Subscribe to the telemetry topic
 * 3. Display live incoming messages
 * 4. Send a test command (setpoint change)
 */

(async () => {
  // Load mqtt.js from CDN if not available
  if (typeof mqtt === 'undefined') {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/mqtt/dist/mqtt.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    console.log('✅ mqtt.js loaded from CDN');
  }

  const BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
  const TOPIC = 'afric-froid/simulator/telemetry';
  const clientId = 'browser_test_' + Math.random().toString(16).slice(2, 8);

  console.log('%c🔌 MQTT BROWSER CONNECTIVITY TEST', 'font-size:16px; font-weight:bold; color:#0ea5e9;');
  console.log(`Broker : ${BROKER_URL}`);
  console.log(`Topic  : ${TOPIC}`);
  console.log(`Client : ${clientId}`);
  console.log('');

  const client = mqtt.connect(BROKER_URL, {
    clientId,
    clean: true,
    connectTimeout: 10000,
    protocolVersion: 5,
  });

  let msgCount = 0;

  client.on('connect', () => {
    console.log('%c✅ CONNECTED to broker!', 'color:green; font-weight:bold;');
    client.subscribe(TOPIC, { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Subscription failed:', err);
      } else {
        console.log('%c✅ SUBSCRIBED to topic. Waiting for simulator messages...', 'color:green;');
        console.log('   (Make sure mqtt-simulator.js is running in terminal)\n');
      }
    });
  });

  client.on('message', (topic, payload) => {
    msgCount++;
    try {
      const data = JSON.parse(payload.toString());
      console.log(`%c📡 Message #${msgCount}:`, 'color:#f59e0b; font-weight:bold;', {
        temperature: `${data.temperature}°C`,
        humidity: `${data.humidity}%`,
        status: data.status,
        setpoint: `${data.setpoint}°C`,
        compressorActive: data.compressorActive,
        alarms: data.alarms,
      });

      if (msgCount === 3) {
        console.log('%c\n📤 Sending test command: setpoint=12', 'color:#a855f7; font-weight:bold;');
        const cmd = JSON.stringify({ setpoint: 12 });
        client.publish(TOPIC, cmd, { qos: 1 }, () => {
          console.log('%c✅ Command sent! Simulator should acknowledge it.', 'color:green;');
        });
      }

      if (msgCount >= 6) {
        console.log('%c\n🎉 TEST COMPLETE - MQTT IS FULLY WORKING IN THE BROWSER!', 
          'font-size:14px; color:green; font-weight:bold;');
        client.end();
      }
    } catch(e) {
      console.log('Raw payload:', payload.toString());
    }
  });

  client.on('error', (err) => {
    console.error('%c❌ Connection error:', 'color:red; font-weight:bold;', err.message);
  });

  // Cleanup after 30s
  setTimeout(() => {
    if (msgCount === 0) {
      console.error('%c❌ No messages received in 30s. Check if simulator is running.', 'color:red;');
    }
    client.end();
  }, 30000);

  window._mqttTestClient = client;
  console.log('💡 Tip: window._mqttTestClient = client instance (call .end() to disconnect)');
})();
