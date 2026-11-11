require('dotenv').config();
const { OpenAI } = require('openai');

const ai = new OpenAI({ 
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY
});

async function run() {
  const prompt = `
Output a JSON object exactly matching this schema:
{
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
}
  `;
  try {
    const response = await ai.chat.completions.create({
      model: "qwen/qwen3.8-27b",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 900
    });
    console.log(response.choices[0].message.content);
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
run();
