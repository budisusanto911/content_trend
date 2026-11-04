"""
Unit Test: Analytics Feedback Loop & Watchlist Optimizer
Memverifikasi evaluasi skor performa dan rekomendasi keyword.
"""

import os
import unittest
from toolkit.analytics_tracker import evaluate_clip_performance

class TestAnalyticsTracker(unittest.TestCase):
    def test_performance_evaluation(self):
        sample_jobs = [
            {
                "id": "job_1",
                "matchedKeyword": "musik viral",
                "status": "published",
                "publishResults": [{"success": True}]
            },
            {
                "id": "job_2",
                "matchedKeyword": "musik viral",
                "status": "ready",
                "publishResults": []
            },
            {
                "id": "job_3",
                "matchedKeyword": "podcast kesehatan",
                "status": "published",
                "publishResults": [{"success": True}, {"success": True}]
            }
        ]
        res = evaluate_clip_performance(sample_jobs)
        self.assertIn("keywordRankings", res)
        self.assertIn("recommendedKeywords", res)
        self.assertIn("musik viral", res["keywordRankings"])
        self.assertIn("podcast kesehatan", res["keywordRankings"])
        self.assertGreater(res["keywordRankings"]["podcast kesehatan"]["avg_score"], 0)

if __name__ == "__main__":
    unittest.main()
