const fs = require('fs');
const path = 'services/mqttService.ts';
let content = fs.readFileSync(path, 'utf8');

// Update publishVariableUpdate signature
content = content.replace(/publishVariableUpdate\(topic: string, variableName: string, newValue: any\)/g, 
  "publishVariableUpdate(topic: string, variableName: string, newValue: any, qos: 0 | 1 | 2 = 0, retain: boolean = false)");

content = content.replace(/this\.client\.publish\(topic, payload, \{ qos: 0, retain: false \}, \(err: Error \| undefined\) => \{/g,
  "this.client.publish(topic, payload, { qos, retain }, (err: Error | undefined) => {");

// Update subscribe signature
content = content.replace(/subscribe\(callback: MessageCallback, topic\?: string\): \(\) => void \{/g,
  "subscribe(callback: MessageCallback, topic?: string, qos: 0 | 1 | 2 = 0): () => void {");

content = content.replace(/this\.client\.subscribe\(targetTopic, \(err: Error \| null\) => \{/g,
  "this.client.subscribe(targetTopic, { qos }, (err: Error | null) => {");

fs.writeFileSync(path, content, 'utf8');
console.log('mqttService updated');
