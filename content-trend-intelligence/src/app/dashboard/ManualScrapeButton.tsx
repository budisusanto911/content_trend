"use client";

import { RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface JobStatusInfo {
  autoScrapeEnabled: boolean;
  scrapeIntervalHours: number;
  dailyMaxRuns: number;
  dailyRunCount: number;
  lastScrapedAt: string | null;
  nextScheduledAt: string | null;
}

export function ManualScrapeButton({ forceShowLabel = false }: { forceShowLabel?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatusInfo | null>(null);
  const router = useRouter();

  const fetchJobStatus = async () => {
    try {
      const res = await fetch("/api/cron/scrape", { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.status) {
        setJobStatus(data.status);
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    fetchJobStatus();
    const interval = setInterval(fetchJobStatus, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleManualScrape = async () => {
    setLoading(true);
    setJustUpdated(false);
    try {
      const res = await fetch("/api/cron/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "manual" }),
      });
      const data = await res.json();
      if (data.status) {
        setJobStatus(data.status);
      }

      // Refresh Next.js router to update server components with new cached data
      router.refresh();
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 3500);
    } catch (error) {
      console.error("Gagal me-refresh data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatShortTime = (iso: string | null | undefined) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  return (
    <div className="space-y-1.5">
      <button
        onClick={handleManualScrape}
        disabled={loading}
        title="Refresh data trending sekarang (Job otomatis berjalan 3x sehari)"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group text-gray-500 hover:bg-gray-50 hover:text-gray-900 cursor-pointer disabled:opacity-50"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="text-gray-400 group-hover:text-gray-900 shrink-0">
            {justUpdated ? (
              <CheckCircle2 size={20} className="text-emerald-600" />
            ) : (
              <RefreshCw size={20} className={loading ? "animate-spin text-blue-600" : ""} />
            )}
          </div>
          <div className={`${forceShowLabel ? "flex" : "hidden lg:flex"} flex-col text-left truncate`}>
            <span className="font-semibold text-sm leading-tight">
              {loading ? "Scraping..." : justUpdated ? "Data Diperbarui!" : "Refresh Data"}
            </span>
            {jobStatus && (
              <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1 mt-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    jobStatus.autoScrapeEnabled ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                />
                {jobStatus.autoScrapeEnabled
                  ? `Job ${jobStatus.dailyMaxRuns}x/hari (${jobStatus.dailyRunCount}/${jobStatus.dailyMaxRuns})`
                  : "Auto-Job Off"}
              </span>
            )}
          </div>
        </div>
      </button>

      {jobStatus && jobStatus.autoScrapeEnabled && (
        <div className={`${forceShowLabel ? "flex" : "hidden lg:flex"} items-center justify-between px-4 py-1.5 rounded-xl bg-gray-50/80 border border-gray-100 text-[10px] text-gray-500`}>
          <span className="flex items-center gap-1">
            <Clock size={10} className="text-purple-500" />
            Last: <strong className="text-gray-700">{formatShortTime(jobStatus.lastScrapedAt)}</strong>
          </span>
          <span>
            Next: <strong className="text-purple-600">{formatShortTime(jobStatus.nextScheduledAt)}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
