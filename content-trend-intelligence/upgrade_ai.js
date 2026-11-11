const fs = require('fs');
const path = 'src/services/AIService.ts';
let code = fs.readFileSync(path, 'utf8');

// Update the JSON schema in the prompt
const newSchema = `{
  "trend": {
    "topic": "Common Topic",
    "trendScore": 92,
    "trendStatus": "Rising",
    "growthRatePercent": 150,
    "whyTrending": "Why it's viral"
  },
  "audience": {
    "primaryAudience": "Target audience",
    "audienceInterest": "Why they care",
    "audienceQuestions": ["Q1", "Q2"],
    "audiencePainPoints": ["Pain1", "Pain2"]
  },
  "sourceInsights": {
    "commonThemes": ["Theme1"],
    "commonHooks": ["Hook1"],
    "commonFormats": ["Format1"],
    "commonEmotionalTriggers": ["Emotion1"]
  },
  "contentGap": "What existing content is missing",
  "contentOpportunity": {
    "recommendedOpportunity": "Opportunity",
    "uniqueAngle": "Angle",
    "recommendedFormat": "Format",
    "potentialScore": 95
  },
  "contentBrief": {
    "hook": "Hook script",
    "mainTopic": "Topic",
    "keyPoints": ["Point1"],
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

code = code.replace(/\{\n  "trend": \{[\s\S]*?\}\n\}/, newSchema);

fs.writeFileSync(path, code);
