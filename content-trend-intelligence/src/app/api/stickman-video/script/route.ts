import { NextResponse } from "next/server";
import { StickmanVideoService } from "@/services/StickmanVideoService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { category } = await req.json().catch(() => ({ category: "" }));
    const preset = StickmanVideoService.getStoryPreset(category);
    return NextResponse.json({ success: true, ...preset });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
