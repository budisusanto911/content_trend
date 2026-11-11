---
name: calculate-trend-score
description: Explains the mathematical formula and algorithm for generating the Trending Score based on view velocity and engagement.
---
# Calculate Trend Score

When building the `TrendEngineService`, use the following algorithm to calculate the `Trending Score` (0-100). The goal is to detect rising trends, not just absolute popularity.

## Formula Weights
- **30% View Velocity**: `(Current Views - Views 1 Hour Ago) / 1 Hour`
- **25% Growth Rate**: Percentage increase over the last 24 hours.
- **20% Engagement Rate**: `(Likes + Comments + Shares) / Total Views * 100`
- **15% Total Views**: Logarithmic scale of total views to give some weight to reach without overshadowing velocity.
- **10% Recency**: Exponential decay based on hours since upload.

## Implementation Steps
1. Fetch current metrics and historical metrics (from the database `VideoMetric` table).
2. Calculate the raw values for each metric.
3. Normalize each raw value to a 0-100 scale (e.g., set maximum thresholds for view velocity based on category averages).
4. Apply the weights and sum the results to get the final `score`.
5. Return the score and update the `TrendScore` table.
