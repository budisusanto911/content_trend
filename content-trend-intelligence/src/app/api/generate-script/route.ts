import { NextResponse } from "next/server";
import { AIService } from "@/services/AIService";

export async function POST(request: Request) {
  try {
    const { topic, hook, context } = await request.json();
    if (!topic) return NextResponse.json({ success: false, error: "Missing topic" }, { status: 400 });
    
    const data = await AIService.generateScript(topic, hook || '', context || '');
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate script" },
      { status: 500 }
    );
  }
}
