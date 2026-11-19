import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export type StickmanTheme = "calm_ink" | "warm_healing" | "happy_pop" | "midnight_chalk";
export type StickmanPaper = "notebook_grid" | "lined_journal" | "dot_journal" | "warm_sketchbook";
export type CharacterStyle = "chibi" | "cat_mochi" | "hoodie_kid" | "bear_cozy" | "cloud_spirit" | "stickman";
export type VoiceIntonation = "auto" | "syahdu" | "hangat" | "santai" | "semangat";

export interface StickmanScene {
  pose: string;
  moodLabel: string;
  text: string;
  customImage?: string;
  fxOverlay?: string;
}

export interface StickmanVideoOptions {
  theme: StickmanTheme;
  paperStyle: StickmanPaper;
  charStyle?: CharacterStyle;
  intonation?: VoiceIntonation;
  channelTag: string;
  useVoice?: boolean;
  voice?: string;
  customVoiceAudio?: string;
  useBgm?: boolean;
  bgmTrack?: string;
  customBgmPath?: string;
  bgmVolume?: number;
  scenes: StickmanScene[];
  previewSceneIndex?: number;
}

export interface StickmanVideoResult {
  success: boolean;
  videoUrl?: string;
  previewUrl?: string;
  error?: string;
  logs: string;
}

