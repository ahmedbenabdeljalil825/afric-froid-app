const mqtt = require('mqtt');
const HOST = '197.17.5.137';

const tests = [
    { name: 'Custom ClientID', opts: { clientId: 'africfroid_bridge_99' } },
    { name: 'Dummy Username', opts: { clientId: 'africfroid_bridge_99', username: 'testuser' } },
    { name: 'Dummy User+Pass', opts: { clientId: 'africfroid_bridge_99', username: 'admin', password: 'password' } }
];

async function runTests() {
    for (const test of tests) {
        console.log('Testing ' + test.name + '...');
        await new Promise((resolve) => {
            const client = mqtt.connect('mqtt://' + HOST + ':1883', { 
                connectTimeout: 5000,
                ...test.opts
            });
            client.on('connect', () => { console.log('[SUCCESS] Connected!\n'); client.end(); resolve(); });
            client.on('error', (err) => { console.log('[FAILED] ' + err.message + '\n'); client.end(); resolve(); });
            client.on('offline', () => { console.log('[FAILED] offline/timeout\n'); client.end(); resolve(); });
        });
    }
}
runTests();
