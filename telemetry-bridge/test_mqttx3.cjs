const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://mqtt.frigoindus.net:1883', { connectTimeout: 5000 });
client.on('connect', () => { console.log('[SUCCESS] Connected anonymously!\n'); client.end(); });
client.on('error', (err) => { console.log('[FAILED] error: ' + err.message + '\n'); client.end(); });
client.on('offline', () => { console.log('[FAILED] offline\n'); client.end(); });
