import fs from "fs";
import path from "path";
import { clipJobStore, ClipJob } from "./clipJobStore";

export interface AnalyticsSummary {
  evaluatedAt: string;
  totalEvaluated: number;
  keywordRankings: Record<string, { count: number; total_score: number; avg_score: number }>;
  recommendedKeywords: string[];
}

export class AnalyticsTracker {
  private static getFilePath(): string {
    const candidates = [
      path.join(process.cwd(), "data", "analytics_summary.json"),
      path.join(process.cwd(), "content-trend-intelligence", "data", "analytics_summary.json"),
    ];
    return candidates.find((p) => fs.existsSync(p)) || candidates[0];
  }

  static getSummary(): AnalyticsSummary | null {
    try {
      const p = this.getFilePath();
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, "utf8"));
      }
    } catch (e) {
      console.error("[AnalyticsTracker] Gagal membaca summary:", e);
    }
    return null;
  }

  static evaluateAndSave(): AnalyticsSummary {
    const jobs = clipJobStore.list();
    const keywordScores: Record<string, { count: number; total_score: number; avg_score: number }> = {};
    let totalProcessed = 0;

    for (const job of jobs) {
      const kw = job.matchedKeyword || "general";
      if (job.status === "published" || job.status === "ready") {
        totalProcessed++;
        let score = 150 + 12 * 5 + 3 * 15;
        for (const r of job.publishResults || []) {
          if (r.success) score += 200 + 15 * 5;
        }

        if (!keywordScores[kw]) {
          keywordScores[kw] = { count: 0, total_score: 0, avg_score: 0 };
        }
        keywordScores[kw].count++;
        keywordScores[kw].total_score += score;
        keywordScores[kw].avg_score = Math.round((keywordScores[kw].total_score / keywordScores[kw].count) * 100) / 100;
      }
    }

    const sortedEntries = Object.entries(keywordScores).sort((a, b) => b[1].avg_score - a[1].avg_score);
    const summary: AnalyticsSummary = {
      evaluatedAt: new Date().toISOString(),
      totalEvaluated: totalProcessed,
      keywordRankings: Object.fromEntries(sortedEntries.slice(0, 10)),
      recommendedKeywords: sortedEntries.slice(0, 5).map(([k]) => k),
    };

    const targetDirs = [
      path.join(process.cwd(), "data"),
      path.join(process.cwd(), "..", "data"),
    ];
    for (const d of targetDirs) {
      try {
        if (fs.existsSync(path.dirname(d))) {
          fs.mkdirSync(d, { recursive: true });
          fs.writeFileSync(path.join(d, "analytics_summary.json"), JSON.stringify(summary, null, 2), "utf8");
        }
      } catch (e) {}
    }

    return summary;
  }
}

