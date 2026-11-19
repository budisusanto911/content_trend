import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export type DoodleTheme = "navy_blue" | "emerald_sage" | "terracotta_warm" | "charcoal_gold";

export interface DoodleScene {
  icon: string;
  text: string;
}

export interface RetroVideoOptions {
  seriesTag: string;
  title: string;
  speaker: string;
  footerBrand: string;
  theme: DoodleTheme;
  bgStyle?: string;
  bgImagePath?: string;
  borderStyle?: string;
  borderImagePath?: string;
  voice?: string;
  scenes: DoodleScene[];
  previewSceneIndex?: number;
}

export interface RetroVideoResult {
  success: boolean;
  videoUrl?: string;
  previewUrl?: string;
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
   * Generates a fast 1-frame preview image for a specific scene
   */
  static async generatePreview(options: RetroVideoOptions): Promise<RetroVideoResult> {
    const pythonBin = this.getPythonPath();
    const scriptPath = this.getScriptPath();
    const rootDir = this.getProjectRoot();

    const timestamp = Date.now();
    const filename = `preview_${options.theme}_${timestamp}.png`;
    const publicClipsDir = path.join(rootDir, "content-trend-intelligence", "public", "clips");
    fs.mkdirSync(publicClipsDir, { recursive: true });
    const fullOutputPath = path.join(publicClipsDir, filename);

    const idx = options.previewSceneIndex ?? 0;
    const activeScene = options.scenes?.[idx] || options.scenes?.[0] || {
      icon: "mimbar",
      text: "Bila khatib naik mimbar, ia menghadap jamaah dan *memberi salam.*",
    };

    const args = [
      scriptPath,
      "--preview",
      "--series", options.seriesTag || "",
      "--title", options.title || "Tempat Berdoa di Hari Jumat",
      "--speaker", options.speaker || "",
      "--footer", options.footerBrand || "",
      "--theme", options.theme || "navy_blue",
      "--bg-style", options.bgStyle || "classic_cream",
      ...(options.bgImagePath ? ["--bg-image", options.bgImagePath] : []),
      "--border-style", options.borderStyle || "islamic_star",
      ...(options.borderImagePath ? ["--border-image", options.borderImagePath] : []),
      "--icon", activeScene.icon || "mimbar",
      "--text", activeScene.text || "",
      "--scenes-json", JSON.stringify([activeScene]),
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
            previewUrl: `/clips/${filename}`,
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
   * Renders the complete multi-scene DzikirQu Doodle Motion Reel
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

    const scenesFile = path.join(rootDir, "data", "temp_retro", `scenes_${timestamp}.json`);
    fs.mkdirSync(path.dirname(scenesFile), { recursive: true });
    fs.writeFileSync(scenesFile, JSON.stringify(options.scenes, null, 2), "utf-8");

    const args = [
      scriptPath,
      "--series", options.seriesTag || "",
      "--title", options.title || "Tempat Berdoa di Hari Jumat",
      "--speaker", options.speaker || "",
      "--footer", options.footerBrand || "",
      "--theme", options.theme || "navy_blue",
      "--bg-style", options.bgStyle || "classic_cream",
      ...(options.bgImagePath ? ["--bg-image", options.bgImagePath] : []),
      "--border-style", options.borderStyle || "islamic_star",
      ...(options.borderImagePath ? ["--border-image", options.borderImagePath] : []),
      "--voice", options.voice || "id-ID-ArdiNeural",
      "--scenes-json", scenesFile,
      "--output", fullOutputPath,
    ];

    return new Promise((resolve) => {
      let logs = "";
      const proc = spawn(pythonBin, args, { cwd: rootDir });

      proc.stdout.on("data", (d) => { logs += d.toString(); });
      proc.stderr.on("data", (d) => { logs += d.toString(); });

      proc.on("close", (code) => {
        try { fs.unlinkSync(scenesFile); } catch {}
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
   * Curated multi-scene presets (0 AI tokens) + dynamic topic adaptation
   */
  static async generateScriptConcept(topic?: string): Promise<{
    seriesTag: string;
    title: string;
    speaker: string;
    theme: DoodleTheme;
    scenes: DoodleScene[];
  }> {
    const presets: Array<{
      seriesTag: string;
      title: string;
      speaker: string;
      theme: DoodleTheme;
      scenes: DoodleScene[];
    }> = [
      {
        seriesTag: "SERI JUMAT 3/3",
        title: "Tempat Berdoa di Hari Jumat",
        speaker: "Syaikh Prof. Dr. Badr bin Nashir al-Badr",
        theme: "navy_blue",
        scenes: [
          { icon: "mimbar", text: "Bila khatib naik mimbar, ia menghadap jamaah dan *memberi salam.*" },
          { icon: "speech", text: "Jawab muadzin, lalu berdoa. Berdoalah *di antara dua khutbah.*" },
          { icon: "stairs", text: "Berdoalah juga saat ia *turun dari mimbar,* selesai khutbah kedua, sampai shalat dimulai." },
          { icon: "tasbih", text: "dan di *akhir tasyahud terakhir.* Semua ini adalah *tempat dikabulkannya doa.*" },
        ],
      },
      {
        seriesTag: "SERI KETENANGAN 1/3",
        title: "Obat Hati yang Sedang Gelisah",
        speaker: "Fawaid & Tadabbur Harian",
        theme: "emerald_sage",
        scenes: [
          { icon: "heart", text: "Hati manusia tidak diciptakan untuk menampung *seluruh beban dunia.*" },
          { icon: "book", text: "Allah berfirman: hanya dengan mengingat Allah, *hati menjadi tenang.*" },
          { icon: "hands", text: "Angkat tanganmu, adukan segala resahmu *hanya kepada-Nya.*" },
          { icon: "tasbih", text: "Basahi lisan dengan istighfar, niscaya Allah datangkan *jalan keluar.*" },
        ],
      },
      {
        seriesTag: "SERI TAHAJJUD 2/3",
        title: "Keajaiban Sepertiga Malam",
        speaker: "Nasihat Ulama Salaf",
        theme: "charcoal_gold",
        scenes: [
          { icon: "crescent", text: "Ketika seluruh dunia terlelap, ada *pintu langit yang terbuka.*" },
          { icon: "clock", text: "Di sepertiga malam terakhir, Allah turun dan *mengabulkan setiap pinta.*" },
          { icon: "mosque", text: "Bangunlah walau hanya dua rakaat, *bisikkan hajat terdalammu.*" },
          { icon: "scrolls", text: "Sebab doa di waktu sahur bagaikan *anak panah yang tak meleset.*" },
        ],
      },
    ];

    if (!topic || !topic.trim()) {
      return presets[Math.floor(Math.random() * presets.length)];
    }

    const cleanTopic = topic.trim();
    return {
      seriesTag: "SERI RENUNGAN 1/1",
      title: cleanTopic,
      speaker: "Catatan Hikmah Harian",
      theme: "navy_blue",
      scenes: [
        { icon: "book", text: `Mari sejenak merenungi makna *${cleanTopic}* dalam kehidupan kita.` },
        { icon: "heart", text: `Sering kali hati lupa bahwa setiap takdir selalu membawa *hikmah terbaik.*` },
        { icon: "hands", text: `Perbanyaklah berdoa agar Allah kuatkan hati dan *melapangkan dada kita.*` },
        { icon: "tasbih", text: `Semoga setiap langkah kita senantiasa berada dalam *ridha dan keberkahan-Nya.*` },
      ],
    };
  }
}
