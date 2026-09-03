const fs = require('fs');
const path = 'components/WidgetRenderer.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace gradient strings in WIDGET_COLORS to include bg-gradient-to-r
content = content.replace(/gradient: 'from-cyan-500 to-blue-600'/g, "gradient: 'bg-gradient-to-r from-cyan-500 to-blue-600'");
content = content.replace(/gradient: 'from-indigo-500 to-purple-600'/g, "gradient: 'bg-gradient-to-r from-indigo-500 to-purple-600'");
content = content.replace(/gradient: 'from-amber-400 to-orange-500'/g, "gradient: 'bg-gradient-to-r from-amber-400 to-orange-500'");
content = content.replace(/gradient: 'from-emerald-400 to-teal-600'/g, "gradient: 'bg-gradient-to-r from-emerald-400 to-teal-600'");
content = content.replace(/gradient: 'from-red-400 to-rose-600'/g, "gradient: 'bg-gradient-to-r from-red-400 to-rose-600'");

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed missing bg-gradient-to-r in WIDGET_COLORS');
