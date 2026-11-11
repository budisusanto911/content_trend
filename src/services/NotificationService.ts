import { settingsStore } from "@/lib/settingsStore";

export interface NotificationPayload {
  title: string;
  hook?: string;
  videoPath?: string;
  sourceUrl?: string;
  permalinks?: { platform: string; url?: string | null }[];
  status?: "clipped" | "published" | "error";
  error?: string;
}

export class NotificationService {
  /**
   * Mengirim notifikasi webhook ke Discord atau Telegram berdasarkan konfigurasi
   */
  static async sendNotification(
    payload: NotificationPayload,
    customConfig?: { webhookType: "none" | "discord" | "telegram"; webhookUrl: string }
  ): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    const settings = customConfig || settingsStore.get();
    const { webhookType, webhookUrl } = settings;

    if (!webhookType || webhookType === "none" || !webhookUrl?.trim()) {
      return { success: true, skipped: true };
    }

    try {
      if (webhookType === "discord") {
        return await this.sendDiscordWebhook(webhookUrl.trim(), payload);
      } else if (webhookType === "telegram") {
        return await this.sendTelegramNotification(webhookUrl.trim(), payload);
      }

      return { success: true, skipped: true };
    } catch (err: any) {
      console.error("[NotificationService] Gagal mengirim notifikasi:", err);
      return { success: false, error: err.message || "Gagal mengirim webhook." };
    }
  }

  /**
   * Kirim webhook embed ke Discord
   */
  private static async sendDiscordWebhook(
    url: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    const isPublished = payload.status === "published";
    const isError = payload.status === "error";

    const linksText =
      payload.permalinks && payload.permalinks.length > 0
        ? payload.permalinks
            .map((p) => (p.url ? `🔗 **${p.platform.toUpperCase()}:** [Buka Video](${p.url})` : `🔗 **${p.platform.toUpperCase()}**`))
            .join("\n")
        : payload.videoPath
        ? `📁 File tersimpan di server: \`${payload.videoPath}\``
        : "";

    const embedColor = isError ? 0xef4444 : isPublished ? 0x10b981 : 0x6366f1;
    const titleHeader = isError
      ? "❌ Gagal Memproses / Publish Video"
      : isPublished
      ? "🚀 Video Shorts / Reels Berhasil Dipublish!"
      : "🎬 Video Klip Baru Selesai Dipotong & Dipolish!";

    const fields = [
      {
        name: "Status",
        value: isError ? "❌ Error" : isPublished ? "✅ Live di Sosmed" : "✨ Siap Dipublish",
        inline: true,
      },
    ];

    if (payload.hook) {
      fields.push({
        name: "Hook Penasaran (Curiosity Gap)",
        value: payload.hook,
        inline: false,
      });
    }

    if (payload.sourceUrl) {
      fields.push({
        name: "Video Asal",
        value: payload.sourceUrl,
        inline: false,
      });
    }

    if (payload.error) {
      fields.push({
        name: "Detail Kesalahan",
        value: `\`\`\`${payload.error}\`\`\``,
        inline: false,
      });
    }

    const discordBody = {
      username: "AI Clipper Bot",
      avatar_url: "https://img.icons8.com/fluency/96/bot.png",
      embeds: [
        {
          title: titleHeader,
          description: `**${payload.title}**\n\n${linksText}`,
          color: embedColor,
          fields,
          timestamp: new Date().toISOString(),
          footer: {
            text: "AI Video Clipper & Publisher Auto-Pilot",
          },
        },
      ],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordBody),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        success: false,
        error: `Discord webhook gagal (Status ${res.status}): ${errText}`,
      };
    }

    return { success: true };
  }

  /**
   * Kirim pesan ke Telegram Bot
   */
  private static async sendTelegramNotification(
    target: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    let apiUrl = "";
    let chatId = "";
    let messageText = "";

    const isPublished = payload.status === "published";
    const isError = payload.status === "error";

    const header = isError
      ? "❌ *GAGAL PROSES VIDEO*"
      : isPublished
      ? "🚀 *VIDEO BERHASIL DIPUBLISH!*"
      : "🎬 *KLIP BARU SELESAI DIPROSES!*";

    const linksList =
      payload.permalinks && payload.permalinks.length > 0
        ? payload.permalinks
            .map((p) => (p.url ? `• [${p.platform.toUpperCase()}](${p.url})` : `• ${p.platform.toUpperCase()}`))
            .join("\n")
        : payload.videoPath
        ? `• File: \`${payload.videoPath}\``
        : "";

    messageText = `${header}\n\n*Judul:* ${payload.title}\n`;
    if (payload.hook) {
      messageText += `*Hook:* ${payload.hook}\n`;
    }
    if (linksList) {
      messageText += `\n*Link Postingan:*\n${linksList}\n`;
    }
    if (payload.error) {
      messageText += `\n⚠️ *Error:* \`${payload.error}\`\n`;
    }
    messageText += `\n_Waktu: ${new Date().toLocaleString("id-ID")}_`;

    // Parsing target Telegram
    // Format 1: Full URL e.g. https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>
    if (target.startsWith("http")) {
      apiUrl = target;
      // Jika url belum ada body, kirim query / json
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: messageText,
          parse_mode: "Markdown",
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return { success: false, error: `Telegram request error (${res.status}): ${txt}` };
      }
      return { success: true };
    }

    // Format 2: <BOT_TOKEN>|<CHAT_ID> atau <BOT_TOKEN>:<CHAT_ID>
    let token = "";
    if (target.includes("|")) {
      const parts = target.split("|");
      token = parts[0].trim();
      chatId = parts[1].trim();
    } else if (target.includes(":")) {
      const parts = target.split(":");
      chatId = parts[parts.length - 1].trim();
      token = parts.slice(0, parts.length - 1).join(":").trim();
    }

    if (!token || !chatId) {
      return {
        success: false,
        error: "Format Telegram belum valid. Gunakan format 'BOT_TOKEN|CHAT_ID' atau URL Telegram sendMessage.",
      };
    }

    const tgEndpoint = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(tgEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok || !resData.ok) {
      return {
        success: false,
        error: resData.description || `Telegram bot error (Status ${res.status})`,
      };
    }

    return { success: true };
  }
}
