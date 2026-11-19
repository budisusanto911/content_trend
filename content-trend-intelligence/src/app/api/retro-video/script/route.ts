import { NextResponse } from "next/server";
import { RetroVideoService } from "@/services/RetroVideoService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { topic } = await req.json().catch(() => ({ topic: "" }));
    const concept = await RetroVideoService.generateScriptConcept(topic);
    return NextResponse.json({ success: true, ...concept });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
