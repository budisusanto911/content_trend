const fs = require('fs');
const file = 'src/app/dashboard/analyzer/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\s*<\/section>\s*<\/section>\s*<\/div>\s*<div className="space-y-6">/, '\n            </div>\n            <div className="space-y-6">');

fs.writeFileSync(file, content);
