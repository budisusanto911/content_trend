import { NextResponse } from "next/server";
import { YouTubeService } from "@/services/YouTubeService";
import { settingsStore } from "@/lib/settingsStore";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const ai = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "your_groq_api_key_here"
});

export interface NicheAnalysisResult {
  nicheName: string;
  category: string;
  opportunityScore: number; // 0 - 100
  momentum: "Explosive" | "High" | "Moderate";
  competitionLevel: "Low" | "Medium" | "High";
  videoCount: number;
  totalViews: number;
  avgEngagementRate: string;
  sampleTopics: string[];
  brandingKit: {
    suggestedGoogleAccount: {
      accountName: string;
      emailIdea: string;
      channelName: string;
    };
    suggestedInstagramAccount: {
      username: string;
      displayName: string;
      bio: string;
      nicheKeywords: string[];
      contentPillars: string[];
    };
  };
  whyItWorks: string;
  monetizationIdea: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const settings = settingsStore.get();
    const region = searchParams.get("region") || settings.defaultRegion || "ID";
    const forceRefresh = searchParams.get("refresh") === "true";

    // 1. Ambil video trending
    const videos = await YouTubeService.getTrendingVideos(region, 40, forceRefresh);

    if (!videos || videos.length === 0) {
      return NextResponse.json({ success: true, niches: getFallbackNiches() });
    }

    // 2. Kelompokkan berdasarkan kategori / tema
    const categoryGroups: Record<string, any[]> = {};
    videos.forEach((video: any) => {
      const cat = video.category || "General";
      if (!categoryGroups[cat]) categoryGroups[cat] = [];
      categoryGroups[cat].push(video);
    });

    // 3. Jika API GROQ tersedia, minta AI menganalisis & merumuskan Branding Kit Google & Instagram
    const hasGroq = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_groq_api_key_here";

    if (!hasGroq) {
      return NextResponse.json({
        success: true,
        source: "rule_engine",
        niches: generateRuleBasedNiches(categoryGroups, videos)
      });
    }

    // AI Analysis Prompt
    const summaryList = Object.entries(categoryGroups)
      .slice(0, 5)
      .map(([cat, list]) => ({
        category: cat,
        count: list.length,
        titles: list.slice(0, 3).map((v) => v.title)
      }));

    const prompt = `
Anda adalah seorang Master Growth Strategist & Media Architect untuk Content Creator.
Berikut adalah kategori & sampel judul video yang sedang naik daun di YouTube/Social Media saat ini (Region: ${region}):
${JSON.stringify(summaryList, null, 2)}

Tugas Anda:
Pilih dan formulasikan 4-5 NICHE TERBAIK yang PALING MENJANJIKAN (Rising/Naik Daun) untuk seorang kreator baru yang ingin membuat AKUN GOOGLE (Gmail & YouTube Channel) serta AKUN INSTAGRAM spesifik untuk ceruk pasar ini.

Kembalikan HANYA JSON murni (array dari object) tanpa format markdown (\`\`\`json) dengan struktur:
[
  {
    "nicheName": "Nama Niche Menarik (misal: AI Automation & Productivity Hacks)",
    "category": "Kategori Asal (misal: Science & Tech)",
    "opportunityScore": 95,
    "momentum": "Explosive",
    "competitionLevel": "Low",
    "sampleTopics": ["Topik 1", "Topik 2", "Topik 3"],
    "brandingKit": {
      "suggestedGoogleAccount": {
        "accountName": "Nama Akun Google / Profil",
        "emailIdea": "contoh.email@gmail.com",
        "channelName": "Nama YouTube Channel"
      },
      "suggestedInstagramAccount": {
        "username": "@handle_ig_keren",
        "displayName": "Display Name IG",
        "bio": "Bio Instagram yang memikat (termasuk hook, value, & CTA)",
        "nicheKeywords": ["#tag1", "#tag2", "#tag3"],
        "contentPillars": ["Pilar 1 (Tutorial)", "Pilar 2 (Studi Kasus)", "Pilar 3 (Tools Review)"]
      }
    },
    "whyItWorks": "Alasan singkat kenapa niche ini sedang naik daun dan gampang tumbuh",
    "monetizationIdea": "Cara monetisasi (Affiliate, Jasa, Digital Product, Endorsement)"
  }
]
`;

