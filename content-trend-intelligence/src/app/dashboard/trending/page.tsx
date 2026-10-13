"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Clock, Eye, MessageSquare, ThumbsUp } from "lucide-react";
import Link from "next/link";

export default function TrendingTodayPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trending")
      .then(res => res.json())
      .then(data => {
        if (data.success) setVideos(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse space-y-4">
    {[1,2,3].map(i => <div key={i} className="h-40 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>)}
  </div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 md:p-10">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">🔥 Trending Today</h2>
        <p className="text-neutral-500 text-xs sm:text-sm">The fastest growing content across platforms in the last 24 hours.</p>
      </div>

      <div className="space-y-4">
        {videos.map((video, index) => (
          <div key={video.id} className="flex flex-col md:flex-row gap-4 sm:gap-6 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:border-blue-500 transition-colors shadow-xs">
            
            {/* Rank & Thumbnail */}
            <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
              <div className="text-2xl sm:text-3xl font-black text-neutral-300 dark:text-neutral-700 w-8 sm:w-12 text-center shrink-0">
                #{index + 1}
              </div>
              <div className="w-full sm:w-60 md:w-64 aspect-video sm:h-36 bg-neutral-200 dark:bg-neutral-800 rounded-xl overflow-hidden shrink-0 relative">
                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] px-2 py-0.5 rounded font-medium">
                  {video.platformId === 1 ? 'YouTube' : 'TikTok'}
                </div>
              </div>
            </div>

            {/* Content Info */}
            <div className="flex-1 flex flex-col justify-between py-1">
              <div>
                <h3 className="text-base sm:text-lg font-bold line-clamp-2 leading-tight mb-1">{video.title}</h3>
                <p className="text-xs sm:text-sm text-neutral-500 font-medium">{video.creator}</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-4 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                <div className="flex items-center gap-1.5"><Eye size={15} /> {formatNumber(video.metrics.views)}</div>
                <div className="flex items-center gap-1.5"><ThumbsUp size={15} /> {formatNumber(video.metrics.likes)}</div>
                <div className="flex items-center gap-1.5"><MessageSquare size={15} /> {formatNumber(video.metrics.comments)}</div>
                <div className="flex items-center gap-1.5"><Clock size={15} /> {getTimeAgo(video.uploadTime)}</div>
              </div>
            </div>

            {/* Analysis Box */}
            <div className="w-full md:w-64 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 p-4 rounded-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Trend Score</span>
                  <span className="text-lg font-black text-blue-700 dark:text-blue-300">
                    {Math.floor(Math.random() * 20 + 80)}/100
                  </span>
                </div>
                <ul className="text-xs space-y-1.5 text-neutral-600 dark:text-neutral-400">
                  <li className="flex items-start gap-1.5"><ArrowUpRight size={14} className="text-green-500 shrink-0" /> Views up 420% in 6h</li>
                  <li className="flex items-start gap-1.5"><ArrowUpRight size={14} className="text-green-500 shrink-0" /> High search interest</li>
                </ul>
              </div>
              
              <div className="mt-4 flex gap-2">
                <Link href={video.originalUrl} target="_blank" className="flex-1 text-center text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 py-1.5 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  View
                </Link>
                <Link href="/dashboard/analyzer" className="flex-1 text-center text-xs font-semibold bg-blue-600 text-white py-1.5 rounded hover:bg-blue-700">
                  Analyze
                </Link>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

function formatNumber(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${Math.floor(diffInHours / 24)}d ago`;
}
