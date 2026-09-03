const fs = require('fs');
const path = 'components/WidgetRenderer.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex1 = /const actualIsOn = parseValue\(currentValue\);/;
const replacement1 = `const activeLabel = (widget.config as any)?.activeLabel || t.on;\n    const inactiveLabel = (widget.config as any)?.inactiveLabel || t.off;\n    const actualIsOn = parseValue(currentValue);`;

content = content.replace(regex1, replacement1);

const regex2 = /ACTUAL: \{actualIsOn \? t\.on\.toUpperCase\(\) : t\.off\.toUpperCase\(\)\}/;
const replacement2 = `ACTUAL: {actualIsOn ? activeLabel.toUpperCase() : inactiveLabel.toUpperCase()}`;
content = content.replace(regex2, replacement2);

fs.writeFileSync(path, content, 'utf8');
console.log('ToggleWidget labels updated.');
