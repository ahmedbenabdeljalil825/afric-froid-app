const fs = require('fs');
const path = 'services/mqttService.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add topicQos map
content = content.replace(/private topicCallbacks = new Map<string, Set<MessageCallback>>\(\);/,
    "private topicCallbacks = new Map<string, Set<MessageCallback>>();\n    private topicQos = new Map<string, 0 | 1 | 2>();");

// 2. Update resubscribeAllTopics
const resubscribeRegex = /topics\.forEach\(\(topic\) => \{\r?\n            this\.client!\.subscribe\(topic, \(err: Error \| null\) => \{\r?\n                if \(err\) console\.error\('\[MQTT\] Subscribe error:', topic, err\);\r?\n            \}\);\r?\n        \}\);/;
const resubscribeReplacement = `topics.forEach((topic) => {
            const qos = this.topicQos.get(topic) || 0;
            this.client!.subscribe(topic, { qos }, (err: Error | null) => {
                if (err) console.error('[MQTT] Subscribe error:', topic, err);
            });
        });`;
content = content.replace(resubscribeRegex, resubscribeReplacement);

// 3. Update subscribe method to store qos
const subscribeRegex = /this\.client\.subscribe\(targetTopic, \{ qos \}, \(err: Error \| null\) => \{/;
const subscribeReplacement = `const currentQos = this.topicQos.get(targetTopic) || 0;
        if (qos > currentQos || !this.topicQos.has(targetTopic)) {
            this.topicQos.set(targetTopic, qos);
        }
        
        // Subscribe the MQTT client to the topic if not already subscribed
        this.client.subscribe(targetTopic, { qos: this.topicQos.get(targetTopic) }, (err: Error | null) => {`;
content = content.replace(subscribeRegex, subscribeReplacement);

fs.writeFileSync(path, content, 'utf8');
console.log('mqttService topicQos updated');
