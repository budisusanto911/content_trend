import fs from "fs";
import path from "path";
import crypto from "crypto";

export type PublishPlatform = "instagram" | "youtube";

export interface WatchlistItem {
  id: string;
  /** Label judul, misal "Podcast Deddy" */
  title: string;
  /** Kata kunci pencocokan (dicek ke judul, creator, hashtag video trending) */
  keywords: string[];
  /** Opsional: hanya cocokkan video dari channel/creator ini */
  matchCreator?: string;
  /** Akun tujuan (PublisherProfile id) */
  profileId: string;
  platforms: PublishPlatform[];
  enabled: boolean;
  /** Jam publish harian, format HH:mm (waktu lokal server) */
  publishTime: string;
  /** Jika true, klip harus di-approve manual sebelum ikut auto-publish */
  requireApproval: boolean;
  /** Batas klip baru yang dibuat per hari untuk judul ini */
  maxClipsPerDay: number;
  /** YYYY-MM-DD terakhir kali publish (kunci "1x sehari") */
  lastPublishedDate?: string | null;
  createdAt: string;
}

export type WatchlistInput = Omit<WatchlistItem, "id" | "createdAt" | "lastPublishedDate">;

class WatchlistStore {
  private filePath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {
        console.error("Gagal membuat folder data:", e);
      }
    }
    this.filePath = path.join(dataDir, "watchlist.json");
  }

  private readAll(): WatchlistItem[] {
    try {
      if (!fs.existsSync(this.filePath)) return [];
      const raw = fs.readFileSync(this.filePath, "utf8");
      return JSON.parse(raw || "[]");
    } catch (e) {
      console.error("Gagal membaca watchlist.json:", e);
      return [];
    }
  }

  private writeAll(items: WatchlistItem[]) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(items, null, 2), "utf8");
    } catch (e) {
      console.error("Gagal menyimpan watchlist.json:", e);
    }
  }

  list(): WatchlistItem[] {
    return this.readAll();
  }

  get(id: string): WatchlistItem | undefined {
    return this.readAll().find((w) => w.id === id);
  }

  create(input: WatchlistInput): WatchlistItem {
    const items = this.readAll();
    const item: WatchlistItem = {
      ...input,
      id: crypto.randomUUID(),
      lastPublishedDate: null,
      createdAt: new Date().toISOString(),
    };
    items.unshift(item);
    this.writeAll(items);
    return item;
  }

  update(id: string, patch: Partial<WatchlistItem>): WatchlistItem | null {
    const items = this.readAll();
    const idx = items.findIndex((w) => w.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...patch, id };
    this.writeAll(items);
    return items[idx];
  }

  delete(id: string): boolean {
    const items = this.readAll();
    const filtered = items.filter((w) => w.id !== id);
    this.writeAll(filtered);
    return filtered.length !== items.length;
  }
}

/**
 * Normalisasi & validasi input watchlist dari body request.
 * Mengembalikan string error jika tidak valid.
 */
export function sanitizeWatchlistInput(body: any, partial = false): Partial<WatchlistInput> | string {
  const out: Partial<WatchlistInput> = {};

  if (body.title !== undefined || !partial) {
    const title = String(body.title ?? "").trim();
    if (!title) return "Judul wajib diisi";
    out.title = title;
  }

  if (body.keywords !== undefined || !partial) {
    const raw = Array.isArray(body.keywords) ? body.keywords : String(body.keywords ?? "").split(",");
    const keywords = raw.map((k: any) => String(k).trim()).filter(Boolean);
    if (keywords.length === 0 && out.title) {
      out.keywords = [out.title];
    } else if (keywords.length === 0) {
      return "Minimal 1 keyword atau judul";
    } else {
      out.keywords = keywords;
    }
  }

  if (body.matchCreator !== undefined) {
    out.matchCreator = String(body.matchCreator ?? "").trim() || undefined;
  }

  if (body.profileId !== undefined || !partial) {
    const profileId = String(body.profileId ?? "").trim();
    if (!profileId) return "Akun tujuan wajib dipilih";
    out.profileId = profileId;
  }

  if (body.platforms !== undefined || !partial) {
    const platforms = (Array.isArray(body.platforms) ? body.platforms : []).filter(
      (p: any) => p === "instagram" || p === "youtube"
    );
    if (platforms.length === 0) return "Pilih minimal 1 platform";
    out.platforms = platforms;
  }

  if (body.publishTime !== undefined || !partial) {
    const t = String(body.publishTime ?? "19:00").trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return "Format jam publish harus HH:mm";
    out.publishTime = t;
  }

  if (body.enabled !== undefined || !partial) out.enabled = body.enabled !== false;
  if (body.requireApproval !== undefined || !partial) out.requireApproval = body.requireApproval === true;

  if (body.maxClipsPerDay !== undefined || !partial) {
    const n = Number(body.maxClipsPerDay ?? 1);
    out.maxClipsPerDay = Number.isFinite(n) ? Math.min(10, Math.max(1, Math.round(n))) : 1;
  }

  return out;
}

export const watchlistStore = new WatchlistStore();

