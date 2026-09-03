const fs = require('fs');
const path = 'components/WidgetRenderer.tsx';
let content = fs.readFileSync(path, 'utf8');

const tooltipRegex = /function mqttTopicVariableTooltip\(t: Translation, widget: Pick<Widget, 'mqttTopic' \| 'variableName'>\): string \{\r?\n    let s = `\$\{t\.widgetConfigTopic\}: \$\{widget\.mqttTopic\}`;\r?\n    if \(widget\.variableName\) s \+= `\\n\$\{t\.widgetConfigVariable\}: \$\{widget\.variableName\}`;\r?\n    return s;\r?\n\}/;
const tooltipReplacement = `function mqttTopicVariableTooltip(t: Translation, widget: Pick<Widget, 'mqttTopic' | 'variableName' | 'category' | 'config'>): string {
    let s = \`\${t.widgetConfigTopic}: \${widget.mqttTopic}\`;
    if (widget.variableName) s += \`\\n\${t.widgetConfigVariable}: \${widget.variableName}\`;
    
    const config = widget.config as any;
    if (widget.category === 'CONTROLLING' && (config?.readTopic || config?.readVariableName)) {
        s += \`\\n\\n-- READ (SUBSCRIBE) --\`;
        if (config.readTopic) s += \`\\n\${t.widgetConfigTopic}: \${config.readTopic}\`;
        if (config.readVariableName) s += \`\\n\${t.widgetConfigVariable}: \${config.readVariableName}\`;
    }
    
    return s;
}`;

content = content.replace(tooltipRegex, tooltipReplacement);

// Also need to update the types where `Pick<Widget, 'mqttTopic' | 'variableName'>` is used in the usages to just `Widget` because we need `category` and `config`.
// Wait, in all usages, `widget` is passed natively! e.g., `content={mqttTopicVariableTooltip(t, widget)}`. So we can just change the signature!
// BUT the original signature is `widget: Pick<Widget, 'mqttTopic' | 'variableName'>`.
// Changing to `widget: Widget` is much easier.

content = content.replace(/widget: Pick<Widget, 'mqttTopic' \| 'variableName'>/, 'widget: Widget');

fs.writeFileSync(path, content, 'utf8');
console.log('Tooltip updated');
