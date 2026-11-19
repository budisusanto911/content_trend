import { NextResponse } from "next/server";
import { StickmanVideoService } from "@/services/StickmanVideoService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      theme = "calm_ink",
      paperStyle = "notebook_grid",
      charStyle = "chibi",
      channelTag = "@catatan.tenang",
      scenes = [],
      previewSceneIndex = 0,
    } = body;

    const result = await StickmanVideoService.generatePreview({
      theme,
      paperStyle,
      charStyle,
      channelTag,
      scenes,
      previewSceneIndex,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error, logs: result.logs }, { status: 500 });
    }
    return NextResponse.json({ success: true, previewUrl: result.previewUrl });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Preview failed" }, { status: 500 });
  }
}
