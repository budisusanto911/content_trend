const fs = require('fs');
const file = 'src/services/AIService.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace the schema string to be smaller
const oldSchema = `    "keyPoints": ["Point1"],
    "storyStructure": ["Step1"],
    "cta": "Call to action",
    "titleIdeas": ["Title1"],
    "youtubeDescription": "A generated SEO-friendly YouTube description for the video."
  },
  "preProduction": {
    "thumbnailPrompts": [
      "Midjourney/DALL-E prompt for thumbnail option 1",
      "Midjourney/DALL-E prompt for thumbnail option 2"
    ],
    "retentionPredictor": {
      "riskScore": 30,
      "dropOffWarning": "Where viewers might skip or click away",
      "pacingSuggestion": "How to fix the pacing to retain viewers"
    }
  }
}`;

const newSchema = `    "keyPoints": ["Point1"],
    "cta": "Call to action"
  }
}`;

content = content.replace(oldSchema, newSchema);

fs.writeFileSync(file, content);
