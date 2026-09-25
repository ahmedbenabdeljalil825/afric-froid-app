const mqtt = require('mqtt');

async function runTests() {
    console.log('Testing TCP (1883) with Auth via Domain...');
    await new Promise((resolve) => {
        const client = mqtt.connect('mqtt://mqtt.frigoindus.net:1883', { 
            connectTimeout: 5000,
            username: 'affitt',
            password: 'AFFI!2026'
        });
        client.on('connect', () => { console.log('[SUCCESS] Connected to 1883!\n'); client.end(); resolve(); });
        client.on('error', (err) => { console.log('[FAILED] error: ' + err.message + '\n'); client.end(); resolve(); });
        client.on('offline', () => { console.log('[FAILED] offline\n'); client.end(); resolve(); });
    });
}
runTests();
