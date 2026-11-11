const fs = require('fs');
const file = 'src/services/AIService.ts';
let content = fs.readFileSync(file, 'utf8');

const newSchema = `    "keyPoints": ["Point1"],
    "cta": "Call to action"
  }
}`;

const oldSchema = `    "keyPoints": ["Point1"],
    "storyStructure": ["Step1", "Step2"],
    "cta": "Call to action",
    "titleIdeas": ["Title1"],
    "youtubeDescription": "Short generated description."
  },
  "preProduction": {
    "thumbnailPrompts": [
      "Short thumbnail prompt 1"
    ],
    "retentionPredictor": {
      "riskScore": 30,
      "dropOffWarning": "Short drop-off warning",
      "pacingSuggestion": "Short pacing fix"
    }
  }
}`;

content = content.replace(newSchema, oldSchema);

content = content.replace(
  `Follow the rules specified in our project's generate-content-context skill.`,
  `CRITICAL: Keep your JSON response EXTREMELY short and concise. Limit strings to 10 words max. You MUST fit under 800 tokens total to prevent API truncation.`
);

fs.writeFileSync(file, content);
