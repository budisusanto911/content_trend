import { NextResponse } from "next/server";
import OpenAI from "openai";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const ai = new OpenAI({ 
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "your_groq_api_key_here"
});

export async function POST(request: Request) {
  try {
    const { videoId } = await request.json();
    if (!videoId) {
      return NextResponse.json({ success: false, error: "videoId is required" }, { status: 400 });
    }

    // 1. Fetch comments from YouTube API
    const ytUrl = `https://youtube.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&order=relevance&key=${YOUTUBE_API_KEY}`;
    const ytResponse = await fetch(ytUrl);
    
    if (!ytResponse.ok) {
      return NextResponse.json({ success: false, error: "Failed to fetch comments from YouTube. It might be disabled for this video." }, { status: 500 });
    }

    const ytData = await ytResponse.json();
    if (!ytData.items || ytData.items.length === 0) {
      return NextResponse.json({ success: false, error: "No comments found for this video" }, { status: 404 });
    }

    // Extract text from the top 50 comments
    const comments = ytData.items
      .slice(0, 50)
      .map((item: any) => item.snippet.topLevelComment.snippet.textDisplay)
      .join("\n---\n");

    // 2. Analyze with Groq AI
    const prompt = `
You are an expert YouTube Strategist. I have scraped the top comments from a highly trending video.
Analyze these comments and extract actionable insights for a content creator.

Comments:
${comments}

Output a JSON object exactly matching this schema:
{
  "sentiment": "Positive/Negative/Mixed",
  "topQuestions": ["Question 1 people are asking", "Question 2"],
  "commonComplaints": ["Complaint or confusion 1", "Complaint 2"],
  "nextVideoIdeas": [
    {
      "title": "Idea 1 based on comments",
      "reason": "Why this will work based on viewer demands"
    },
    {
      "title": "Idea 2 based on comments",
      "reason": "Why this will work based on viewer demands"
    }
  ]
}
`;

    const aiResponse = await ai.chat.completions.create({
      model: "qwen/qwen3.8-27b",
      messages: [
        { role: "system", content: "You are a helpful viral content strategist that responds in JSON format." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 900
    });

    const content = aiResponse.choices[0]?.message?.content;
    if (content) {
      return NextResponse.json({ success: true, data: JSON.parse(content) });
    }
    
    throw new Error("Empty response from AI");
  } catch (error: any) {
    console.error("Comment analysis failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
