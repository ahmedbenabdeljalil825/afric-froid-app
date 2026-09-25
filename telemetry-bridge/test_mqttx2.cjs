const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://mqtt.frigoindus.net:1883', { connectTimeout: 5000, username: 'admin', password: 'AFFI!2026' });
client.on('connect', () => { console.log('[SUCCESS] Connected with admin!\n'); client.end(); });
client.on('error', (err) => { console.log('[FAILED] error: ' + err.message + '\n'); client.end(); });
client.on('offline', () => { console.log('[FAILED] offline\n'); client.end(); });
