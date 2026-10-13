/**
 * YouTubeService
 * 
 * Fetches trending videos from the YouTube Data API.
 */
export class YouTubeService {
  private static API_KEY = process.env.YOUTUBE_API_KEY;
  private static BASE_URL = "https://youtube.googleapis.com/youtube/v3";

  private static YOUTUBE_CATEGORY_MAP: Record<string, string> = {
    "1": "Film & Animation",
    "2": "Autos & Vehicles",
    "10": "Music",
    "15": "Pets & Animals",
    "17": "Sports",
    "18": "Short Movies",
    "19": "Travel & Events",
    "20": "Gaming",
    "21": "Videoblogging",
    "22": "People & Blogs",
    "23": "Comedy",
    "24": "Entertainment",
    "25": "News & Politics",
    "26": "Howto & Style",
    "27": "Education",
    "28": "Science & Tech",
    "29": "Nonprofits & Activism",
    "30": "Movies",
    "31": "Anime/Animation",
    "32": "Action/Adventure",
    "33": "Classics",
    "34": "Comedy",
    "35": "Documentary",
    "36": "Drama",
    "37": "Family",
    "38": "Foreign",
    "39": "Horror",
    "40": "Sci-Fi/Fantasy",
    "41": "Thriller",
    "42": "Shorts",
    "43": "Shows",
    "44": "Trailers"
  };


  private static getApiKey(): string | undefined {
    if (process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY !== "your_youtube_api_key_here") {
      return process.env.YOUTUBE_API_KEY;
    }
    return undefined;
  }

  /**
   * Dipanggil langsung oleh Job Scheduler (3x sehari) atau Manual Refresh untuk mengambil data segar dari YouTube API
   */
  static async fetchRawTrendingFromAPI(
    regionCode = "ID",
    maxResults = 30
  ): Promise<{ videos: any[]; source: "youtube_api" | "mock_fallback" }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.warn("YOUTUBE_API_KEY is missing. Returning highly realistic mock data for development.");
      return { videos: this.getMockTrendingVideos(), source: "mock_fallback" };
    }

    try {
      const url = `${this.BASE_URL}/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=${regionCode}&maxResults=${maxResults}&key=${apiKey}`;
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`YouTube API error (${response.status} ${response.statusText}): ${errText}. Falling back to manual/mock data.`);
        return { videos: this.getMockTrendingVideos(), source: "mock_fallback" };
      }

      const data = await response.json();
      const videos = (data.items || []).map((item: any) => this.mapYouTubeItemToVideo(item));
      return { videos, source: "youtube_api" };
    } catch (error) {
      console.error("Error fetching trending videos, falling back to manual data:", error);
      return { videos: this.getMockTrendingVideos(), source: "mock_fallback" };
    }
  }

  /**
   * Mengambil data video trending dari hasil Job Scraping (3x sehari) di local cache,
   * atau memicu job jika cache belum tersedia / forceRefresh = true.
   */
  static async getTrendingVideos(regionCode = "ID", maxResults = 30, forceRefresh = false) {
    const { trendingJobScheduler } = await import("@/lib/trendingJobScheduler");
    return trendingJobScheduler.getOrScrapeVideos(regionCode, maxResults, forceRefresh);
  }

  private static mapYouTubeItemToVideo(item: any) {
    return {
      id: item.id,
      platformId: 1, // 1 = YouTube
      title: item.snippet.title,
      creator: item.snippet.channelTitle,
      originalUrl: `https://www.youtube.com/watch?v=${item.id}`,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      uploadTime: new Date(item.snippet.publishedAt),
      category: this.YOUTUBE_CATEGORY_MAP[item.snippet.categoryId] || item.snippet.categoryId,
      hashtags: item.snippet.tags || ["trending"],
      metrics: {
        views: parseInt(item.statistics.viewCount || "0", 10),
        likes: parseInt(item.statistics.likeCount || "0", 10),
        comments: parseInt(item.statistics.commentCount || "0", 10),
        shares: 0,
      }
    };
  }

  private static getMockTrendingVideos() {
    const now = Date.now();
    return [
      {
        id: "mock_yt_1",
        platformId: 1,
        title: "I Built an Autonomous AI Agent That Runs My Business",
        creator: "TechLead Pro",
        originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60",
        uploadTime: new Date(now - 3 * 3600 * 1000),
        category: "Science & Tech",
        hashtags: ["AI", "Technology", "Automation", "Coding"],
        metrics: {
          views: 845200,
          likes: 62400,
          comments: 4890,
          shares: 1200
        }
      },
      {
        id: "mock_yt_2",
        platformId: 1,
        title: "The 10-Minute Morning Routine That Changed My Life",
        creator: "Ali Lifestyle",
        originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnailUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=60",
        uploadTime: new Date(now - 5 * 3600 * 1000),
        category: "Howto & Style",
        hashtags: ["Productivity", "Habits", "Lifestyle", "SelfImprovement"],
        metrics: {
          views: 1240000,
          likes: 95000,
          comments: 7200,
          shares: 2300
        }
      },
      {
        id: "mock_yt_3",
        platformId: 1,
        title: "Surviving 100 Days in Hardcore Minecraft (Movie)",
        creator: "PixelMaster Gaming",
        originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnailUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60",
        uploadTime: new Date(now - 8 * 3600 * 1000),
        category: "Gaming",
        hashtags: ["Gaming", "Minecraft", "Challenge", "Survival"],
        metrics: {
          views: 3100000,
          likes: 215000,
          comments: 18500,
          shares: 5400
        }
      },
      {
        id: "mock_yt_4",
        platformId: 1,
        title: "Why Everyone Is Quitting Social Media in 2026",
        creator: "Modern Thinker",
        originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnailUrl: "https://images.unsplash.com/photo-1516251193007-45ef944ab0c6?w=800&auto=format&fit=crop&q=60",
        uploadTime: new Date(now - 12 * 3600 * 1000),
        category: "Entertainment",
        hashtags: ["Trends", "Culture", "SocialMedia", "Psychology"],
        metrics: {
          views: 650000,
          likes: 48000,
          comments: 3900,
          shares: 1100
        }
      },
      {
        id: "mock_yt_5",
        platformId: 1,
        title: "How to Learn Any Skill 10x Faster with Neuroscience",
        creator: "Dr. Brain Insights",
        originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnailUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=60",
        uploadTime: new Date(now - 15 * 3600 * 1000),
        category: "Education",
        hashtags: ["Education", "Brain", "Learning", "Productivity"],
        metrics: {
          views: 920000,
          likes: 78000,
          comments: 5400,
          shares: 3100
        }
      },
      {
        id: "mock_yt_6",
        platformId: 1,
        title: "New AI Video Model Just Changed Filmmaking Forever",
        creator: "Creator Studio Tech",
        originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnailUrl: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=800&auto=format&fit=crop&q=60",
        uploadTime: new Date(now - 18 * 3600 * 1000),
        category: "Science & Tech",
        hashtags: ["AI", "VideoEditing", "Filmmaking", "Tools"],
        metrics: {
          views: 1450000,
          likes: 112000,
          comments: 9800,
          shares: 4200
        }
      }
    ];
  }
}
