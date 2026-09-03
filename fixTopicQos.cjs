const fs = require('fs');
const path = 'services/mqttService.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/private topicCallbacks: Map<string, Set<MessageCallback>> = new Map\(\);/,
    "private topicCallbacks: Map<string, Set<MessageCallback>> = new Map();\n    private topicQos: Map<string, 0 | 1 | 2> = new Map();");

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed missing property topicQos');
