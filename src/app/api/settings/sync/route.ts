import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { trendingJobScheduler } from "@/lib/trendingJobScheduler";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // 1. Jalankan job scraping manual dan simpan ke trending_cache.json
    const result = await trendingJobScheduler.runScrapeJob("manual");

    // 2. Invalidate Next.js cache
    revalidatePath("/", "layout");

    return NextResponse.json({
      success: true,
      message: result.log.message,
      lastScrapedAt: result.lastScrapedAt,
      nextScheduledAt: result.nextScheduledAt,
      jobStatus: trendingJobScheduler.getStatus(),
    });
  } catch (error: any) {
    console.error("Gagal sync:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

