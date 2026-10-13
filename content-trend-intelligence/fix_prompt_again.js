const fs = require('fs');
const file = 'src/services/AIService.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `CRITICAL: Keep your JSON response EXTREMELY short and concise. Limit strings to 10 words max. You MUST fit under 800 tokens total to prevent API truncation.`,
  `CRITICAL INSTRUCTION: You must provide clear and detailed answers, but do NOT exceed 900 tokens total. For the youtubeDescription, provide exactly 2-3 compelling sentences. For preProduction, provide 1 detailed sentence per field.`
);

fs.writeFileSync(file, content);
