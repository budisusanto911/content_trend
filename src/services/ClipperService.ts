import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export interface ClipRunResult {
  success: boolean;
  code: number | null;
  logs: string;
  error?: string;
  /** Metadata klip hasil pipeline (dibaca dari data/last_clip.json) */
  clip?: {
    outputFile: string;
    title: string;
    hook?: string;
    badge?: string;
    tags?: string[];
    hashtags?: string[];
    startTime?: string;
    endTime?: string;
    sourceUrl?: string;
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __clipperMutex: Promise<unknown> | undefined;
  // eslint-disable-next-line no-var
  var __clipperBusy: boolean | undefined;
}

/**
 * Menjalankan clipper_pipeline.py. Semua pemanggilan diserialisasi (1 proses python sekaligus)
 * karena pipeline memakai file temp bersama (temp_raw.mp4, temp_subtitles.ass, dll).
 */
export class ClipperService {
  static isBusy(): boolean {
    return Boolean(globalThis.__clipperBusy);
  }

  static runClip(url: string): Promise<ClipRunResult> {
    const prev = globalThis.__clipperMutex || Promise.resolve();
    const next = prev.catch(() => undefined).then(() => this.spawnPipeline(url));
    globalThis.__clipperMutex = next.catch(() => undefined);
    return next;
  }

  private static spawnPipeline(url: string): Promise<ClipRunResult> {
    const scriptPath = path.join(process.cwd(), "..", "clipper_pipeline.py");
    const metaPath = path.join(process.cwd(), "data", "last_clip.json");
    const startedAt = Date.now();

    console.log("[Clipper] Menjalankan AI Clipper Pipeline:", "python3", scriptPath, url);
    globalThis.__clipperBusy = true;

    return new Promise<ClipRunResult>((resolve) => {
      let logs = "";
      const done = (r: ClipRunResult) => {
        globalThis.__clipperBusy = false;
        resolve(r);
      };

      const pyProcess = spawn("python3", [scriptPath, url], {
        env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONWARNINGS: "ignore" },
      });

      pyProcess.stdout.on("data", (data) => {
        const text = data.toString();
        logs += text;
        process.stdout.write(text);
      });
      pyProcess.stderr.on("data", (data) => {
        const text = data.toString();
        logs += text;
        process.stderr.write(text);
      });

      pyProcess.on("close", (code) => {
        if (code !== 0) {
          done({ success: false, code, logs, error: `Python script gagal (code: ${code})` });
          return;
        }

        let clip: ClipRunResult["clip"];
        try {
          if (fs.existsSync(metaPath) && fs.statSync(metaPath).mtimeMs >= startedAt - 1000) {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
            clip = {
              outputFile: meta.outputFile,
              title: meta.title,
              hook: meta.hook,
              badge: meta.badge,
              tags: meta.tags,
              hashtags: meta.hashtags,
              startTime: meta.startTime,
              endTime: meta.endTime,
              sourceUrl: meta.sourceUrl,
            };
          }
        } catch (e) {
          console.error("[Clipper] Gagal membaca metadata klip:", e);
        }

        done({ success: true, code, logs, clip });
      });

      pyProcess.on("error", (err) => {
        done({ success: false, code: null, logs, error: err.message });
      });
    });
  }
}

