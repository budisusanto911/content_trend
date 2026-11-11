import { NextResponse } from "next/server";
import { YouTubeService } from "@/services/YouTubeService";
import { settingsStore } from "@/lib/settingsStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const settings = settingsStore.get();
    const region = searchParams.get("region") || settings.defaultRegion || "ID";
    const limit = Number(searchParams.get("limit")) || settings.maxTrendingResults || 30;
    const forceRefresh = searchParams.get("refresh") === "true";

    // Fetch YouTube trending from job cache (or force refresh if requested)
    const videos = await YouTubeService.getTrendingVideos(region, limit, forceRefresh);

    return NextResponse.json({
      success: true,
      data: videos,
      region,
      lastScrapedAt: settingsStore.get().lastScrapedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch trending videos" },
      { status: 500 }
    );
  }
}
