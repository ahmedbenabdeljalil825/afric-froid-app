const mqtt = require('mqtt');
const HOST = '197.17.5.137';

const tests = [
    { name: 'TCP (1883) v3.1.1', url: 'mqtt://' + HOST + ':1883', opts: { protocolVersion: 4 } },
    { name: 'TCP (1883) v5.0', url: 'mqtt://' + HOST + ':1883', opts: { protocolVersion: 5 } }
];

async function runTests() {
    for (const test of tests) {
        console.log('Testing ' + test.name + '...');
        await new Promise((resolve) => {
            const client = mqtt.connect(test.url, { 
                connectTimeout: 5000,
                ...test.opts
            });
            client.on('connect', () => { console.log('[SUCCESS]\n'); client.end(); resolve(); });
            client.on('error', (err) => { console.log('[FAILED] ' + err.message + '\n'); client.end(); resolve(); });
            client.on('offline', () => { console.log('[FAILED] offline\n'); client.end(); resolve(); });
        });
    }
}
runTests();
