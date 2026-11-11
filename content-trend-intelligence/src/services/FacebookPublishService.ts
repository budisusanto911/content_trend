export interface FacebookPublishResult {
  success: boolean;
  videoId?: string;
  permalink?: string;
  error?: string;
}

export class FacebookPublishService {
  /**
   * Publikasikan video klip ke Facebook Page / Reels menggunakan Meta Graph API
   */
  static async publishReel(params: {
    pageId: string;
    accessToken: string;
    videoUrl: string;
    caption: string;
  }): Promise<FacebookPublishResult> {
    const { pageId, accessToken, videoUrl, caption } = params;

    if (!pageId || !accessToken) {
      return {
        success: false,
        error: "Akun/Halaman Facebook belum terhubung atau token tidak ditemukan.",
      };
    }

    if (!videoUrl.startsWith("https://")) {
      return {
        success: false,
        error: `Meta Facebook API mewajibkan URL video publik dengan HTTPS (misal via ngrok). URL saat ini: ${videoUrl}`,
      };
    }

    try {
      console.log(`[FacebookPublish] Mengunggah video ke Facebook Page ${pageId}...`);
      const uploadUrl = `https://graph.facebook.com/v21.0/${pageId}/videos`;
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: videoUrl,
          description: caption.includes("#") ? caption : `${caption}\n\n#reels #facebookreels #viral`,
          access_token: accessToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.id) {
        console.error("[FacebookPublish] Gagal upload video Facebook:", data);
        const errMsg =
          data.error?.error_user_msg ||
          data.error?.message ||
          "Gagal mempublish video ke Facebook Page.";
        return { success: false, error: errMsg };
      }

      const videoId = String(data.id);
      const permalink = `https://www.facebook.com/${pageId}/videos/${videoId}`;
      console.log(`[FacebookPublish] Berhasil dipublish ke Facebook! Video ID: ${videoId}`);

      return {
        success: true,
        videoId,
        permalink,
      };
    } catch (err: any) {
      console.error("[FacebookPublish] Exception:", err);
      return {
        success: false,
        error: err.message || "Terjadi kesalahan koneksi saat mempublish ke Facebook.",
      };
    }
  }
}

