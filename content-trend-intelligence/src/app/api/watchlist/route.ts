import { NextResponse } from "next/server";
import { watchlistStore, sanitizeWatchlistInput, WatchlistInput } from "@/lib/watchlistStore";
import { clipJobStore } from "@/lib/clipJobStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = clipJobStore.list();
  const items = watchlistStore.list().map((w) => ({
    ...w,
    readyCount: jobs.filter((j) => j.watchlistId === w.id && j.status === "ready").length,
    queuedCount: jobs.filter((j) => j.watchlistId === w.id && (j.status === "queued" || j.status === "clipping")).length,
    publishedCount: jobs.filter((j) => j.watchlistId === w.id && j.status === "published").length,
  }));
  return NextResponse.json({ success: true, items });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = sanitizeWatchlistInput(body, false);
    if (typeof input === "string") {
      return NextResponse.json({ success: false, error: input }, { status: 400 });
    }
    const item = watchlistStore.create(input as WatchlistInput);
    return NextResponse.json({ success: true, item });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Gagal menyimpan" }, { status: 500 });
  }
}

