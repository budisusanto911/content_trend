export interface ThreadsPublishResult {
  success: boolean;
  mediaId?: string;
  permalink?: string;
  error?: string;
}

export class ThreadsPublishService {
  /**
   * Publikasikan video ke Meta Threads menggunakan Threads Graph API resmi
   */
  static async publishVideo(params: {
    threadsUserId: string;
    accessToken: string;
    videoUrl: string;
    caption: string;
  }): Promise<ThreadsPublishResult> {
    const { threadsUserId, accessToken, videoUrl, caption } = params;

    if (!threadsUserId || !accessToken) {
      return {
        success: false,
        error: "Akun Threads belum terhubung atau token tidak ditemukan.",
      };
    }

    if (!videoUrl.startsWith("https://")) {
      return {
        success: false,
        error: `Meta Threads API mewajibkan URL video publik dengan HTTPS (misal via ngrok). URL saat ini: ${videoUrl}`,
      };
    }

    try {
      console.log(`[ThreadsPublish] Membuat video container untuk user ${threadsUserId}...`);
      // Batas karakter teks di Threads adalah 500 karakter
      const text = caption.length > 495 ? `${caption.slice(0, 492)}...` : caption;

      // 1. Buat Media Container di Threads API
      const createUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;
      const containerRes = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "VIDEO",
          video_url: videoUrl,
          text,
          access_token: accessToken,
        }),
      });

      const containerData = await containerRes.json();
      if (!containerRes.ok || !containerData.id) {
        console.error("[ThreadsPublish] Gagal membuat container:", containerData);
        const errMsg =
          containerData.error?.error_user_msg ||
          containerData.error?.message ||
          "Gagal membuat container video di Threads API.";
        return { success: false, error: errMsg };
      }

      const containerId = containerData.id;
      console.log(`[ThreadsPublish] Container dibuat (ID: ${containerId}). Menunggu proses encoding...`);

      // 2. Polling status container sampai FINISHED (maks 2.5 menit)
      let isReady = false;
      const maxAttempts = 30;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusRes = await fetch(
          `https://graph.threads.net/v1.0/${containerId}?fields=status,error_message&access_token=${accessToken}`
        );
        const statusData = await statusRes.json();
        console.log(`[ThreadsPublish] Status ${attempt}/${maxAttempts}: ${statusData.status || "UNKNOWN"}`);

        if (statusData.status === "FINISHED") {
          isReady = true;
          break;
        } else if (statusData.status === "ERROR") {
          return {
            success: false,
            error: `Threads gagal memproses video: ${statusData.error_message || "Format video tidak valid."}`,
          };
        }
      }

      if (!isReady) {
        return {
          success: false,
          error: "Timeout: Video membutuhkan waktu terlalu lama untuk diproses oleh Threads.",
        };
      }

      // 3. Publish Threads Media Container
      const publishRes = await fetch(
        `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: accessToken,
          }),
        }
      );

      const publishData = await publishRes.json();
      if (!publishRes.ok || !publishData.id) {
        console.error("[ThreadsPublish] Gagal publish container:", publishData);
        return {
          success: false,
          error: publishData.error?.message || "Gagal mempublish video ke Threads.",
        };
      }

      const mediaId = String(publishData.id);
      let permalink: string | undefined;
      try {
        const infoRes = await fetch(
          `https://graph.threads.net/v1.0/${mediaId}?fields=permalink&access_token=${accessToken}`
        );
        const info = await infoRes.json();
        permalink = info.permalink;
      } catch (e) {
        console.warn("[ThreadsPublish] Gagal mengambil permalink:", e);
      }

      return {
        success: true,
        mediaId,
        permalink,
      };
    } catch (err: any) {
      console.error("[ThreadsPublish] Exception:", err);
      return {
        success: false,
        error: err.message || "Terjadi kesalahan koneksi saat mempublish ke Threads.",
      };
    }
  }
}

