import mqtt from 'mqtt';
const client = mqtt.connect('mqtt://broker.hivemq.com:1883');
client.on('connect', () => {
    console.log('Connected to HiveMQ, sniffing africfroid/# ...');
    client.subscribe('africfroid/#');
});
client.on('message', (topic, message) => {
    console.log('[' + topic + '] ' + message.toString());
});
setTimeout(() => { client.end(); process.exit(0); }, 5000);
