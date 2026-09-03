const fs = require('fs');
const path = 'pages/ClientDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace Set logic with Map logic to support QoS
const subscribeRegex = /\/\/ Subscribe to all unique topics used by widgets\r?\n        const uniqueTopics = new Set<string>\(\);\r?\n        fetchedWidgets\.forEach\(w => \{\r?\n            uniqueTopics\.add\(w\.mqttTopic\);\r?\n            if \(\(w\.config as any\)\?\.readTopic\) \{\r?\n                uniqueTopics\.add\(\(w\.config as any\)\.readTopic\);\r?\n            \}\r?\n        \}\);\r?\n\r?\n        \/\/ Also add global telemetry if not in widgets\r?\n        if \(user\.mqttConfig\?\.topics\.telemetry\) \{\r?\n          uniqueTopics\.add\(user\.mqttConfig\.topics\.telemetry\);\r?\n        \}\r?\n\r?\n        uniqueTopics\.forEach\(topic => \{\r?\n          const unsub = mqttService\.subscribe\(\(data: any\) => \{\r?\n            setLiveData\(prev => \(\{ \.\.\.prev, \.\.\.data \}\)\);\r?\n          \}, topic\);\r?\n          activeSubscriptions\.push\(unsub\);\r?\n        \}\);/;

const subscribeReplacement = `// Subscribe to all unique topics and resolve maximum QoS for each
        const uniqueTopicsMap = new Map<string, number>();
        
        const addTopic = (topic: string, qos: number) => {
            if (!uniqueTopicsMap.has(topic) || uniqueTopicsMap.get(topic)! < qos) {
                uniqueTopicsMap.set(topic, qos);
            }
        };

        fetchedWidgets.forEach(w => {
            addTopic(w.mqttTopic, w.qos || 0);
            if ((w.config as any)?.readTopic) {
                addTopic((w.config as any).readTopic, (w.config as any)?.readQos || 0);
            }
        });

        if (user.mqttConfig?.topics.telemetry) {
          addTopic(user.mqttConfig.topics.telemetry, 0);
        }

        uniqueTopicsMap.forEach((qos, topic) => {
          const unsub = mqttService.subscribe((data: any) => {
            setLiveData(prev => ({ ...prev, ...data }));
          }, topic, qos as 0|1|2);
          activeSubscriptions.push(unsub);
        });`;

content = content.replace(subscribeRegex, subscribeReplacement);
fs.writeFileSync(path, content, 'utf8');
console.log('ClientDashboard QoS updated');
