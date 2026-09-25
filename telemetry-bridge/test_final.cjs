const mqtt = require('mqtt');
const HOST = '197.17.5.137';

async function runTests() {
    console.log('Testing WebSocket with correct Auth and Path...');
    await new Promise((resolve) => {
        const client = mqtt.connect('ws://' + HOST + ':9001/ws', { 
            connectTimeout: 5000,
            username: 'affitt',
            password: 'AFFI!2026',
            wsOptions: { headers: { Host: 'mqtt.frigoindus.net' } }
        });
        client.on('connect', () => { console.log('[SUCCESS] We are CONNECTED!!!\n'); client.end(); resolve(); });
        client.on('error', (err) => { console.log('[FAILED] error: ' + err.message + '\n'); client.end(); resolve(); });
        client.on('offline', () => { console.log('[FAILED] offline\n'); client.end(); resolve(); });
    });
}
runTests();
