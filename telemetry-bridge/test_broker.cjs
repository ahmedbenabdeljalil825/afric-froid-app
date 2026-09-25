const mqtt = require('mqtt');
const HOST = '197.17.5.137';

const tests = [
    { name: 'TCP (1883)', url: 'mqtt://' + HOST + ':1883' },
    { name: 'TLS (8883)', url: 'mqtts://' + HOST + ':8883', opts: { rejectUnauthorized: false } },
    { name: 'WebSocket (9001)', url: 'ws://' + HOST + ':9001' }
];

async function runTests() {
    console.log('--- STARTING BROKER PORT TESTS ---');
    for (const test of tests) {
        console.log('Testing ' + test.name + ' -> ' + test.url + '...');
        await new Promise((resolve) => {
            const client = mqtt.connect(test.url, { 
                connectTimeout: 5000,
                ...test.opts
            });
            
            client.on('connect', () => {
                console.log('[SUCCESS] ' + test.name + ' is OPEN and ACCEPTING connections!\n');
                client.end();
                resolve();
            });
            
            client.on('error', (err) => {
                console.log('[FAILED] ' + test.name + ' threw an error: ' + err.message + '\n');
                client.end();
                resolve();
            });

            client.on('offline', () => {
                console.log('[FAILED] ' + test.name + ' went offline / unreachable.\n');
                client.end();
                resolve();
            });
        });
    }
    console.log('--- ALL TESTS COMPLETE ---');
}

runTests();
