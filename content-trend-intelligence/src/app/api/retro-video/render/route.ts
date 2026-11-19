import { NextResponse } from "next/server";
import { RetroVideoService } from "@/services/RetroVideoService";
import { lastClipStore } from "@/lib/lastClipStore";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      imagePath,
      hook = "Ketika Hatimu Merasa Lelah",
      script = "Ingatlah, tidak ada lelah yang sia-sia bagi hati yang selalu bersandar pada ketetapan-Nya.",
      inkName = "charcoal",
      paperType = "cream",
      voice = "id-ID-ArdiNeural",
    } = body;

    const result = await RetroVideoService.renderVideo({
      imagePath,
      hook,
      script,
      inkName,
      paperType,
      voice,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error, logs: result.logs }, { status: 500 });
    }

    // Save to lastClipStore so it can be viewed in Library or published directly!
    try {
      lastClipStore.update({
        outputFile: result.videoUrl,
        title: hook,
        hook: hook,
        tags: ["#dzikir", "#renungan", "#quotes", "#tenang", "#aesthetic"],
        hashtags: ["#dzikir", "#renungan", "#quotes", "#retrovideo"],
      });
    } catch (e) {
      console.warn("Could not record to lastClipStore:", e);
    }

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      title: hook,
      logs: result.logs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Render failed" }, { status: 500 });
  }
}