export class StickmanVideoService {
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
      path.join(process.cwd(), "toolkit", "stickman_video_engine.py"),
      path.join(process.cwd(), "..", "toolkit", "stickman_video_engine.py"),
    ];
    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) {
      throw new Error("stickman_video_engine.py not found");
    }
    return found;
  }

  private static getProjectRoot(): string {
    return path.dirname(path.dirname(this.getScriptPath()));
  }

  static async generatePreview(options: StickmanVideoOptions): Promise<StickmanVideoResult> {
    const pythonBin = this.getPythonPath();
    const scriptPath = this.getScriptPath();
    const rootDir = this.getProjectRoot();

    const timestamp = Date.now();
    const filename = `stickman_preview_${options.theme}_${timestamp}.png`;
    const publicClipsDir = path.join(rootDir, "content-trend-intelligence", "public", "clips");
    fs.mkdirSync(publicClipsDir, { recursive: true });
    const fullOutputPath = path.join(publicClipsDir, filename);

    const idx = options.previewSceneIndex ?? 0;
    const activeScene = options.scenes?.[idx] || options.scenes?.[0] || {
      pose: "overthinking",
      moodLabel: "POV: Lagi Gundah",
      text: "Kadang hati terasa penuh, bukan butuh curhat, tapi *butuh ruang sendiri.*",
    };

    const args = [
      scriptPath,
      "--preview",
      "--theme", options.theme || "calm_ink",
      "--paper", options.paperStyle || "notebook_grid",
      "--char-style", options.charStyle || "chibi",
      "--channel", options.channelTag || "@catatan.tenang",
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
          resolve({ success: true, previewUrl: `/clips/${filename}`, logs });
        } else {
          resolve({ success: false, error: `Preview failed (code ${code})`, logs });
        }
      });
    });
  }

  static async renderVideo(options: StickmanVideoOptions): Promise<StickmanVideoResult> {
    const pythonBin = this.getPythonPath();
    const scriptPath = this.getScriptPath();
    const rootDir = this.getProjectRoot();

    const timestamp = Date.now();
    const outputFilename = `stickman_${timestamp}.mp4`;
    const publicClipsDir = path.join(rootDir, "content-trend-intelligence", "public", "clips");
    fs.mkdirSync(publicClipsDir, { recursive: true });
    const fullOutputPath = path.join(publicClipsDir, outputFilename);

    const scenesFile = path.join(rootDir, "data", "temp_stickman", `scenes_${timestamp}.json`);
    fs.mkdirSync(path.dirname(scenesFile), { recursive: true });
    fs.writeFileSync(scenesFile, JSON.stringify(options.scenes, null, 2), "utf-8");

    const args = [
      scriptPath,
      "--theme", options.theme || "calm_ink",
      "--paper", options.paperStyle || "notebook_grid",
      "--char-style", options.charStyle || "chibi",
      "--intonation", options.intonation || "auto",
      "--channel", options.channelTag || "@catatan.tenang",
      ...(options.useVoice === false ? ["--no-voice"] : []),
      "--voice", options.voice || "en-US-AndrewMultilingualNeural",
      ...(options.customVoiceAudio ? ["--custom-voice-audio", options.customVoiceAudio] : []),
      ...(options.useBgm === false ? ["--no-bgm"] : []),
      "--bgm-track", options.bgmTrack || "auto",
      ...(options.customBgmPath ? ["--custom-bgm", options.customBgmPath] : []),
      "--bgm-volume", String(options.bgmVolume ?? 0.28),
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
          resolve({ success: true, videoUrl: `/clips/${outputFilename}`, logs });
        } else {
          resolve({ success: false, error: `Render failed (code ${code})`, logs });
        }
      });
    });
  }

  /**
   * Built-in relatable daily life story templates (0 AI tokens!)
   */
  static getStoryPreset(category?: string): {
    theme: StickmanTheme;
    paperStyle: StickmanPaper;
    scenes: StickmanScene[];
  } {
    const presets: Record<string, { theme: StickmanTheme; paperStyle: StickmanPaper; scenes: StickmanScene[] }> = {
      gundah_solusi: {
        theme: "calm_ink",
        paperStyle: "notebook_grid",
        scenes: [
          { pose: "overthinking", moodLabel: "POV: Lagi Gundah", text: "Kadang hati terasa penuh, bukan butuh curhat, tapi *butuh ruang sendiri.*" },
          { pose: "walking_alone", moodLabel: "Menepi Sebentar", text: "Coba matikan layar 15 menit, jalan pelan, dan *biarkan kepala bernapas.*" },
          { pose: "eureka_idea", moodLabel: "Solusi Simpel", text: "Tulis satu hal kecil yang bisa kamu bereskan *hari ini saja.* Sisanya titipkan dulu." },
          { pose: "coffee_chill", moodLabel: "Pelan-Pelan Aja", text: "Kamu gak harus selesai hari ini. *Bisa tenang sebentar* saja sudah hebat." },
        ],
      },
      burnout_reset: {
        theme: "warm_healing",
        paperStyle: "lined_journal",
        scenes: [
          { pose: "working_tired", moodLabel: "Lagi Burnout?", text: "Kerjaan numpuk, badan capek, tapi kepala malah *gak bisa berhenti mikir.*" },
          { pose: "deep_breath", moodLabel: "Reset 3 Menit", text: "Berhenti sebentar. Tarik napas 4 detik, tahan, lalu *hembuskan pelan-pelan.*" },
          { pose: "pointing_solution", moodLabel: "Aturan 1 Prioritas", text: "Jangan kejar 10 hal sekaligus. Pilih *1 tugas paling penting* lalu kerjakan 25 menit." },
          { pose: "climbing_up", moodLabel: "Progres Kecil", text: "Langkah kecil yang konsisten jauh lebih kuat daripada *lari kencang lalu tumbang.*" },
        ],
      },
      bahagia_syukur: {
        theme: "happy_pop",
        paperStyle: "dot_journal",
        scenes: [
          { pose: "coffee_chill", moodLabel: "Hal Kecil Bermakna", text: "Bahagia itu sering kali bukan soal hal besar, tapi *kopi hangat di pagi yang tenang.*" },
          { pose: "happy_jump", moodLabel: "Rayakan Dirimu", text: "Kadang kita lupa merayakan hal kecil yang *dulu pernah kita doakan mati-matian.*" },
          { pose: "self_hug", moodLabel: "Apresiasi Diri", text: "Terima kasih sudah bertahan sejauh ini, meski jalannya *gak selalu mulus.*" },
          { pose: "high_five_cheer", moodLabel: "Semangat Hari Ini!", text: "Semoga hari ini ada *kabar baik kecil* yang bikin kamu tersenyum tanpa sadar." },
        ],
      },
      malam_overthinking: {
        theme: "midnight_chalk",
        paperStyle: "notebook_grid",
        scenes: [
          { pose: "stargazing", moodLabel: "Jam 12 Malam", text: "Kenapa masalah kecil siang hari selalu terasa *10 kali lebih berat di malam hari?*" },
          { pose: "carrying_burden", moodLabel: "Otak Lelah", text: "Bukan hidupmu yang hancur — otakmu cuma *kehabisan energi* untuk berpikir jernih." },
          { pose: "pointing_solution", moodLabel: "Trik Brain Dump", text: "Ambil kertas, tulis semua yang bikin cemas, lalu bilang: *'Besok pagi kita bahas.'*" },
          { pose: "deep_breath", moodLabel: "Istirahat Dulu", text: "Tidur yang cukup kadang adalah *solusi paling realistis* yang paling sering kita remehkan." },
        ],
      },
      bandingkan_diri: {
        theme: "calm_ink",
        paperStyle: "lined_journal",
        scenes: [
          { pose: "overthinking", moodLabel: "POV: Scroll Sosmed", text: "Baru buka HP 5 menit, tiba-tiba merasa *hidup orang lain jauh lebih maju.*" },
          { pose: "rain_sad", moodLabel: "Fakta yang Terlupa", text: "Kita sering membandingkan *balik layar kita yang berantakan* dengan highlight terbaik orang lain." },
          { pose: "eureka_idea", moodLabel: "Solusi Cepat", text: "Mute akun yang bikin dadamu sesak. Fokus bandingkan dirimu hari ini dengan *dirimu bulan lalu.*" },
          { pose: "climbing_up", moodLabel: "Lintasanmu Sendiri", text: "Setiap orang punya jam mekarnya masing-masing. *Kamu tidak terlambat.*" },
        ],
      },
      malas_mulai: {
        theme: "warm_healing",
        paperStyle: "notebook_grid",
        scenes: [
          { pose: "working_tired", moodLabel: "Susah Mulai?", text: "Tahu tugasnya penting, tapi tangan malah *scroll HP terus sambil merasa bersalah.*" },
          { pose: "carrying_burden", moodLabel: "Kenapa Bisa Gitu?", text: "Otak kita kabur bukan karena malas, tapi karena targetnya terasa *terlalu besar dan menakutkan.*" },
          { pose: "pointing_solution", moodLabel: "Aturan 2 Menit", text: "Jangan niat menyelesaikan semuanya. Janji ke diri sendiri: *kerjakan 2 menit saja dulu.*" },
          { pose: "happy_jump", moodLabel: "Efek Momentum", text: "Begitu 2 menit pertama lewat, biasanya otak otomatis lanjut. *Mulai jelek lebih baik daripada tidak mulai.*" },
        ],
      },
      people_pleaser: {
        theme: "calm_ink",
        paperStyle: "dot_journal",
        scenes: [
          { pose: "carrying_burden", moodLabel: "Capek Nggak Enakan", text: "Sering bilang 'iya gapapa', padahal dalam hati *capek banget dan pengen nolak?*" },
          { pose: "overthinking", moodLabel: "Yang Perlu Disadari", text: "Setiap kali kamu memaksakan 'iya' ke orang lain, kamu sedang bilang *'tidak' ke kesehatan mentalmu sendiri.*" },
          { pose: "pointing_solution", moodLabel: "Kalimat Penyelamat", text: "Coba bilang pelan: *'Maaf, kali ini aku belum bisa bantu ya.'* Tanpa perlu alasan panjang." },
          { pose: "self_hug", moodLabel: "Jaga Energimu", text: "Orang yang benar-benar peduli padamu akan tetap menghargaimu *meski kamu berkata tidak.*" },
        ],
      },
      rejeki_seret: {
        theme: "warm_healing",
        paperStyle: "warm_sketchbook",
        scenes: [
          { pose: "rain_sad", moodLabel: "Lagi Merasa Stuck?", text: "Sudah usaha mati-matian, doa tiap hari, tapi *hasilnya belum juga kelihatan.*" },
          { pose: "walking_alone", moodLabel: "Tarik Mundur Sebentar", text: "Di masa seperti ini, jangan langsung menyalahkan diri sendiri. *Akar pohon tumbuh justru saat di dalam tanah.*" },
          { pose: "eureka_idea", moodLabel: "Fokus yang Bisa Dikontrol", text: "Evaluasi 1 hal kecil dari caramu hari ini, perbaiki pelan, lalu *serahkan hasilnya ke Tuhan.*" },
          { pose: "stargazing", moodLabel: "Simpan Ini", text: "Tidak ada ikhtiar yang benar-benar sia-sia. *Waktumu sedang disiapkan.*" },
        ],
      },
      kesepian_ramai: {
        theme: "midnight_chalk",
        paperStyle: "dot_journal",
        scenes: [
          { pose: "walking_alone", moodLabel: "Sepi di Keramaian", text: "Pernah gak sih lagi di tempat ramai, banyak chat masuk, tapi hati tetap *merasa sendirian?*" },
          { pose: "overthinking", moodLabel: "Bukan Salah Siapa-Siapa", text: "Kadang itu tandanya kamu terlalu lama *sibuk mendengarkan dunia,* sampai lupa mendengar dirimu sendiri." },
          { pose: "coffee_chill", moodLabel: "Date sama Diri Sendiri", text: "Coba keluar sebentar, beli minuman favoritmu, duduk tenang *tanpa membuka media sosial.*" },
          { pose: "self_hug", moodLabel: "Berbaikan", text: "Saat kamu mulai nyaman sendirian, *kesepian pelan-pelan berubah jadi ketenangan.*" },
        ],
      },
      pagi_semangat: {
        theme: "happy_pop",
        paperStyle: "notebook_grid",
        scenes: [
          { pose: "high_five_cheer", moodLabel: "Selamat Pagi!", text: "Sebelum buru-buru buka chat kerjaan, *tarik napas dulu 10 detik.*" },
          { pose: "coffee_chill", moodLabel: "Atur Ritme", text: "Hari ini tidak harus sempurna. Cukup lakukan *yang terbaik sesuai tenagamu hari ini.*" },
          { pose: "climbing_up", moodLabel: "Satu Langkah", text: "Selesaikan satu hal kecil pagi ini biar *mood seharian ikut naik.*" },
          { pose: "happy_jump", moodLabel: "Gas Pelan-Pelan!", text: "Semoga hari ini langkahmu dimudahkan dan *hatimu tetap ringan.*" },
        ],
      },
      kecewa_ekspektasi: {
        theme: "warm_healing",
        paperStyle: "lined_journal",
        scenes: [
          { pose: "rain_sad", moodLabel: "Capek Kecewa?", text: "Sering kali yang bikin sakit hati bukan kejadiannya, tapi *ekspektasi kita yang terlalu tinggi.*" },
          { pose: "overthinking", moodLabel: "Realita Sederhana", text: "Kita tidak bisa mengatur sikap orang lain, tapi kita selalu bisa *mengatur cara kita merespons.*" },
          { pose: "deep_breath", moodLabel: "Lepaskan Perlahan", text: "Berbuat baiklah karena itu prinsipmu, bukan karena *menunggu balasan yang sama.*" },
          { pose: "coffee_chill", moodLabel: "Lebih Lega", text: "Saat ekspektasi diturunkan ke manusia, *hati jadi jauh lebih sulit dikecewakan.*" },
        ],
      },
      kemenangan_kecil: {
        theme: "happy_pop",
        paperStyle: "warm_sketchbook",
        scenes: [
          { pose: "happy_jump", moodLabel: "Small Wins!", text: "Hari ini kamu berhasil bangun pagi, mandi, dan *tidak menyerah.* Itu sudah kemenangan!" },
          { pose: "coffee_chill", moodLabel: "Jangan Diremehkan", text: "Berhasil menahan emosi, merapikan kamar, atau minum air cukup — *semuanya layak dirayakan.*" },
          { pose: "self_hug", moodLabel: "Tepuk Pundakmu", text: "Hidup bukan cuma soal pencapaian besar yang difoto, tapi *hal kecil yang bikin kamu tetap waras.*" },
          { pose: "high_five_cheer", moodLabel: "Bangga Sama Kamu", text: "Tulis 1 hal kecil yang kamu syukuri hari ini di komentar ya. *Simpan biar ingat!*" },
        ],
      },
    };

    if (category && presets[category]) {
      return presets[category];
    }
    const keys = Object.keys(presets);
    return presets[keys[Math.floor(Math.random() * keys.length)]];
  }
}
