export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { trendingJobScheduler } = await import("@/lib/trendingJobScheduler");
    trendingJobScheduler.ensureSchedulerStarted();

    const { autoClipScheduler } = await import("@/lib/autoClipScheduler");
    autoClipScheduler.ensureStarted();
  }
}
