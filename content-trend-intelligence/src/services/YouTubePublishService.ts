import fs from "fs";
import path from "path";

export interface YouTubePublishResult {
  success: boolean;
  videoId?: string;
  permalink?: string;
  error?: string;
}

export class YouTubePublishService {
  /**
   * Refresh Google access token jika token kedaluwarsa
   */
  static async refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
      const clientId = process.env.YOUTUBE_CLIENT_ID;
      const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const data = await res.json();
      return data.access_token || null;
    } catch (e) {
      console.error("[YouTubePublish] Gagal refresh token:", e);
      return null;
    }
  }

  /**
   * Upload video ke YouTube Shorts menggunakan YouTube Data API v3 resmi
   */
  static async uploadShort(params: {
    accessToken: string;
    refreshToken?: string | null;
    videoFilePath: string; // Relatif dari public atau absolut
    title: string;
    description?: string;
    tags?: string[];
  }): Promise<YouTubePublishResult> {
    let { accessToken, refreshToken, videoFilePath, title, description, tags } = params;

    try {
      // 1. Tentukan path fisik file video di disk
      let absolutePath = videoFilePath;
      if (!fs.existsSync(absolutePath)) {
        const cleanRel = videoFilePath.replace(/^\//, "");
        const candidates = [
          path.join(process.cwd(), "public", cleanRel),
          path.join(process.cwd(), cleanRel),
          path.join(process.cwd(), "content-trend-intelligence", "public", cleanRel),
        ];
        for (const cand of candidates) {
          if (fs.existsSync(cand)) {
            absolutePath = cand;
            break;
          }
        }
      }

      if (!fs.existsSync(absolutePath)) {
        return {
          success: false,
          error: `File video tidak ditemukan di server: ${absolutePath}`,
        };
      }

      const fileStats = fs.statSync(absolutePath);
      const fileSize = fileStats.size;
      const fileStream = fs.readFileSync(absolutePath);

      console.log(`[YouTubePublish] Memulai upload ke YouTube: ${title} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);
      if (tags && tags.length > 0) {
        console.log(`[YouTubePublish] SEO Search Tags (${tags.length}):`, tags.join(", "));
      }

      // 2. Inisialisasi Resumable Upload Session
      const cleanTitle = title.length > 85 ? title.slice(0, 85) + "..." : title;
      const finalTitle = cleanTitle.toLowerCase().includes("#shorts") ? cleanTitle : `${cleanTitle} #shorts`;

      const metadata: Record<string, any> = {
        snippet: {
          title: finalTitle.slice(0, 100),
          description: description || `${title}\n\n#shorts #viral #video`,
          categoryId: "22", // People & Blogs
          tags: tags && tags.length > 0 ? tags.slice(0, 25) : undefined,
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
        },
      };

      let initRes = await fetch(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/mp4",
            "X-Upload-Content-Length": String(fileSize),
          },
          body: JSON.stringify(metadata),
        }
      );

      // Jika token expired (401), coba refresh token jika ada
      if (initRes.status === 401 && refreshToken) {
        console.log("[YouTubePublish] Access token kedaluwarsa, mencoba refresh...");
        const newToken = await this.refreshAccessToken(refreshToken);
        if (newToken) {
          accessToken = newToken;
          initRes = await fetch(
            "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json; charset=UTF-8",
                "X-Upload-Content-Type": "video/mp4",
                "X-Upload-Content-Length": String(fileSize),
              },
              body: JSON.stringify(metadata),
            }
          );
        }
      }

      if (!initRes.ok) {
        const errData = await initRes.json().catch(() => ({}));
        console.error("[YouTubePublish] Inisialisasi upload gagal:", errData);
        return {
          success: false,
          error:
            errData.error?.message ||
            `Gagal memulai upload YouTube (Status ${initRes.status}). Pastikan YouTube Data API v3 aktif di Google Cloud Console.`,
        };
      }

      const uploadLocation = initRes.headers.get("location");
      if (!uploadLocation) {
        return {
          success: false,
          error: "Google API tidak mengembalikan URL upload (Location header missing).",
        };
      }

      console.log("[YouTubePublish] Upload session didapatkan. Mengunggah data video stream...");

      // 3. Upload binary data video ke Resumable Location
      const uploadRes = await fetch(uploadLocation, {
        method: "PUT",
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(fileSize),
        },
        body: fileStream,
      });

      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok || !uploadResult.id) {
        console.error("[YouTubePublish] Upload video bytes gagal:", uploadResult);
        return {
          success: false,
          error: uploadResult.error?.message || "Gagal mengunggah video ke YouTube.",
        };
      }

      const videoId = uploadResult.id;
      const permalink = `https://www.youtube.com/shorts/${videoId}`;
      console.log(`[YouTubePublish] Video Shorts berhasil dipublikasikan! ID: ${videoId}`);

      return {
        success: true,
        videoId,
        permalink,
      };
    } catch (err: any) {
      console.error("[YouTubePublish] Exception:", err);
      return {
        success: false,
        error: err.message || "Terjadi kesalahan saat mempublish ke YouTube",
      };
    }
  }
}

