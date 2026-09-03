const fs = require('fs');
const path = 'components/WidgetRenderer.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace `mqttService.publishVariableUpdate(pubTopic, pubVar, ...)` with `mqttService.publishVariableUpdate(pubTopic, pubVar, ..., widget.qos, widget.retain)`
// This occurs in Button, Toggle, Slider, TextInput, NumberInput, ComboBox, RadioButtons.

content = content.replace(/mqttService\.publishVariableUpdate\(pubTopic, pubVar, targetPayload\);/g,
    "mqttService.publishVariableUpdate(pubTopic, pubVar, targetPayload, widget.qos || 0, widget.retain || false);");

content = content.replace(/mqttService\.publishVariableUpdate\(pubTopic, pubVar, val\);/g,
    "mqttService.publishVariableUpdate(pubTopic, pubVar, val, widget.qos || 0, widget.retain || false);");

content = content.replace(/mqttService\.publishVariableUpdate\(pubTopic, pubVar, Number\(val\)\);/g,
    "mqttService.publishVariableUpdate(pubTopic, pubVar, Number(val), widget.qos || 0, widget.retain || false);");

fs.writeFileSync(path, content, 'utf8');
console.log('WidgetRenderer updated for Publish QoS/Retain');
