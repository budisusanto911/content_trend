import { NextResponse } from "next/server";
import { trendingJobScheduler } from "@/lib/trendingJobScheduler";
import { autoClipScheduler } from "@/lib/autoClipScheduler";

export const dynamic = "force-dynamic";

/**
 * Endpoint Cron Terpadu (Scrape + Auto Clip + Auto Publish + Disk Cleanup).
 * Bisa dipanggil via Linux crontab:
 *   *\/5 * * * * curl -fsS "http://localhost:3000/api/cron/autopilot?run=true" >/dev/null
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shouldRun = searchParams.get("run") === "true";

    if (shouldRun) {
      // 1. Jika jadwal scrape trending sudah jatuh tempo, jalankan scrape terlebih dahulu
      if (trendingJobScheduler.isJobDue()) {
        await trendingJobScheduler.runScrapeJob("scheduled-job");
      }
      // 2. Jalankan antrian clip, antrian publish harian, dan auto-cleanup disk
      const tick = await autoClipScheduler.runTick();

      return NextResponse.json({
        success: true,
        executed: true,
        cleanedFiles: tick.cleanedFiles,
        status: autoClipScheduler.getStatus(),
      });
    }

    return NextResponse.json({
      success: true,
      status: autoClipScheduler.getStatus(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menjalankan cron autopilot" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    if (trendingJobScheduler.isJobDue()) {
      await trendingJobScheduler.runScrapeJob("scheduled-job");
    }
    const tick = await autoClipScheduler.runTick();
    return NextResponse.json({
      success: true,
      executed: true,
      cleanedFiles: tick.cleanedFiles,
      status: autoClipScheduler.getStatus(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menjalankan cron autopilot" },
      { status: 500 }
    );
  }
}