    try {
      const completion = await ai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = completion.choices[0]?.message?.content || "";
      const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
      const aiNiches = JSON.parse(cleaned);
      
      // Hitung agregat metrik
      const enriched = aiNiches.map((niche: any, idx: number) => {
        const group = categoryGroups[niche.category] || videos.slice(idx * 3, idx * 3 + 3);
        const totalViews = group.reduce((acc: number, v: any) => acc + (v.metrics?.views || 0), 0);
        return {
          ...niche,
          videoCount: group.length,
          totalViews: totalViews || 850000,
          avgEngagementRate: "5.8%"
        };
      });

      return NextResponse.json({ success: true, source: "groq_ai", niches: enriched });
    } catch (aiErr: any) {
      console.warn("Groq AI failed (network/key/parse error), falling back to rule engine:", aiErr.message || aiErr);
      return NextResponse.json({
        success: true,
        source: "rule_engine_fallback",
        niches: generateRuleBasedNiches(categoryGroups, videos)
      });
    }

  } catch (error: any) {
    console.error("Niche finder error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to analyze niches" },
      { status: 500 }
    );
  }
}

function generateRuleBasedNiches(categoryGroups: Record<string, any[]>, allVideos: any[]): NicheAnalysisResult[] {
  const sortedCategories = Object.entries(categoryGroups)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);

  const presets: Record<string, Partial<NicheAnalysisResult>> = {
    "Science & Tech": {
      nicheName: "AI Automation & Future Tech",
      momentum: "Explosive",
      competitionLevel: "Low",
      opportunityScore: 96,
      brandingKit: {
        suggestedGoogleAccount: {
          accountName: "NexGen Automations",
          emailIdea: "nexgen.automation.creator@gmail.com",
          channelName: "NexGen AI Tools"
        },
        suggestedInstagramAccount: {
          username: "@nexgen.aitools",
          displayName: "NexGen AI & Productivity ⚡",
          bio: "🤖 Automasi kerjaanmu dalam 5 menit | Rekomendasi tools AI gratis & tutorial praktis | Link template gratis👇",
          nicheKeywords: ["#aitools", "#automation", "#teknologimodern", "#productivitytips"],
          contentPillars: ["AI Website Rahasia", "Automasi Bisnis", "Tutorial Workflow 60 Detik"]
        }
      },
      whyItWorks: "Banyak kreator dan pekerja mencari shortcut produktivitas dengan AI yang terus meledak.",
      monetizationIdea: "Affiliate software SaaS, kelas automasi, template prompt digital."
    },
    "Education": {
      nicheName: "Micro-Learning & Finansial Cerdas",
      momentum: "High",
      competitionLevel: "Medium",
      opportunityScore: 91,
      brandingKit: {
        suggestedGoogleAccount: {
          accountName: "Finansial Ringkas Media",
          emailIdea: "finansialringkas.id@gmail.com",
          channelName: "Finansial Ringkas"
        },
        suggestedInstagramAccount: {
          username: "@finansialringkas",
          displayName: "Finansial Ringkas | Edukasi Cuan",
          bio: "💡 Bikin melek finansial & investasi tanpa ribet | Tips hemat & rahasia portofolio pemula | Belajar bareng di link bio!",
          nicheKeywords: ["#belajarfinansial", "#investasipemula", "#keuangansehat", "#sidehustle"],
          contentPillars: ["Kesalahan Kelola Duit", "Review Saham/Reksadana", "Infografis Keuangan"]
        }
      },
      whyItWorks: "Audiens Gen-Z dan Milenial sangat responsif terhadap edukasi praktis format carousel & reels pendek.",
      monetizationIdea: "Sponsorship aplikasi fintech, kursus online, e-book panduan investasi."
    },
    "Entertainment": {
      nicheName: "Pop Culture & Untold Stories",
      momentum: "Explosive",
      competitionLevel: "Medium",
      opportunityScore: 89,
      brandingKit: {
        suggestedGoogleAccount: {
          accountName: "Sisi Gelap Cinema",
          emailIdea: "sisigelap.cinema@gmail.com",
          channelName: "Untold Chronicles"
        },
        suggestedInstagramAccount: {
          username: "@untold_chronicles.id",
          displayName: "Untold Chronicles 🎬",
          bio: "🍿 Fakta tersembunyi film & kisah nyata di balik layar | Plot twist & konspirasi pop-culture yang belum kamu tahu | Follow for daily thrill!",
          nicheKeywords: ["#filmfakta", "#movietrivia", "#ceritatersembunyi", "#behindthescenes"],
          contentPillars: ["Fakta Mengejutkan Film", "Teori Penggemar", "Kisah Nyata di Balik Film Viral"]
        }
      },
      whyItWorks: "Memiliki retensi tontonan (watch time) paling tinggi karena memanfaatkan rasa penasaran (curiosity hook).",
      monetizationIdea: "AdSense YouTube Shorts/Reels, endorsement streaming apps, merchandise pop-culture."
    },
    "People & Blogs": {
      nicheName: "Mindset & Daily Stoicism",
      momentum: "High",
      competitionLevel: "Low",
      opportunityScore: 88,
      brandingKit: {
        suggestedGoogleAccount: {
          accountName: "Titik Tenang Media",
          emailIdea: "titiktenang.official@gmail.com",
          channelName: "Titik Tenang Studio"
        },
        suggestedInstagramAccount: {
          username: "@titiktenang.id",
          displayName: "Titik Tenang | Stoikisme & Mindset 🌿",
          bio: "🧘 Menemukan damai di tengah hiruk-pikuk | Filosofi stoik & ketenangan mental harian | Quotes & renungan pengingat diri.",
          nicheKeywords: ["#stoikisme", "#mindsetpositif", "#kesehatanmental", "#selfgrowth"],
          contentPillars: ["Prinsip Stoik Harian", "Cara Mengatasi Overthinking", "Refleksi Malam"]
        }
      },
      whyItWorks: "Tingkat share & save sangat tinggi karena menyentuh sisi emosional dan kebutuhan ketenangan audiens modern.",
      monetizationIdea: "Jurnal planner cetak/digital, membership komunitas eksklusif, affiliate buku pengembangan diri."
    }
  };

  return sortedCategories.map(([cat, list]) => {
    const totalViews = list.reduce((sum, v) => sum + (v.metrics?.views || 0), 0);
    const preset = presets[cat] || {
      nicheName: `${cat} Trend Digest`,
      momentum: "High",
      competitionLevel: "Medium",
      opportunityScore: 85,
      brandingKit: {
        suggestedGoogleAccount: {
          accountName: `${cat} Digest Hub`,
          emailIdea: `${cat.toLowerCase().replace(/[^a-z0-9]/g, "")}.digest@gmail.com`,
          channelName: `${cat} Spot ID`
        },
        suggestedInstagramAccount: {
          username: `@${cat.toLowerCase().replace(/[^a-z0-9]/g, "")}_spotlight`,
          displayName: `${cat} Trends & Insights`,
          bio: `🚀 Update harian seputar dunia ${cat} | Kupas tren viral tercepat | Simpan konten favoritmu sekarang!`,
          nicheKeywords: [`#${cat.toLowerCase().replace(/[^a-z0-9]/g, "")}`, "#trenviral", "#infoterkini"],
          contentPillars: ["Update Tren", "Tips Praktis", "Opini Komunitas"]
        }
      },
      whyItWorks: `Kategori ${cat} saat ini mendominasi ${list.length} video di daftar trending dengan interaksi sangat kuat.`,
      monetizationIdea: "Paid partnership, affiliasi produk terkait kategori, merchandise."
    };

    return {
      nicheName: preset.nicheName!,
      category: cat,
      opportunityScore: preset.opportunityScore || 88,
      momentum: preset.momentum || "High",
      competitionLevel: preset.competitionLevel || "Medium",
      videoCount: list.length,
      totalViews: totalViews,
      avgEngagementRate: "6.2%",
      sampleTopics: list.slice(0, 3).map((v) => v.title),
      brandingKit: preset.brandingKit!,
      whyItWorks: preset.whyItWorks!,
      monetizationIdea: preset.monetizationIdea!
    } as NicheAnalysisResult;
  });
}

