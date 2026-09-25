const mqtt = require('mqtt');
async function runTests() {
    console.log('Testing WebSocket on raw IP with Auth...');
    await new Promise((resolve) => {
        const client = mqtt.connect('ws://197.17.5.137:9001/ws', { 
            connectTimeout: 5000,
            username: 'affitt',
            password: 'AFFI!2026'
        });
        client.on('connect', () => { console.log('[SUCCESS] Connected to raw IP!\n'); client.end(); resolve(); });
        client.on('error', (err) => { console.log('[FAILED] error: ' + err.message + '\n'); client.end(); resolve(); });
        client.on('offline', () => { console.log('[FAILED] offline\n'); client.end(); resolve(); });
    });
}
runTests();
