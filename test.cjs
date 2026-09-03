const fs = require('fs');
const files = fs.readdirSync('dist/assets').filter(f => f.endsWith('.css'));
let found = false;
for (const file of files) {
  const content = fs.readFileSync('dist/assets/' + file, 'utf8');
  if (content.includes('from-cyan-500')) {
    console.log('Found from-cyan-500 in ' + file);
    found = true;
  }
}
if (!found) console.log('NOT FOUND from-cyan-500');
