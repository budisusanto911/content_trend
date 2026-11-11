import { NextResponse } from "next/server";
import { autoClipScheduler } from "@/lib/autoClipScheduler";
import { clipJobStore } from "@/lib/clipJobStore";
import { watchlistStore } from "@/lib/watchlistStore";

export const dynamic = "force-dynamic";

/**
 * Aksi manual untuk 1 job:
 * - retry       : masukkan lagi ke antrian clip (job gagal) / atau kembalikan ke ready jika klip sudah ada
 * - skip        : jangan diproses / dipublish
 * - approve     : setujui klip (untuk watchlist dengan requireApproval)
 * - publish-now : publish sekarang (mengabaikan jam publish, tetap tercatat sebagai jatah hari ini)
 * - delete      : hapus job dari daftar
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json();
  const job = clipJobStore.get(id);
  if (!job) {
    return NextResponse.json({ success: false, error: "Job tidak ditemukan" }, { status: 404 });
  }

  switch (action) {
    case "retry": {
      const updated = job.clip?.outputFile
        ? clipJobStore.update(id, { status: "ready", error: undefined })
        : clipJobStore.update(id, { status: "queued", attempts: 0, error: undefined });
      if (updated?.status === "queued") {
        autoClipScheduler.processClipQueue().catch(() => undefined);
      }
      return NextResponse.json({ success: true, job: updated });
    }
    case "skip":
      if (job.status === "clipping" || job.status === "publishing") {
        return NextResponse.json({ success: false, error: "Job sedang diproses" }, { status: 409 });
      }
      return NextResponse.json({ success: true, job: clipJobStore.update(id, { status: "skipped" }) });
    case "approve":
      return NextResponse.json({ success: true, job: clipJobStore.update(id, { approved: true }) });
    case "publish-now": {
      if (!job.clip?.outputFile || job.status === "publishing" || job.status === "clipping") {
        return NextResponse.json({ success: false, error: "Klip belum siap dipublish" }, { status: 400 });
      }
      const item = watchlistStore.get(job.watchlistId);
      if (!item) {
        return NextResponse.json({ success: false, error: "Watchlist sudah dihapus" }, { status: 404 });
      }
      const updated = await autoClipScheduler.publishJob(job, item);
      return NextResponse.json({ success: updated?.status === "published", job: updated, error: updated?.error });
    }
    case "delete":
      if (job.status === "clipping" || job.status === "publishing") {
        return NextResponse.json({ success: false, error: "Job sedang diproses" }, { status: 409 });
      }
      clipJobStore.delete(id);
      return NextResponse.json({ success: true });
    default:
      return NextResponse.json({ success: false, error: "Aksi tidak dikenal" }, { status: 400 });
  }
}