function getFallbackNiches(): NicheAnalysisResult[] {
  return [
    {
      nicheName: "AI Automation & No-Code Tools",
      category: "Science & Tech",
      opportunityScore: 97,
      momentum: "Explosive",
      competitionLevel: "Low",
      videoCount: 12,
      totalViews: 3400000,
      avgEngagementRate: "7.4%",
      sampleTopics: ["Autonomous AI Agents", "Make.com Automation", "No-code SaaS"],
      brandingKit: {
        suggestedGoogleAccount: {
          accountName: "NexGen Automations",
          emailIdea: "nexgen.automation.creator@gmail.com",
          channelName: "NexGen AI"
        },
        suggestedInstagramAccount: {
          username: "@nexgen.aitools",
          displayName: "NexGen AI & Productivity ⚡",
          bio: "🤖 Automasi kerjaanmu dalam 5 menit | Rekomendasi tools AI gratis & tutorial praktis | Link template gratis👇",
          nicheKeywords: ["#aitools", "#automation", "#teknologimodern"],
          contentPillars: ["AI Website Rahasia", "Automasi Bisnis", "Tutorial Workflow 60 Detik"]
        }
      },
      whyItWorks: "Peminat AI sedang melonjak drastis tetapi kreator yang menyajikan tutorial praktis bahasa Indonesia masih sangat sedikit.",
      monetizationIdea: "Affiliate software SaaS (Notion, Make, ChatGPT Plus), jual template prompt, konsultasi."
    }
  ];
}

