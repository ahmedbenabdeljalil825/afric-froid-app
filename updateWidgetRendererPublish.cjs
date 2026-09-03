const fs = require('fs');
const path = 'components/WidgetRenderer.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the helper functions
const getPublishTopicRegex = /const getPublishTopic = \(widget: Widget\) => \(widget\.config as any\)\?\.publishTopic \|\| widget\.mqttTopic;\r?\nconst getPublishVar = \(widget: Widget\) => \(widget\.config as any\)\?\.publishVariableName \|\| widget\.variableName;/;
content = content.replace(getPublishTopicRegex, "const getPublishTopic = (widget: Widget) => widget.mqttTopic;\nconst getPublishVar = (widget: Widget) => widget.variableName;");

// Also replace readTopic / readVariableName if they accidentally crept in, or publishTopic
content = content.replace(/publishTopic/g, "readTopic");
content = content.replace(/publishVariableName/g, "readVariableName");

fs.writeFileSync(path, content, 'utf8');
console.log('WidgetRenderer updated for Publish logic');
