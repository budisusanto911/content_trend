import { NextResponse } from "next/server";
import { RetroVideoService } from "@/services/RetroVideoService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imagePath, inkName = "charcoal", paperType = "cream" } = body;

    const result = await RetroVideoService.generatePreview({
      imagePath,
      hook: "",
      script: "",
      inkName,
      paperType,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error, logs: result.logs }, { status: 500 });
    }

    return NextResponse.json({ success: true, previewUrl: result.previewUrl });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to generate preview" }, { status: 500 });
  }
}
