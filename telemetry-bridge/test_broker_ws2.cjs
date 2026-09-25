const mqtt = require('mqtt');
const HOST = '197.17.5.137';

async function runTests() {
    console.log('Testing WebSocket (9001) with Host header...');
    await new Promise((resolve) => {
        const client = mqtt.connect('ws://' + HOST + ':9001', { 
            connectTimeout: 5000,
            clientId: 'web_client_99',
            wsOptions: {
                headers: {
                    Host: 'mqtt.frigoindus.net'
                }
            }
        });
        client.on('connect', () => { console.log('[SUCCESS] WS Connected!\n'); client.end(); resolve(); });
        client.on('error', (err) => { console.log('[FAILED] WS error: ' + err.message + '\n'); client.end(); resolve(); });
        client.on('offline', () => { console.log('[FAILED] WS offline/timeout\n'); client.end(); resolve(); });
    });
}
runTests();
