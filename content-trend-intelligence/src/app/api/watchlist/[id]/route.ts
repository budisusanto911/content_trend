import { NextResponse } from "next/server";
import { watchlistStore, sanitizeWatchlistInput } from "@/lib/watchlistStore";
import { clipJobStore } from "@/lib/clipJobStore";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const patch = sanitizeWatchlistInput(body, true);
    if (typeof patch === "string") {
      return NextResponse.json({ success: false, error: patch }, { status: 400 });
    }
    // Izinkan reset kuota publish harian (mis. untuk testing)
    const extra = body.resetPublishedToday === true ? { lastPublishedDate: null } : {};
    const item = watchlistStore.update(id, { ...patch, ...extra });
    if (!item) {
      return NextResponse.json({ success: false, error: "Watchlist tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, item });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Gagal update" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  watchlistStore.delete(id);
  clipJobStore.deleteByWatchlist(id);
  return NextResponse.json({ success: true });
}

