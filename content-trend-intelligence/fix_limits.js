const fs = require('fs');

// 1. Fix AIService.ts
const aiServicePath = 'src/services/AIService.ts';
let code1 = fs.readFileSync(aiServicePath, 'utf8');
code1 = code1.replace(
  'response_format: { type: "json_object" }',
  'response_format: { type: "json_object" },\n        max_tokens: 900'
);
fs.writeFileSync(aiServicePath, code1);

// 2. Fix comments route.ts
const commentsRoutePath = 'src/app/api/comments/route.ts';
let code2 = fs.readFileSync(commentsRoutePath, 'utf8');
code2 = code2.replace(
  'response_format: { type: "json_object" }',
  'response_format: { type: "json_object" },\n      max_tokens: 900'
);
fs.writeFileSync(commentsRoutePath, code2);

