import { NextResponse } from "next/server";
import { profileStore } from "@/lib/profileStore";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await profileStore.deleteProfile(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting profile:", error);
    return NextResponse.json({ success: false, error: "Failed to delete profile" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    // Hanya izinkan flag koneksi; Instagram tidak boleh di-connect manual (wajib lewat OAuth)
    const patch: Record<string, any> = {};
    if (typeof body.youtubeConnected === 'boolean') patch.youtubeConnected = body.youtubeConnected;
    if (typeof body.tiktokConnected === 'boolean') patch.tiktokConnected = body.tiktokConnected;
    if (body.instagramConnected === false) {
      patch.instagramConnected = false;
      patch.instagramToken = null;
      patch.instagramUserId = null;
      patch.instagramTokenExpiresAt = null;
    }
    const updated = await profileStore.updateProfile(id, patch);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Profil tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ success: false, error: "Gagal update profile" }, { status: 500 });
  }
}

