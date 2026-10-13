import { NextResponse } from "next/server";
import { autoClipScheduler } from "@/lib/autoClipScheduler";
import { clipJobStore } from "@/lib/clipJobStore";
import { settingsStore } from "@/lib/settingsStore";

export const dynamic = "force-dynamic";

/** Daftar job + status scheduler + log aktivitas */
export async function GET() {
  return NextResponse.json({
    success: true,
    status: autoClipScheduler.getStatus(),
    jobs: clipJobStore.list().slice(0, 100),
    logs: autoClipScheduler.getLogs().slice(0, 40),
  });
}

/** Ubah master switch Auto Clip / Auto Publish */
export async function PATCH(req: Request) {
  const body = await req.json();
  const patch: Record<string, boolean> = {};
  if (typeof body.autoClipEnabled === "boolean") patch.autoClipEnabled = body.autoClipEnabled;
  if (typeof body.autoPublishEnabled === "boolean") patch.autoPublishEnabled = body.autoPublishEnabled;
  settingsStore.save(patch);
  return NextResponse.json({ success: true, status: autoClipScheduler.getStatus() });
}

