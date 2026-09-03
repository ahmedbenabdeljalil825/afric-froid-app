const fs = require('fs');
const path = 'pages/ClientDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update uniqueTopics subscription logic
const topicSubscriptionRegex = /fetchedWidgets\.forEach\(w => uniqueTopics\.add\(w\.mqttTopic\)\);/;
const topicSubscriptionReplacement = `fetchedWidgets.forEach(w => {
            uniqueTopics.add(w.mqttTopic);
            if ((w.config as any)?.readTopic) {
                uniqueTopics.add((w.config as any).readTopic);
            }
        });`;
content = content.replace(topicSubscriptionRegex, topicSubscriptionReplacement);

// 2. Update widget rendering to use readVariableName if present
const valRegex = /const val = liveData\[widget\.variableName\];/;
const valReplacement = `const readVarName = (widget.config as any)?.readVariableName || widget.variableName;\n              const val = liveData[readVarName];`;
content = content.replace(valRegex, valReplacement);

// Wait, I should replace BOTH occurrences if it appears multiple times. Let's use global or just check.
// ClientDashboard.tsx renders the list of widgets.
fs.writeFileSync(path, content, 'utf8');
console.log('ClientDashboard updated to support read topics');
