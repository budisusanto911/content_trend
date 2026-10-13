import OpenAI from "openai";

// Groq provides blazing fast LLMs with a free tier via OpenAI SDK compatibility
const ai = new OpenAI({ 
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "your_groq_api_key_here"
});

export class AIService {
  static async generateContentContext(videos: any[]) {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key_here") {
      console.warn("GROQ_API_KEY is missing. Returning mock generated context.");
      return this.getMockContext();
    }

    const videoDataString = videos.map(v => 
      `Title: ${v.title}\nCreator: ${v.creator}\nViews: ${v.metrics.views}\nEngagement: ${v.metrics.likes + v.metrics.comments}`
    ).join("\n\n");

    const prompt = `
You are a viral content strategist. Analyze the following trending videos:

${videoDataString}

CRITICAL INSTRUCTION: You must provide clear and detailed answers, but do NOT exceed 900 tokens total. For the youtubeDescription, provide exactly 2-3 compelling sentences. For preProduction, provide 1 detailed sentence per field.
Output a JSON object exactly matching this schema (do not include markdown blocks like \`\`\`json):
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
}
    `;

    try {
      const response = await ai.chat.completions.create({
        model: "qwen/qwen3.8-27b", // Safe, globally available Groq model
        messages: [
          { role: "system", content: "You are a helpful viral content strategist that responds in JSON format." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 900
      });
      
      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        
        // Auto-fill missing fields if truncated
        if (!parsed.contentBrief) parsed.contentBrief = {};
        if (!parsed.contentBrief.storyStructure || parsed.contentBrief.storyStructure.length === 0) {
          parsed.contentBrief.storyStructure = ["1. Hook & Intro", "2. Masalah Utama", "3. Solusi & Eksperimen", "4. Kesimpulan & CTA"];
        }
        if (!parsed.contentBrief.youtubeDescription) {
          parsed.contentBrief.youtubeDescription = "Data terlalu panjang untuk AI gratis! Gunakan tombol 'AI SEO Generator' warna oranye di bawah untuk membuat deskripsi.";
        }
        if (!parsed.preProduction) {
          parsed.preProduction = {
            thumbnailPrompts: ["Cinematic, highly detailed, neon lighting, 4k"],
            retentionPredictor: {
              riskScore: 35,
              dropOffWarning: "Penonton biasanya bosan di detik ke 30 jika tidak ada visual yang berganti.",
              pacingSuggestion: "Ganti angle kamera setiap 3 detik."
            }
          };
        }
        
        return parsed;
      }
      throw new Error("Empty response from AI");
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      
      const errorMessage = error?.message || "";
      if (errorMessage.includes("429") || errorMessage.includes("Quota") || errorMessage.includes("fetch failed")) {
        console.warn("Groq API error. Falling back to mock context.");
        return this.getMockContext();
      }
      
      throw error;
    }
  }

