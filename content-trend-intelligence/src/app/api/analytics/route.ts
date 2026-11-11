import { NextResponse } from "next/server";
import { AnalyticsTracker } from "@/lib/analyticsTracker";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = AnalyticsTracker.getSummary() || AnalyticsTracker.evaluateAndSave();
    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const summary = AnalyticsTracker.evaluateAndSave();
    return NextResponse.json({ success: true, message: "Analytics diperbarui", data: summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

