export interface InstagramPublishResult {
  success: boolean;
  mediaId?: string;
  permalink?: string;
  error?: string;
}

export class InstagramPublishService {
  /**
   * Publikasikan video ke Instagram Reels menggunakan Meta Graph API resmi
   * @param params Parameter autentikasi dan video
   */
  static async publishReel(params: {
    instagramUserId: string;
    accessToken: string;
    videoUrl: string;
    caption: string;
  }): Promise<InstagramPublishResult> {
    const { instagramUserId, accessToken, videoUrl, caption } = params;

    if (!instagramUserId || !accessToken) {
      return {
        success: false,
        error: "Akun Instagram belum terhubung atau token tidak ditemukan.",
      };
    }

    if (!videoUrl.startsWith("https://")) {
      return {
        success: false,
        error: `Meta Instagram API mewajibkan URL video publik dengan HTTPS (misal via ngrok). URL saat ini: ${videoUrl}`,
      };
    }

    try {
      console.log(`[InstagramPublish] Membuat Reels container untuk user ${instagramUserId}...`);
      console.log(`[InstagramPublish] Video URL: ${videoUrl}`);

      // 1. Buat Container Reels di Meta Graph API
      const createContainerUrl = `https://graph.instagram.com/v21.0/${instagramUserId}/media`;
      const containerRes = await fetch(createContainerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_type: "REELS",
          video_url: videoUrl,
          caption: caption.includes("#") ? caption : `${caption}\n\n#shorts #reels #viral`,
          access_token: accessToken,
        }),
      });

      const containerData = await containerRes.json();
      if (!containerRes.ok || !containerData.id) {
        console.error("[InstagramPublish] Gagal membuat container:", containerData);
        const errMsg =
          containerData.error?.error_user_msg ||
          containerData.error?.message ||
          "Gagal membuat container Reels di Instagram API.";
        return { success: false, error: errMsg };
      }

      const containerId = containerData.id;
      console.log(`[InstagramPublish] Container berhasil dibuat (ID: ${containerId}). Memeriksa status encoding Meta...`);

      // 2. Polling status container sampai FINISHED (maksimal 2.5 menit)
      let isReady = false;
      const maxAttempts = 30; // 30 x 5 detik = 150 detik

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusRes = await fetch(
          `https://graph.instagram.com/v21.0/${containerId}?fields=status_code,status&access_token=${accessToken}`
        );
        const statusData = await statusRes.json();
        console.log(`[InstagramPublish] Pengecekan status ${attempt}/${maxAttempts}: ${statusData.status_code || "UNKNOWN"}`);

        if (statusData.status_code === "FINISHED") {
          isReady = true;
          break;
        } else if (statusData.status_code === "ERROR") {
          return {
            success: false,
            error: `Instagram gagal memproses video: ${statusData.status || "Format video tidak valid atau video tidak dapat diunduh oleh Meta."}`,
          };
        }
      }

      if (!isReady) {
        return {
          success: false,
          error: "Timeout: Video membutuhkan waktu terlalu lama untuk di-encode oleh Meta.",
        };
      }

      // 3. Publish Media Container
      console.log(`[InstagramPublish] Mempublish container ${containerId}...`);
      const publishRes = await fetch(
        `https://graph.instagram.com/v21.0/${instagramUserId}/media_publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: accessToken,
          }),
        }
      );

      const publishData = await publishRes.json();
      if (!publishRes.ok || !publishData.id) {
        console.error("[InstagramPublish] Gagal publish media:", publishData);
        return {
          success: false,
          error: publishData.error?.message || "Gagal mempublish Reels ke Instagram.",
        };
      }

      const mediaId = publishData.id;
      console.log(`[InstagramPublish] Berhasil dipublish! Media ID: ${mediaId}`);

      // 4. Ambil permalink postingan Reels
      let permalink: string | undefined;
      try {
        const mediaInfoRes = await fetch(
          `https://graph.instagram.com/v21.0/${mediaId}?fields=permalink&access_token=${accessToken}`
        );
        const mediaInfo = await mediaInfoRes.json();
        permalink = mediaInfo.permalink;
      } catch (e) {
        console.warn("[InstagramPublish] Gagal mengambil permalink:", e);
      }

      return {
        success: true,
        mediaId,
        permalink,
      };
    } catch (err: any) {
      console.error("[InstagramPublish] Exception:", err);
      return {
        success: false,
        error: err.message || "Terjadi kesalahan koneksi saat mempublish ke Instagram.",
      };
    }
  }
}

