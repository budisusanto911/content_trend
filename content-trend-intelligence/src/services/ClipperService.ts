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
    thread?: { threads: string[]; full_text: string };
    communityPost?: { post_text: string; poll_question: string; poll_options: string[] };
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
    const scriptCandidates = [
      path.join(process.cwd(), "clipper_pipeline.py"),
      path.join(process.cwd(), "..", "clipper_pipeline.py"),
    ];
    const scriptPath = scriptCandidates.find((p) => fs.existsSync(p)) || scriptCandidates[0];
    const scriptDir = fs.existsSync(scriptPath) ? path.dirname(scriptPath) : process.cwd();

    const metaCandidates = [
      path.join(process.cwd(), "data", "last_clip.json"),
      path.join(process.cwd(), "content-trend-intelligence", "data", "last_clip.json"),
      path.join(scriptDir, "data", "last_clip.json"),
      path.join(scriptDir, "content-trend-intelligence", "data", "last_clip.json"),
    ];

    const pythonCandidates = [
      path.join(scriptDir, "venv", "bin", "python3"),
      path.join(process.cwd(), "venv", "bin", "python3"),
    ];
    const pythonBin = pythonCandidates.find((p) => fs.existsSync(p)) || "python3";
    const startedAt = Date.now();

    console.log("[Clipper] Menjalankan AI Clipper Pipeline:", pythonBin, scriptPath, url);
    globalThis.__clipperBusy = true;

    return new Promise<ClipRunResult>((resolve) => {
      let logs = "";
      const done = (r: ClipRunResult) => {
        globalThis.__clipperBusy = false;
        resolve(r);
      };

      const pyProcess = spawn(pythonBin, [scriptPath, url], {
        cwd: scriptDir,
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
          const detail = logs.trim() ? `: ${logs.trim().split("\n").slice(-3).join(" ")}` : "";
          done({ success: false, code, logs, error: `Python script gagal (code: ${code})${detail}` });
          return;
        }

        let clip: ClipRunResult["clip"];
        try {
          const metaPath = metaCandidates.find((p) => fs.existsSync(p) && fs.statSync(p).mtimeMs >= startedAt - 2000)
            || metaCandidates.find((p) => fs.existsSync(p));
          if (metaPath) {
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
              thread: meta.thread,
              communityPost: meta.communityPost,
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

