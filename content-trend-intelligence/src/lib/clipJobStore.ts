import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { PublishLog } from "@/lib/lastClipStore";

export type ClipJobStatus =
  | "queued"
  | "clipping"
  | "ready"
  | "publishing"
  | "published"
  | "failed"
  | "skipped";

export interface ClipJobClip {
  outputFile: string;
  title: string;
  hook?: string;
  badge?: string;
  tags?: string[];
  hashtags?: string[];
  startTime?: string;
  endTime?: string;
  thread?: { threads: string[]; full_text: string };
  communityPost?: { post_text: string; poll_question: string; poll_options: string[] };
}

export interface ClipJob {
  id: string;
  watchlistId: string;
  videoId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceCreator?: string;
  thumbnailUrl?: string;
  matchedKeyword?: string;
  status: ClipJobStatus;
  /** Untuk watchlist dengan requireApproval */
  approved: boolean;
  clip?: ClipJobClip;
  publishResults?: PublishLog[];
  error?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

const MAX_JOBS_KEPT = 300;

class ClipJobStore {
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
    this.filePath = path.join(dataDir, "clip_jobs.json");
  }

  private readAll(): ClipJob[] {
    try {
      if (!fs.existsSync(this.filePath)) return [];
      const raw = fs.readFileSync(this.filePath, "utf8");
      return JSON.parse(raw || "[]");
    } catch (e) {
      console.error("Gagal membaca clip_jobs.json:", e);
      return [];
    }
  }

  private writeAll(jobs: ClipJob[]) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(jobs.slice(0, MAX_JOBS_KEPT), null, 2), "utf8");
    } catch (e) {
      console.error("Gagal menyimpan clip_jobs.json:", e);
    }
  }

  /** Terbaru di depan */
  list(): ClipJob[] {
    return this.readAll();
  }

  get(id: string): ClipJob | undefined {
    return this.readAll().find((j) => j.id === id);
  }

  exists(watchlistId: string, videoId: string): boolean {
    return this.readAll().some((j) => j.watchlistId === watchlistId && j.videoId === videoId);
  }

  create(
    data: Omit<ClipJob, "id" | "status" | "attempts" | "createdAt" | "updatedAt" | "approved"> & {
      approved?: boolean;
    }
  ): ClipJob {
    const jobs = this.readAll();
    const now = new Date().toISOString();
    const job: ClipJob = {
      approved: false,
      ...data,
      id: crypto.randomUUID(),
      status: "queued",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    jobs.unshift(job);
    this.writeAll(jobs);
    return job;
  }

  update(id: string, patch: Partial<ClipJob>): ClipJob | null {
    const jobs = this.readAll();
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) return null;
    jobs[idx] = { ...jobs[idx], ...patch, id, updatedAt: new Date().toISOString() };
    this.writeAll(jobs);
    return jobs[idx];
  }

  delete(id: string): boolean {
    const jobs = this.readAll();
    const filtered = jobs.filter((j) => j.id !== id);
    this.writeAll(filtered);
    return filtered.length !== jobs.length;
  }

  deleteByWatchlist(watchlistId: string) {
    // Hanya hapus yang belum diproses, riwayat publish tetap disimpan
    const jobs = this.readAll().filter(
      (j) => !(j.watchlistId === watchlistId && (j.status === "queued" || j.status === "ready"))
    );
    this.writeAll(jobs);
  }
}

export const clipJobStore = new ClipJobStore();

