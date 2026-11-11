import { CheckCircle2, ArrowUpRight, ArrowDownRight, Flame, TrendingUp, Search, User, Clock, Calendar, MoreHorizontal } from "lucide-react";
import { YouTubeService } from "@/services/YouTubeService";
import { TrendEngineService } from "@/services/TrendEngineService";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { settingsStore } from "@/lib/settingsStore";

export default async function DashboardPage() {
  const currentSettings = settingsStore.get();
  // Fetch trending data based on configured region and limit
  const videos = await YouTubeService.getTrendingVideos(
    currentSettings.defaultRegion || "ID",
    currentSettings.maxTrendingResults || 30
  );
  
  // Calculate average trend score (for the "Avg. Growth" card)
  let totalScore = 0;
  videos.forEach((v: any) => {
     // Mocking previous hour views for the sake of the MVP
     const viewsOneHourAgo = v.metrics.views * 0.9; 
     const hoursSinceUpload = Math.max(1, (Date.now() - new Date(v.uploadTime).getTime()) / (1000 * 60 * 60));
     totalScore += TrendEngineService.calculateScore(
       v.metrics.views, 
       viewsOneHourAgo, 
       v.metrics.likes, 
       v.metrics.comments, 
       v.metrics.shares, 
       hoursSinceUpload
     );
  });
  const avgScore = videos.length > 0 ? Math.round(totalScore / videos.length) : 0;
  
  // Extract Topics (Hashtags/Categories)
  const topicCounts: Record<string, number> = {};
  let totalTags = 0;
  videos.forEach((v: any) => {
    const tags = v.hashtags || ["General"];
    tags.slice(0, 3).forEach((tag: string) => {
      const topic = tag.charAt(0).toUpperCase() + tag.slice(1);
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      totalTags++;
    });
  });
  
  // Top 5 topics
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({
      label: label.length > 15 ? label.substring(0, 15) + "..." : label,
      percentage: Math.round((count / totalTags) * 100) * 3 + 20 // Scaled for visual
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // Recent 4 Videos for the list
  const recentVideos = videos.slice(0, 4);

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 font-sans">
      
      {/* Top Navigation / Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
            <Flame size={22} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl sm:text-[22px] font-bold tracking-tight">Welcome, Creator</h1>
            <p className="text-gray-400 text-xs sm:text-sm font-medium">Your trend intelligence overview</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search" 
              className="pl-11 pr-4 py-2.5 sm:py-3 bg-white border-none rounded-full shadow-sm text-sm w-full focus:outline-none focus:ring-2 focus:ring-gray-100 font-medium"
            />
          </div>
          <button className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0">
            <User size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        
        {/* Main Content Area (Left 2 columns) */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Top Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Profile / Status Card */}
            <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col items-center relative h-64">
              <div className="w-full flex justify-between items-center mb-4">
                <span className="text-sm font-bold">Profile</span>
                <Clock size={16} className="text-gray-400" />
              </div>
              
              <div className="relative mb-4 mt-2">
                <div className="w-[84px] h-[84px] rounded-full border-4 border-gray-50 overflow-hidden relative z-10 bg-white">
                  <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                    <User size={32} className="text-blue-500" />
                  </div>
                </div>
                <svg className="absolute -top-1 -left-1 w-[92px] h-[92px] -rotate-90 z-0" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="#FF5C5C" strokeWidth="4" strokeDasharray="140 289" strokeLinecap="round" />
                </svg>
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-gray-900 rounded-full z-20 flex items-center justify-center border-2 border-white">
                   <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
              
              <h3 className="font-bold text-[17px]">Creator Studio</h3>
              <p className="text-[11px] font-semibold text-gray-400 mt-1 uppercase tracking-wider">System Manager</p>
              
              <div className="flex gap-4 mt-auto w-full justify-center">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full"><span className="text-orange-500">🔥</span> {videos.length}</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full"><span className="text-green-500">✓</span> {avgScore}</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full"><span className="text-red-500">🏆</span> {topTopics.length}</div>
              </div>
            </div>

            {/* Gradient Card 1: Trending Today */}
            <div className="bg-gradient-to-br from-[#FFE8D6] via-[#FFB7B2] to-[#FF8B94] rounded-[2rem] p-6 text-gray-900 flex flex-col justify-between shadow-lg shadow-orange-100/50 h-64 relative overflow-hidden">
              <div className="flex justify-between items-start z-10">
                <h3 className="font-bold text-sm w-1/2 leading-tight">Trending<br/>Videos</h3>
                <div className="w-8 h-8 rounded-full border border-gray-900/10 flex items-center justify-center bg-white/20">
                  <Clock size={14} className="text-gray-800" />
                </div>
              </div>
              <div className="z-10 mb-2">
                <div className="text-[42px] font-semibold tracking-tight leading-none mb-1">{avgScore}%</div>
                <p className="text-[11px] font-semibold opacity-70">Avg. Trend Score</p>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 blur-2xl rounded-full"></div>
            </div>

            {/* Gradient Card 2: Rising Trends */}
            <div className="bg-gradient-to-br from-[#A0F0ED] via-[#8EE4F5] to-[#7CB8FF] rounded-[2rem] p-6 text-gray-900 flex flex-col justify-between shadow-lg shadow-blue-100/50 h-64 relative overflow-hidden">
              <div className="flex justify-between items-start z-10">
                <h3 className="font-bold text-sm w-1/2 leading-tight">Total<br/>Analyzed</h3>
                <div className="w-8 h-8 rounded-full border border-gray-900/10 flex items-center justify-center bg-white/20">
                  <CheckCircle2 size={14} className="text-gray-800" />
                </div>
              </div>
              <div className="z-10 mb-2">
                <div className="text-[42px] font-semibold tracking-tight leading-none mb-1">{videos.length}</div>
                <p className="text-[11px] font-semibold opacity-70">Videos Today</p>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 blur-2xl rounded-full"></div>
            </div>

          </div>

          {/* Connected Trackers Row */}
          <div className="bg-gray-100/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
               <h4 className="font-bold text-sm">Data sources connected</h4>
               <p className="text-[11px] font-medium text-gray-500">YouTube Data API Active</p>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-red-500 shadow-sm"><Flame size={14} /></div>
               <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm opacity-50"><TrendingUp size={14} /></div>
               <div className="w-8 h-8 flex items-center justify-center text-gray-400"><MoreHorizontal size={16}/></div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-3">
              <div>
                <h3 className="text-xl font-bold">Trend Velocity</h3>
                <p className="text-xs font-semibold text-gray-400 mt-1">Growth rate of top trends</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-full text-xs font-bold text-gray-700 shadow-sm cursor-pointer flex items-center gap-1">
                Range: Last 24 hours <span className="ml-1 opacity-50">v</span>
              </div>
            </div>

            <div className="relative h-64 w-full flex items-end">
               <div className="absolute left-0 top-0 h-[80%] flex flex-col justify-between text-[10px] font-bold text-gray-300 py-4 z-10 w-8 items-center">
                 <span>High</span>
                 <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full">Med</span>
                 <span>Low</span>
               </div>
               
               <div className="w-full h-full ml-8 sm:ml-12 relative">
                 <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-60"></div>
                 
                 <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                   <path d="M0,60 C10,60 20,65 30,50 C40,20 50,85 65,80 C80,75 85,45 100,65" fill="none" stroke="#FF7E8B" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                 </svg>
                 
                 <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                   <path d="M0,80 C15,80 25,75 35,60 C40,40 45,40 50,40 C60,40 70,65 80,60 C90,50 100,45 100,45" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                   <circle cx="50" cy="40" r="2.5" fill="white" stroke="#4F46E5" strokeWidth="2" vectorEffect="non-scaling-stroke" className="drop-shadow-md" />
                 </svg>
                 
                 <div className="absolute left-[35%] sm:left-[42%] top-[15%] bg-white shadow-[0_4px_15px_rgb(0,0,0,0.08)] rounded-2xl px-4 py-2 flex flex-col items-center">
                   <span className="font-bold text-sm">Peak</span>
                   <span className="text-[10px] font-semibold text-gray-400">Velocity</span>
                 </div>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6 ml-8 sm:ml-12 gap-4">
              <div className="flex flex-wrap gap-4 sm:gap-6 text-[11px] font-bold text-gray-500">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#FF7E8B] rounded-[3px]"></div> Highest Velocity</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#4F46E5] rounded-[3px]"></div> Avg Velocity</div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-[32px] font-semibold leading-none tracking-tight">{avgScore}%</div>
                <div className="text-[10px] font-bold text-gray-400 mt-1">Avg. Growth Rate</div>
              </div>
            </div>
          </div>
        </div>

        <DashboardSidebar videos={JSON.parse(JSON.stringify(videos))} />
      </div>
    </div>
  );
}
