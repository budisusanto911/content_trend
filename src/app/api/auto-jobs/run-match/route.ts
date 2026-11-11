import { NextResponse } from "next/server";
import { autoClipScheduler } from "@/lib/autoClipScheduler";
import { trendingJobScheduler } from "@/lib/trendingJobScheduler";

export const dynamic = "force-dynamic";

/** Preview: video trending (cache saat ini) mana saja yang cocok dengan watchlist */
export async function GET() {
  const cache = trendingJobScheduler.getCache();
  const matches = autoClipScheduler.findMatches(cache.videos || [], false);
  return NextResponse.json({ success: true, lastScrapedAt: cache.lastScrapedAt, matches });
}

/** Jalankan matcher manual ke cache trending saat ini → masukkan ke antrian clipper */
export async function POST() {
  const cache = trendingJobScheduler.getCache();
  const result = autoClipScheduler.onTrendingScraped(cache.videos || [], true);
  return NextResponse.json({ success: true, ...result });
}

