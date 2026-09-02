import mqtt from 'mqtt';
const client = mqtt.connect('mqtt://broker.emqx.io:1883');
const delay = ms => new Promise(res => setTimeout(res, ms));

client.on('connect', async () => {
    console.log('Connected to EMQX. Firing test payloads...');
    const topic = 'africfroid/machine1/Gcontrol';
    
    console.log('Sending Test 1: Number 1');
    client.publish(topic, JSON.stringify({ Remote_blocking: 1 }));
    await delay(3000);
    
    console.log('Sending Test 2: String "1"');
    client.publish(topic, JSON.stringify({ Remote_blocking: "1" }));
    await delay(3000);
    
    console.log('Sending Test 3: String "TRUE"');
    client.publish(topic, JSON.stringify({ Remote_blocking: "TRUE" }));
    await delay(3000);
    
    console.log('Sending Test 4: String "True"');
    client.publish(topic, JSON.stringify({ Remote_blocking: "True" }));
    await delay(3000);

    console.log('Sending Test 5: Lowercase boolean true');
    client.publish(topic, JSON.stringify({ Remote_blocking: true }));
    await delay(3000);

    console.log('Sending Test 6: Uppercase boolean TRUE (unquoted)');
    client.publish(topic, '{"Remote_blocking": TRUE}');
    await delay(3000);

    console.log('Done testing.');
    client.end();
});
