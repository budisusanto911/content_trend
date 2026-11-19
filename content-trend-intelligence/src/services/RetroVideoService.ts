import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export interface RetroVideoOptions {
  imagePath?: string;
  hook: string;
  script: string;
  inkName: "charcoal" | "terracotta" | "sage_olive" | "vintage_navy" | "sepia_brown";
  paperType: "cream" | "kraft" | "parchment";
  voice?: string;
}

export interface RetroVideoResult {
  success: boolean;
  videoUrl?: string;
  previewUrl?: string;
  duration?: number;
  error?: string;
  logs: string;
}

export class RetroVideoService {
  private static getPythonPath(): string {
    const candidates = [
      path.join(process.cwd(), "venv", "bin", "python3"),
      path.join(process.cwd(), "..", "venv", "bin", "python3"),
      path.join(process.cwd(), "venv", "bin", "python"),
      path.join(process.cwd(), "..", "venv", "bin", "python"),
    ];
    return candidates.find((p) => fs.existsSync(p)) || "python3";
  }

  private static getScriptPath(): string {
    const candidates = [
      path.join(process.cwd(), "toolkit", "retro_video_engine.py"),
      path.join(process.cwd(), "..", "toolkit", "retro_video_engine.py"),
    ];
    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) {
      throw new Error("retro_video_engine.py not found");
    }
    return found;
  }

  private static getProjectRoot(): string {
    const scriptPath = this.getScriptPath();
    return path.dirname(path.dirname(scriptPath));
  }

  /**
   * Generates a fast 1-frame preview image
   */
  static async generatePreview(options: RetroVideoOptions): Promise<RetroVideoResult> {
    const pythonBin = this.getPythonPath();
    const scriptPath = this.getScriptPath();
    const rootDir = this.getProjectRoot();

    const timestamp = Date.now();
    const outputRel = `/clips/preview_${options.inkName}_${options.paperType}_${timestamp}.png`;
    const publicClipsDir = path.join(rootDir, "content-trend-intelligence", "public", "clips");
    fs.mkdirSync(publicClipsDir, { recursive: true });
    const fullOutputPath = path.join(publicClipsDir, `preview_${options.inkName}_${options.paperType}_${timestamp}.png`);

    let inputImg = options.imagePath || path.join(rootDir, "test_orig_frame.png");
    if (!fs.existsSync(inputImg)) {
      inputImg = path.join(rootDir, "test_orig_frame.png");
    }

    const args = [
      scriptPath,
      "--preview",
      "--image", inputImg,
      "--ink", options.inkName,
      "--paper", options.paperType,
      "--output", fullOutputPath,
    ];

    return new Promise((resolve) => {
      let logs = "";
      const proc = spawn(pythonBin, args, { cwd: rootDir });

      proc.stdout.on("data", (d) => { logs += d.toString(); });
      proc.stderr.on("data", (d) => { logs += d.toString(); });

      proc.on("close", (code) => {
        if (code === 0 && fs.existsSync(fullOutputPath)) {
          resolve({
            success: true,
            previewUrl: outputRel,
            logs,
          });
        } else {
          resolve({
            success: false,
            error: `Preview render exited with code ${code}`,
            logs,
          });
        }
      });
    });
  }

  /**
   * Renders the complete retro video
   */
  static async renderVideo(options: RetroVideoOptions): Promise<RetroVideoResult> {
    const pythonBin = this.getPythonPath();
    const scriptPath = this.getScriptPath();
    const rootDir = this.getProjectRoot();

    const timestamp = Date.now();
    const outputFilename = `retro_${timestamp}.mp4`;
    const publicClipsDir = path.join(rootDir, "content-trend-intelligence", "public", "clips");
    fs.mkdirSync(publicClipsDir, { recursive: true });
    const fullOutputPath = path.join(publicClipsDir, outputFilename);

    let inputImg = options.imagePath || path.join(rootDir, "test_orig_frame.png");
    if (!fs.existsSync(inputImg)) {
      inputImg = path.join(rootDir, "test_orig_frame.png");
    }

    const args = [
      scriptPath,
      "--image", inputImg,
      "--hook", options.hook || "Ketika Hatimu Merasa Lelah",
      "--script", options.script || "Tenangkan hatimu, perbanyaklah bersyukur dan beristighfar.",
      "--ink", options.inkName || "charcoal",
      "--paper", options.paperType || "cream",
      "--voice", options.voice || "id-ID-ArdiNeural",
      "--output", fullOutputPath,
    ];

    return new Promise((resolve) => {
      let logs = "";
      const proc = spawn(pythonBin, args, { cwd: rootDir });

      proc.stdout.on("data", (d) => { logs += d.toString(); });
      proc.stderr.on("data", (d) => { logs += d.toString(); });

      proc.on("close", (code) => {
        if (code === 0 && fs.existsSync(fullOutputPath)) {
          resolve({
            success: true,
            videoUrl: `/clips/${outputFilename}`,
            logs,
          });
        } else {
          resolve({
            success: false,
            error: `Video render failed with code ${code}`,
            logs,
          });
        }
      });
    });
  }

  /**
   * Generates contemplative quote ideas with token efficiency or built-in templates
   */
  static async generateScriptConcept(topic?: string, theme = "dzikir_peace"): Promise<{
    hook: string;
    script: string;
    recommendedInk: "charcoal" | "terracotta" | "sage_olive" | "vintage_navy" | "sepia_brown";
    recommendedPaper: "cream" | "kraft" | "parchment";
  }> {
    // Curated high quality presets (Zero tokens needed!)
    const presets = [
      {
        hook: "Ketika Semuanya Terasa Terlalu Berat",
        script: "Ingatlah firman-Nya: Tidaklah Allah membebani seseorang melainkan sesuai dengan kesanggupannya. Tarik nafasmu, kembalikan semua urusan kepada-Nya.",
        recommendedInk: "charcoal" as const,
        recommendedPaper: "cream" as const,
      },
      {
        hook: "Ketenangan Yang Dicari Hati",
        script: "Hati ini diciptakan bukan untuk menampung seluruh beban dunia, melainkan untuk mengingat Sang Pemilik Semesta. 'Ala bidzikrillahi tathma'innul qulub.",
        recommendedInk: "sage_olive" as const,
        recommendedPaper: "parchment" as const,
      },
      {
        hook: "Jangan Takut Kehilangan Esok",
        script: "Setiap hembusan nafas yang engkau hirup hari ini adalah bukti bahwa kasih sayang-Nya belum berakhir. Berdoalah, lalu biarkan takdir terbaik-Nya bekerja.",
        recommendedInk: "terracotta" as const,
        recommendedPaper: "kraft" as const,
      },
      {
        hook: "Di Sepertiga Malam Yang Sunyi",
        script: "Ketika dunia tertidur dan tak ada yang mendengar keluh kesahmu, ada pintu langit yang selalu terbuka lebar bagi mereka yang menengadahkan tangan.",
        recommendedInk: "vintage_navy" as const,
        recommendedPaper: "cream" as const,
      },
      {
        hook: "Satu Detik Bersyukur Mengubah Segalanya",
        script: "Bukan bahagia yang membuat kita bersyukur, tetapi rasa syukurlah yang mengalirkan ketenangan ke setiap celah hati kita yang sempat gundah.",
        recommendedInk: "sepia_brown" as const,
        recommendedPaper: "kraft" as const,
      }
    ];

    if (!topic || topic.trim().length === 0) {
      return presets[Math.floor(Math.random() * presets.length)];
    }

    // Return a themed concept matching the topic
    return {
      hook: `Renungan: ${topic}`,
      script: `Semoga di balik setiap ujian ${topic.toLowerCase()}, Allah titipkan ketabahan, hikmah yang mendalam, dan kedamaian yang tak pernah terbayangkan sebelumnya.`,
      recommendedInk: "charcoal",
      recommendedPaper: "cream",
    };
  }
}
