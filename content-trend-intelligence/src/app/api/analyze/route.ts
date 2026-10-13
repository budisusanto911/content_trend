import { NextResponse } from "next/server";
import { AIService } from "@/services/AIService";
import { YouTubeService } from "@/services/YouTubeService";
import { settingsStore } from "@/lib/settingsStore";

export async function POST(request: Request) {
  try {
    const { videoIds } = await request.json();
    
    // If no videoIds provided, we'll just analyze the top trending videos
    const validVideoIds = (videoIds && Array.isArray(videoIds)) ? videoIds : [];

    const settings = settingsStore.get();
    const allTrending = await YouTubeService.getTrendingVideos(
      settings.defaultRegion || "ID",
      settings.maxTrendingResults || 30
    );
    const selectedVideos = allTrending.filter((v: any) => validVideoIds.includes(v.id));
    
    // If not found in current trending (due to mock mismatch), just use the first few
    const videosToAnalyze = selectedVideos.length > 0 ? selectedVideos : allTrending.slice(0, 3);

    const context = await AIService.generateContentContext(videosToAnalyze);
    
    return NextResponse.json({ success: true, data: context });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate context" },
      { status: 500 }
    );
  }
}
