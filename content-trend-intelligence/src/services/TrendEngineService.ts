/**
 * TrendEngineService
 * 
 * Responsible for aggregating video metrics and calculating the Trending Score
 * based on the algorithm specified in `.agents/skills/calculate-trend-score/SKILL.md`.
 */
export class TrendEngineService {
  /**
   * Calculates the trending score for a video given its metrics.
   * Note: This is a simplified version of the algorithm for MVP.
   */
  static calculateScore(
    currentViews: number,
    viewsOneHourAgo: number,
    likes: number,
    comments: number,
    shares: number,
    hoursSinceUpload: number
  ): number {
    // 30% View Velocity: (Current Views - Views 1 Hour Ago) / 1 Hour
    const viewVelocity = (currentViews - viewsOneHourAgo) / 1;
    
    // Normalize velocity (assuming 100k views/hr is max for 100 score on this metric)
    const velocityScore = Math.min((viewVelocity / 100000) * 100, 100);

    // 25% Growth Rate (Mocked as we need 24h data usually, here we simplify)
    const growthRateScore = 50; // Placeholder

    // 20% Engagement Rate: (Likes + Comments + Shares) / Total Views * 100
    const engagementRate = currentViews > 0 ? ((likes + comments + shares) / currentViews) * 100 : 0;
    // Normalize (assuming 10% engagement is max for 100 score)
    const engagementScore = Math.min((engagementRate / 10) * 100, 100);

    // 15% Total Views: Logarithmic scale
    const reachScore = currentViews > 0 ? Math.min((Math.log10(currentViews) / 8) * 100, 100) : 0;

    // 10% Recency: Exponential decay based on hours since upload
    const recencyScore = Math.max(100 - (hoursSinceUpload * 2), 0);

    // Final Weighted Score
    const finalScore = 
      (velocityScore * 0.30) + 
      (growthRateScore * 0.25) + 
      (engagementScore * 0.20) + 
      (reachScore * 0.15) + 
      (recencyScore * 0.10);

    return Math.round(finalScore * 100) / 100;
  }
}
