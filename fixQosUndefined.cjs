const fs = require('fs');
const path = 'services/mqttService.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/\{ qos: this\.topicQos\.get\(targetTopic\) \}/g, "{ qos: this.topicQos.get(targetTopic) || 0 }");

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed undefined TS error for QoS');
