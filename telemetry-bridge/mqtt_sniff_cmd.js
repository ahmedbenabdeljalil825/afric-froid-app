import mqtt from 'mqtt';
const client = mqtt.connect('mqtt://broker.emqx.io:1883');
client.on('connect', () => {
    console.log('Connected to EMQX, sniffing commands...');
    client.subscribe('africfroid/machine1/Gcontrol');
});
client.on('message', (topic, message) => {
    console.log('[EMQX] [' + topic + '] ' + message.toString());
});