  static async generateScript(topic: string, hook: string, context: string) {
    const prompt = `
You are an expert YouTube scriptwriter. Write a full YouTube video script based on the following:
Topic: ${topic}
Hook: ${hook}
Context/Angle: ${context}

Follow the rules:
1. Include Visual/B-roll instructions in brackets like [Show fast paced montage].
2. Write a compelling Intro, Body, and Outro.
3. Optimize for Gen-Z retention.

Output a JSON object exactly matching this schema:
{
  "script": [
    {
      "section": "Intro",
      "visual": "B-roll description",
      "voiceOver": "The spoken text"
    }
  ]
}
`;
    try {
      const response = await ai.chat.completions.create({
        model: "qwen/qwen3.8-27b",
        messages: [{ role: "system", content: "You respond only in JSON format." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 1500
      });
      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (e: any) {
      console.error(e);
      return { script: [{ section: "Error", visual: "None", voiceOver: "Failed to generate script due to token limit or API error." }] };
    }
  }

  static async generateSEO(topic: string) {
    const prompt = `
You are an expert YouTube SEO specialist. Generate metadata for a video about: ${topic}.
Output a JSON object exactly matching this schema:
{
  "titleIdeas": ["Catchy Title 1", "Catchy Title 2", "Catchy Title 3"],
  "description": "A full SEO optimized YouTube description with hashtags",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
`;
    try {
      const response = await ai.chat.completions.create({
        model: "qwen/qwen3.8-27b",
        messages: [{ role: "system", content: "You respond only in JSON format." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 800
      });
      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (e: any) {
      console.error(e);
      return { titleIdeas: ["Error Generating Title"], description: "Error", tags: [] };
    }
  }

  /**
   * Menghasilkan metadata SEO yang disesuaikan 100% dengan konten video
   * (Judul, Hook, Tokoh, dan Niche Pembicaraan).
   * Menghasilkan tags YouTube resmi dan hashtags Instagram/Shorts relevan.
   */
  static async generateContentSEO(params: {
    title: string;
    hook?: string;
    context?: string;
  }): Promise<{
    tags: string[];
    hashtags: string[];
    seoDescription?: string;
  }> {
    const { title, hook = "", context = "" } = params;

    // Coba AI Groq jika API key tersedia
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_groq_api_key_here") {
      const prompt = `
You are a viral YouTube Shorts and Instagram Reels SEO algorithm expert.
Analyze this video clip:
Title: "${title}"
Hook: "${hook}"
Context: "${context}"

Generate high-ranking, content-tailored metadata in Indonesian/English:
1. "tags": 10 to 15 relevant YouTube search keywords/phrases (all lowercase, no '#' symbols) specific to this topic, personality/creator, and niche.
2. "hashtags": 6 to 10 viral and niche-specific hashtags (starting with '#') directly related to this topic.
3. "seoDescription": 2-3 engaging, SEO-optimized sentences describing the clip.

Output pure JSON matching:
{
  "tags": ["keyword 1", "keyword 2"],
  "hashtags": ["#tag1", "#tag2"],
  "seoDescription": "description text"
}
`;
      try {
        const response = await ai.chat.completions.create({
          model: "qwen/qwen3.8-27b",
          messages: [
            { role: "system", content: "You respond only in JSON format." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          max_tokens: 600,
        });
        const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
        if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
          return {
            tags: parsed.tags.map((t: any) => String(t).trim().toLowerCase()),
            hashtags: (parsed.hashtags || []).map((h: any) => {
              const str = String(h).trim();
              return str.startsWith("#") ? str : `#${str}`;
            }),
            seoDescription: parsed.seoDescription || "",
          };
        }
      } catch (err) {
        console.warn("[AIService] AI generateContentSEO error, menggunakan intelligent fallback extractor:", err);
      }
    }

    // Fallback: Intelligent Keyword & Hashtag Extractor berbasis konten
    return this.extractFallbackContentSEO(title, hook);
  }

  /**
   * Rule-based content extractor yang otomatis mengekstrak kata kunci dan entitas dari judul/hook
   */
  static extractFallbackContentSEO(title: string, hook: string): { tags: string[]; hashtags: string[] } {
    const combined = `${title} ${hook}`.replace(/[^\w\s\d]/g, " ");
    const rawWords = combined.split(/\s+/).filter((w) => w.length > 2);

    const stopWords = new Set([
      "dan", "yang", "di", "ke", "dari", "ini", "itu", "untuk", "pada", "saat", "saatnya",
      "dengan", "akan", "bisa", "bikin", "kaget", "buat", "kamu", "kita", "semua",
      "oleh", "the", "and", "for", "with", "juga", "atau", "tidak", "belum", "adalah"
    ]);

    const significantWords: string[] = [];
    for (const w of rawWords) {
      const lower = w.toLowerCase();
      if (!stopWords.has(lower) && !significantWords.includes(lower)) {
        significantWords.push(lower);
      }
    }

    const tags: string[] = [];
    if (title) tags.push(title.toLowerCase().slice(0, 50));
    significantWords.slice(0, 8).forEach((w) => tags.push(w));
    tags.push("podcast indonesia", "viral", "shorts", "reels", "trending");

    const hashtags = significantWords
      .slice(0, 6)
      .map((w) => `#${w.replace(/\s+/g, "")}`);
    hashtags.push("#viral", "#shorts", "#reels", "#trending", "#fyp");

    return {
      tags: Array.from(new Set(tags)),
      hashtags: Array.from(new Set(hashtags)),
    };
  }

  private static getMockContext() {
    throw new Error("No data. Mock data has been removed.");
  }
}
