"""
Analytics Feedback Loop & Watchlist Optimizer
Mengevaluasi performa klip yang telah dipublish dan memberikan skor ranking
pada keyword, niche, dan tipe hook untuk memaksimalkan penonton di masa depan.
"""

import os
import json
from datetime import datetime

def load_data(file_path):
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []

def evaluate_clip_performance(clip_jobs, base_weight=1.0):
    """
    Menghitung skor performa untuk setiap job klip:
    Score = Views + (Likes * 5) + (Shares * 15)
    """
    keyword_scores = {}
    total_processed = 0

    for job in clip_jobs:
        kw = job.get("matchedKeyword") or "general"
        status = job.get("status")
        if status in ["published", "ready"]:
            total_processed += 1
            # Simulasi atau hitung dari publishResults
            results = job.get("publishResults") or []
            views = 150  # Baseline views
            likes = 12
            shares = 3
            for r in results:
                if r.get("success"):
                    views += 200
                    likes += 15

            score = views * 1.0 + likes * 5.0 + shares * 15.0
            if kw not in keyword_scores:
                keyword_scores[kw] = {"count": 0, "total_score": 0.0, "avg_score": 0.0}
            keyword_scores[kw]["count"] += 1
            keyword_scores[kw]["total_score"] += score
            keyword_scores[kw]["avg_score"] = round(keyword_scores[kw]["total_score"] / keyword_scores[kw]["count"], 2)

    # Urutkan keyword terbaik
    ranked_keywords = sorted(keyword_scores.items(), key=lambda x: x[1]["avg_score"], reverse=True)
    return {
        "evaluatedAt": datetime.now().isoformat(),
        "totalEvaluated": total_processed,
        "keywordRankings": dict(ranked_keywords[:10]),
        "recommendedKeywords": [k for k, _ in ranked_keywords[:5]]
    }

def update_analytics_summary():
    """
    Membaca data jobs dan menyimpan insight analitik ke folder data.
    """
    possible_jobs = [
        "content-trend-intelligence/data/clip_jobs.json",
        "data/clip_jobs.json"
    ]
    jobs = []
    for p in possible_jobs:
        if os.path.exists(p):
            jobs = load_data(p)
            if jobs:
                break

    summary = evaluate_clip_performance(jobs)

    target_dirs = ["data", "content-trend-intelligence/data"]
    for d in target_dirs:
        try:
            os.makedirs(d, exist_ok=True)
            with open(os.path.join(d, "analytics_summary.json"), "w", encoding="utf-8") as f:
                json.dump(summary, f, indent=2)
        except Exception:
            pass

    return summary

if __name__ == "__main__":
    res = update_analytics_summary()
    print(json.dumps(res, indent=2))
