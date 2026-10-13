import { NextResponse } from "next/server";
import { lastClipStore } from "@/lib/lastClipStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const clip = lastClipStore.get();
    return NextResponse.json({
      success: true,
      clip,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to get last clip",
    }, { status: 500 });
  }
}

