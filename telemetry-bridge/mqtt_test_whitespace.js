import mqtt from 'mqtt';
const client = mqtt.connect('mqtt://broker.emqx.io:1883');
const delay = ms => new Promise(res => setTimeout(res, ms));

client.on('connect', async () => {
    console.log('Connected to EMQX. Firing multiline/spaced payloads...');
    const topic = 'africfroid/machine1/Gcontrol';
    
    console.log('Sending Test 1: EXACT match from screenshot (boolean)');
    client.publish(topic, '{\n  "Remote_blocking": true\n}');
    await delay(3000);
    
    console.log('Sending Test 2: EXACT match from screenshot (number 1)');
    client.publish(topic, '{\n  "Remote_blocking": 1\n}');
    await delay(3000);
    
    console.log('Sending Test 3: EXACT match from screenshot (TRUE)');
    client.publish(topic, '{\n  "Remote_blocking": TRUE\n}');
    await delay(3000);
    
    console.log('Sending Test 4: EXACT match with quotes ("TRUE")');
    client.publish(topic, '{\n  "Remote_blocking": "TRUE"\n}');
    await delay(3000);

    console.log('Done testing.');
    client.end();
});
