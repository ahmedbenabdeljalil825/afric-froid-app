const mqtt = require('mqtt');
const HOST = '197.17.5.137';

async function runTests() {
    console.log('Testing WebSocket without Auth (path /mqtt)...');
    await new Promise((resolve) => {
        const client = mqtt.connect('ws://' + HOST + ':9001/mqtt', { 
            connectTimeout: 5000,
            wsOptions: { headers: { Host: 'mqtt.frigoindus.net' } }
        });
        client.on('connect', () => { console.log('[SUCCESS] WS CONNECTED!!!\n'); client.end(); resolve(); });
        client.on('error', (err) => { console.log('[FAILED] error: ' + err.message + '\n'); client.end(); resolve(); });
        client.on('offline', () => { console.log('[FAILED] offline\n'); client.end(); resolve(); });
    });
}
runTests();
