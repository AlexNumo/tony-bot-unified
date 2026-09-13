const fs = require('fs');
let lines = fs.readFileSync('server.ts', 'utf8').split('\n');
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('app.post(\'/api/broadcast/config\',')) {
    if (lines[i+4] && lines[i+4].trim() === '});') {
      lines[i+4] = '';
    }
  }
}
fs.writeFileSync('server.ts', lines.join('\n'), 'utf8');
