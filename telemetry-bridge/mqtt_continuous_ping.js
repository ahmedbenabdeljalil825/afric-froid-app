import mqtt from 'mqtt';
const client = mqtt.connect('mqtt://broker.emqx.io:1883');
client.on('connect', () => {
    console.log('Connected to EMQX. Pinging continuously...');
    setInterval(() => {
        const payload = '{\n  "Remote_blocking": true\n}';
        client.publish('africfroid/machine1/Gcontrol', payload);
        console.log('Published: ' + payload.replace(/\n/g, ' '));
    }, 2000);
});
