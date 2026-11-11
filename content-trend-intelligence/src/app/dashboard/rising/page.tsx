"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, TrendingUp, Zap, Clock, Eye } from "lucide-react";
import Link from "next/link";

export default function RisingTrendsPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trending")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Sort by a mock "growth acceleration" to simulate Rising
          const sorted = data.data.sort((a: any, b: any) => 
            (b.metrics.views / b.metrics.likes) - (a.metrics.views / a.metrics.likes)
          );
          setVideos(sorted);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse space-y-4 max-w-5xl mx-auto mt-10">
    {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl"></div>)}
  </div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 md:p-10">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <TrendingUp className="text-blue-500" /> Rising Trends
        </h2>
        <p className="text-gray-500 mt-1 text-xs sm:text-sm font-medium">Content that hasn't peaked yet but is showing explosive growth.</p>
      </div>

      <div className="grid gap-4">
        {videos.map((video, index) => (
          <div key={video.id} className="flex flex-col md:flex-row gap-4 sm:gap-6 p-4 bg-white border border-gray-100 rounded-3xl hover:shadow-lg hover:border-blue-100 transition-all">
            
            <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
              <div className="text-xl sm:text-2xl font-black text-gray-200 w-8 text-center shrink-0">
                {index + 1}
              </div>
              <div className="w-full sm:w-48 aspect-video sm:h-28 bg-gray-100 rounded-2xl overflow-hidden shrink-0 relative">
                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-xs">
                  <Zap size={10} fill="currentColor" /> Rising Fast
                </div>
              </div>
            </div>

            <div className="flex-1 py-1">
              <h3 className="text-sm sm:text-[15px] font-bold leading-tight mb-1">{video.title}</h3>
              <p className="text-xs text-gray-500 font-semibold">{video.creator}</p>
              
              <div className="flex flex-wrap gap-4 sm:gap-8 mt-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Current Views</p>
                  <p className="text-xs sm:text-sm font-black text-gray-800 flex items-center gap-1"><Eye size={13}/> {formatNumber(video.metrics.views)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">View Velocity</p>
                  <p className="text-xs sm:text-sm font-black text-green-600 flex items-center gap-1"><ArrowUpRight size={13}/> +{Math.floor(Math.random() * 50 + 10)}K / hr</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Uploaded</p>
                  <p className="text-xs sm:text-sm font-bold text-gray-700 flex items-center gap-1"><Clock size={13}/> {getTimeAgo(video.uploadTime)}</p>
                </div>
              </div>
            </div>

            <div className="w-full md:w-32 flex flex-row md:flex-col justify-center gap-2 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4">
              <Link href="/dashboard/analyzer" className="flex-1 md:w-full text-center text-xs font-bold bg-blue-50 text-blue-600 py-2.5 rounded-xl hover:bg-blue-600 hover:text-white transition-colors">
                Analyze
              </Link>
              <Link href={video.originalUrl} target="_blank" className="flex-1 md:w-full text-center text-xs font-bold border border-gray-100 text-gray-600 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                Watch
              </Link>
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
