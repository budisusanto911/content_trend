fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  body: JSON.stringify({ videoIds: [] }),
  headers: { 'Content-Type': 'application/json' }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2))).catch(console.error);
