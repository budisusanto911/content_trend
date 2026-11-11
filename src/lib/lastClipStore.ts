import fs from "fs";
import path from "path";

export interface PublishLog {
  platform: string;
  success: boolean;
  permalink?: string;
  error?: string;
  publishedAt: string;
}

export interface LastClipData {
  outputFile: string;
  title: string;
  badge?: string;
  hook?: string;
  tags?: string[];
  hashtags?: string[];
  sourceUrl?: string;
  startTime?: string;
  endTime?: string;
  updatedAt: string;
  published: boolean;
  publishedTo?: PublishLog[];
}

class LastClipStore {
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
    this.filePath = path.join(dataDir, "last_clip.json");
  }

  get(): LastClipData | null {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, "utf8");
        const data = JSON.parse(content);
        // Pastikan file video fisik benar-benar masih ada di folder public
        const publicFile = path.join(process.cwd(), "public", data.outputFile.replace(/^\//, ""));
        if (fs.existsSync(publicFile)) {
          return data;
        }
      }

      // Fallback: Jika last_clip.json belum ada tetapi video public/clips/final_ready_to_upload.mp4 sudah ada
      const defaultVideo = path.join(process.cwd(), "public", "clips", "final_ready_to_upload.mp4");
      if (fs.existsSync(defaultVideo)) {
        const fallback: LastClipData = {
          outputFile: "/clips/final_ready_to_upload.mp4",
          title: "Klip Hasil Generate Terakhir",
          updatedAt: fs.statSync(defaultVideo).mtime.toISOString(),
          published: false,
          publishedTo: [],
        };
        this.save(fallback);
        return fallback;
      }
    } catch (e) {
      console.error("Error reading last_clip.json:", e);
    }
    return null;
  }

  save(data: LastClipData): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("Error saving last_clip.json:", e);
    }
  }

  update(patch: Partial<LastClipData>): LastClipData {
    const current = this.get() || {
      outputFile: "/clips/final_ready_to_upload.mp4",
      title: "Klip Hasil Generate Terakhir",
      updatedAt: new Date().toISOString(),
      published: false,
      publishedTo: [],
    };
    const updated = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.save(updated);
    return updated;
  }
}

export const lastClipStore = new LastClipStore();

