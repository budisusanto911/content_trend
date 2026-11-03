import { NextResponse } from "next/server";
import { profileStore } from "@/lib/profileStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const all = await profileStore.getProfiles();
    // Jangan kirim token/password ke browser
    const profiles = all.map(
      ({
        instagramToken,
        igPassword,
        tiktokCookies,
        youtubeToken,
        youtubeRefreshToken,
        facebookToken,
        threadsToken,
        ...safe
      }) => ({
        ...safe,
        facebookConnected: Boolean(safe.facebookConnected),
        threadsConnected: Boolean(safe.threadsConnected),
      })
    );
    return NextResponse.json({ success: true, profiles });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch profiles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const profile = await profileStore.createProfile({
      name: data.name,
      targetKeyword: data.targetKeyword || "",
      category: data.category || null,
      youtubeConnected: data.youtubeConnected || false,
      tiktokConnected: data.tiktokConnected || false,
      instagramConnected: data.instagramConnected || false,
      facebookConnected: data.facebookConnected || false,
      threadsConnected: data.threadsConnected || false,
    });
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Error creating profile:", error);
    return NextResponse.json({ success: false, error: "Failed to create profile" }, { status: 500 });
  }
}

