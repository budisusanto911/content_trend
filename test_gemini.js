const fs = require('fs');
const env = fs.readFileSync('content-trend-intelligence/.env', 'utf-8');
const match = env.match(/AI_API_KEY="([^"]+)"/);
if (match) {
  const key = match[1];
  fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
    .then(res => res.json())
    .then(data => {
      if (data.models) {
        console.log(data.models.map(m => m.name).join('\n'));
      } else {
        console.log(data);
      }
    });
}
