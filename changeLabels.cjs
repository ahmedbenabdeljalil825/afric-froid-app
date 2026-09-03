const fs = require('fs');
const path = 'pages/AdminUserDesigner.tsx';
let content = fs.readFileSync(path, 'utf8');

// Change the title of the gray box from "Write (Publish) Configuration" to "Read (Subscribe) Configuration"
content = content.replace(/Write \(Publish\) Configuration/g, "Read (Subscribe) Configuration");

// Change the inputs inside the gray box to represent reading instead of publishing
content = content.replace(/Publish Topic/g, "Read Topic");
content = content.replace(/Optional\. If the widget writes to a different topic than it reads from\./g, "Optional. If the widget reads state from a different topic than it publishes to.");
content = content.replace(/Publish Variable Name/g, "Read Variable Name");
content = content.replace(/Optional\. If the widget writes to a different variable than it reads\./g, "Optional. If the widget reads state from a different variable than it publishes.");

// Notice I am NOT renaming the JSON property `publishTopic` to `readTopic` in the DB right now, to avoid breaking data unless necessary.
// Actually, it's better to rename them in the UI and state to `readTopic` and `readVariableName` so it's clean, but that requires updating `WidgetRenderer.tsx` too. 
// Let's replace the `publishTopic` variable binding with `readTopic`.

content = content.replace(/publishTopic/g, "readTopic");
content = content.replace(/publishVariableName/g, "readVariableName");

fs.writeFileSync(path, content, 'utf8');
console.log('UI text replaced successfully');
