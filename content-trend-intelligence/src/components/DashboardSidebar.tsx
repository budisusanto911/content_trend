"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";

export function DashboardSidebar({ videos }: { videos: any[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(videos.map(v => v.category).filter(Boolean));
    return ["All", ...Array.from(cats)];
  }, [videos]);

  const categoryFilteredVideos = useMemo(() => {
    if (activeTab === "All") return videos;
    return videos.filter(v => v.category === activeTab);
  }, [videos, activeTab]);

  // Extract Topics (Hashtags/Categories) based on Category filter
  const topTopics = useMemo(() => {
    const topicCounts: Record<string, number> = {};
    let totalTags = 0;
    categoryFilteredVideos.forEach((v: any) => {
      const tags = v.hashtags || ["General"];
      tags.slice(0, 3).forEach((tag: string) => {
        const topic = tag.charAt(0).toUpperCase() + tag.slice(1);
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        totalTags++;
      });
    });
    
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({
        originalLabel: label,
        label: label.length > 15 ? label.substring(0, 15) + "..." : label,
        count,
        percentage: totalTags > 0 ? Math.round((count / totalTags) * 100) * 3 + 20 : 0 // Scaled for visual
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [categoryFilteredVideos]);

  const recentVideos = useMemo(() => {
    let result = categoryFilteredVideos;
    if (activeTopic) {
      result = result.filter(v => {
        const tags = v.hashtags || ["General"];
        return tags.some((t: string) => (t.charAt(0).toUpperCase() + t.slice(1)) === activeTopic);
      });
    }
    return result.slice(0, 4);
  }, [categoryFilteredVideos, activeTopic]);

  // When changing category, reset topic filter
  const handleTabChange = (cat: string) => {
    setActiveTab(cat);
    setActiveTopic(null);
  };

  return (
    <div className="border-t border-gray-100 pt-8 xl:border-t-0 xl:border-l xl:border-gray-100 xl:pl-8 h-full xl:pt-0">
      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat as string}
            onClick={() => handleTabChange(cat as string)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              activeTab === cat 
                ? "bg-blue-600 text-white shadow-sm" 
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {cat as string}
          </button>
        ))}
      </div>

      <div className="mb-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-bold">Top Trending Videos</h3>
            {activeTopic && (
              <p className="text-[11px] font-bold text-blue-600 mt-1 flex items-center gap-1 cursor-pointer" onClick={() => setActiveTopic(null)}>
                Filtered by: {activeTopic} <span className="text-gray-400 font-normal hover:text-red-500">(Clear)</span>
              </p>
            )}
          </div>
          <button className="w-9 h-9 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.04)] rounded-[10px] flex items-center justify-center text-gray-600">
            <Calendar size={16} />
          </button>
        </div>

        <div className="space-y-6">
          {recentVideos.length === 0 ? (
            <div className="text-sm text-gray-400 font-medium">No videos found for this category or topic.</div>
          ) : (
            recentVideos.map((video: any, i: number) => (
              <div key={video.id}>
                <div 
                  className="flex items-start justify-between group cursor-pointer hover:bg-gray-50 -mx-2 p-2 rounded-lg transition-colors"
                  onClick={() => router.push(`/dashboard/analyzer?id=${video.id}`)}
                >
                  <div className="w-20 shrink-0">
                    <p className="text-[11px] text-gray-400 font-bold mb-0.5">
                      {video.uploadTime ? new Date(video.uploadTime).toLocaleDateString() : 'Today'}
                    </p>
                    <p className="text-[11px] font-black text-gray-800">
                      {video.metrics.views >= 1000000 ? (video.metrics.views/1000000).toFixed(1)+'M' : (video.metrics.views/1000).toFixed(0)+'K'} views
                    </p>
                  </div>
                  <div className="flex-1 px-2">
                    <h4 className="font-bold text-[13px] leading-tight mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">{video.title}</h4>
                    <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-red-500' : 'bg-blue-500'}`}></span> {video.creator}
                    </p>
                  </div>
                  <a 
                    href={video.originalUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    className="w-6 h-6 flex items-center justify-end text-gray-400 group-hover:text-gray-900 transition-colors"
                  >
                    <ArrowUpRight size={16} />
                  </a>
                </div>
                {i < recentVideos.length - 1 && <hr className="border-gray-100 mt-2" />}
              </div>
            ))
          )}

          {recentVideos.length > 0 && (
            <div className="pt-2 text-center">
              <Link href="/dashboard/trending" className="text-[11px] text-gray-500 font-bold hover:text-gray-900 transition-colors">See all trends &gt;</Link>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bars (Top Topics) */}
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-bold">Trending Topics</h3>
          <p className="text-[11px] font-bold text-gray-400 mt-1">Most common tags across viral videos</p>
        </div>

        <div className="space-y-5">
          {topTopics.length === 0 ? (
            <div className="text-sm text-gray-400 font-medium">No topics found.</div>
          ) : (
            topTopics.map((topic, i) => (
              <ProgressBar 
                key={i} 
                label={topic.label} 
                count={topic.count}
                percentage={Math.min(topic.percentage, 100)} 
                color={i === 0 ? "bg-[#FF7E8B]" : "bg-[#4F46E5]"} 
                up={topic.percentage > 50} 
                isActive={activeTopic === topic.originalLabel}
                onClick={() => setActiveTopic(activeTopic === topic.originalLabel ? null : topic.originalLabel)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, percentage, count, color, up = false, isActive = false, onClick }: { label: string, percentage: number, count: number, color: string, up?: boolean, isActive?: boolean, onClick?: () => void }) {
  return (
    <div 
      className={`flex items-center justify-between gap-4 cursor-pointer p-2 -mx-2 rounded-lg transition-colors ${isActive ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
      onClick={onClick}
    >
      <div className="w-24 shrink-0">
        <div className="text-[12px] font-bold text-gray-800 truncate" title={label}>{label}</div>
        <div className="text-[10px] font-medium text-gray-400">{count} videos</div>
      </div>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
      <div className={`text-[11px] font-bold w-6 text-right text-gray-400`}>{percentage}%</div>
      <div className="w-4 flex justify-end">
        {up ? (
          <div className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center">
             <ArrowUpRight size={10} strokeWidth={3} />
          </div>
        ) : (
          <div className="w-3.5 h-3.5 rounded-full bg-orange-400 text-white flex items-center justify-center">
             <ArrowDownRight size={10} strokeWidth={3} />
          </div>
        )}
      </div>
    </div>
  );
}
