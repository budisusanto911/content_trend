import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { trendingJobScheduler } from "@/lib/trendingJobScheduler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shouldRun = searchParams.get("run") === "true";

    if (shouldRun) {
      const result = await trendingJobScheduler.runScrapeJob("scheduled-job");
      revalidatePath("/", "layout");
      return NextResponse.json({
        success: true,
        executed: true,
        message: result.log.message,
        status: trendingJobScheduler.getStatus(),
      });
    }

    return NextResponse.json({
      success: true,
      status: trendingJobScheduler.getStatus(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mengambil status job scraping" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const trigger = body.trigger === "scheduled-job" ? "scheduled-job" : "manual";

    const result = await trendingJobScheduler.runScrapeJob(trigger);
    revalidatePath("/", "layout");

    return NextResponse.json({
      success: true,
      message: result.log.message,
      lastScrapedAt: result.lastScrapedAt,
      nextScheduledAt: result.nextScheduledAt,
      videosCount: result.videos.length,
      status: trendingJobScheduler.getStatus(),
    });
  } catch (error: any) {
    console.error("[API /api/cron/scrape] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menjalankan job scraping" },
      { status: 500 }
    );
  }
}

