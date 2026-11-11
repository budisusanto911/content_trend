"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Download, FileText, Lightbulb, Sparkles, Copy, FileJson, FileCode2, Library, Mic, Video, Search } from "lucide-react";
import { generateAiPrompt } from "@/lib/promptGenerator";
import { exportAsMarkdown, exportAsJSON, exportAsCSV } from "@/lib/exportUtils";

function AnalyzerContent() {
  const [loading, setLoading] = useState(false);

  const [commentData, setCommentData] = useState<any>(null);
  const [fullScript, setFullScript] = useState<any>(null);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [fullSEO, setFullSEO] = useState<any>(null);
  const [generatingSEO, setGeneratingSEO] = useState(false);
  const [scraping, setScraping] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSynthesisAvailable, setSpeechSynthesisAvailable] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.speechSynthesis) {
      setSpeechSynthesisAvailable(false);
    }
  }, []);

  const playVoiceOver = () => {
    if (!context || !speechSynthesisAvailable) return;
    
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Build the script from the context
    const script = `Here is the hook: ${context?.contentBrief?.hook || 'N/A'}. 

And here is the story structure. ${context.contentBrief.storyStructure.join(". ")}.`;
    
    const utterance = new SpeechSynthesisUtterance(script);
    
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Google')) || voices.find(v => v.lang.includes('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    utterance.rate = 1.1; // Slightly faster for shorts
    utterance.pitch = 1.0;
    
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const generateBRoll = () => {
    if (!context) return;
    const query = (context?.contentBrief?.keywords || [])[0] || context?.trend?.topic || 'N/A' || "technology";
    window.open(`https://www.pexels.com/search/videos/${encodeURIComponent(query)}/`, "_blank");
  };


  
  const handleGenerateScript = async () => {
    if(!context) return;
    setGeneratingScript(true);
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        body: JSON.stringify({
          topic: context?.trend?.topic,
          hook: context?.contentBrief?.hook,
          context: context?.contentOpportunity?.uniqueAngle
        })
      });
      const data = await res.json();
      if(data.success) setFullScript(data.data.script);
    } catch (e) {
      console.error(e);
    }
    setGeneratingScript(false);
  };

  const handleGenerateSEO = async () => {
    if(!context) return;
    setGeneratingSEO(true);
    try {
      const res = await fetch('/api/generate-seo', {
        method: 'POST',
        body: JSON.stringify({
          topic: context?.trend?.topic
        })
      });
      const data = await res.json();
      if(data.success) setFullSEO(data.data);
    } catch (e) {
      console.error(e);
    }
    setGeneratingSEO(false);
  };

  const handleScrapeComments = async () => {
    if (!videoId) {
      alert("No video selected. Go back to Dashboard and select a video.");
      return;
    }
    setScraping(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        body: JSON.stringify({ videoId })
      });
      const data = await res.json();
      if (data.success) {
        setCommentData(data.data);
      } else {
        alert("Gagal memproses komentar: " + (data.error || "Terjadi kesalahan."));
      }
    } catch (e) {
      console.error(e);
      alert("Gagal menghubungi server untuk scrape komentar.");
    } finally {
      setScraping(false);
    }
  };

  const [context, setContext] = useState<any>(null);
  const searchParams = useSearchParams();
  const videoId = searchParams.get("id");

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ videoIds: videoId ? [videoId] : [] })
      });
      const data = await res.json();
      if (data.success) {
        setContext(data.data);
      } else {
        alert("Gagal menganalisis: " + (data.error || "Terjadi kesalahan."));
      }
    } catch (e) {
      console.error(e);
      alert("Gagal menghubungi server. Pastikan API key sudah benar.");
    } finally {
      setLoading(false);
    }
  };

  
  const handleSaveToPipeline = () => {
    if (!context) return;
    
    const saved = localStorage.getItem("content_pipeline");
    let items = saved ? JSON.parse(saved) : [];
    
    const newItem = {
      id: Date.now().toString(),
      topic: context?.contentBrief?.mainTopic || context?.trend?.topic || "Untitled Idea",
      status: "Idea",
      score: context?.trend?.trendScore || 0 || context.contentOpportunity.potentialScore || 0,
      date: new Date().toLocaleDateString()
    };
    
    items.push(newItem);
    localStorage.setItem("content_pipeline", JSON.stringify(items));
    alert("Saved to Content Pipeline! Check the Library tab.");
  };

  const copyPrompt = () => {
    if (!context) return;
    navigator.clipboard.writeText(generateAiPrompt(context));
    alert("AI Prompt Copied to Clipboard!");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 md:p-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Content Analyzer</h2>
          <p className="text-neutral-500 text-xs sm:text-sm">Generate deep insights and AI briefs from viral videos.</p>
        </div>
        {!context && (
          <button 
            onClick={handleAnalyze} 
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm shadow-blue-200 w-full sm:w-auto"
          >
            <Sparkles size={18} />
            {loading ? "Analyzing Trends..." : "Analyze Selected"}
          </button>
        )}
      </div>

      {context && (
        <div className="space-y-6">
          <div className="flex gap-2 p-3 sm:p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-x-auto scrollbar-hide">
            
            <button onClick={playVoiceOver} disabled={!speechSynthesisAvailable} className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-xl text-xs sm:text-sm font-bold border border-purple-200 dark:border-purple-800">
              <Mic size={16}/> {isPlaying ? "Stop Voice Over" : "AI Voice Over"}
            </button>
            <button onClick={generateBRoll} className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl text-xs sm:text-sm font-bold border border-emerald-200 dark:border-emerald-800">
              <Video size={16}/> Get B-Roll Videos
            </button>
            <button onClick={handleGenerateScript} disabled={generatingScript} className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/40 rounded-xl text-xs sm:text-sm font-bold border border-pink-200 dark:border-pink-800">
              <FileText size={16}/> {generatingScript ? "Writing..." : "AI Script Writer"}
            </button>
            <button onClick={handleGenerateSEO} disabled={generatingSEO} className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-xl text-xs sm:text-sm font-bold border border-orange-200 dark:border-orange-800">
              <Search size={16}/> {generatingSEO ? "Optimizing..." : "AI SEO Generator"}
            </button>
            <button onClick={handleSaveToPipeline} className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl text-xs sm:text-sm font-bold border border-blue-200 dark:border-blue-800"><Library size={16}/> Save to Pipeline</button>
            <button onClick={copyPrompt} className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl text-xs sm:text-sm font-medium"><Copy size={16}/> Copy AI Prompt</button>
            <button onClick={() => exportAsMarkdown(context)} className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl text-xs sm:text-sm font-medium"><FileText size={16}/> Export Markdown</button>
            <button onClick={() => exportAsJSON(context)} className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl text-xs sm:text-sm font-medium"><FileJson size={16}/> Export JSON</button>
            <button onClick={() => exportAsCSV(context)} className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl text-xs sm:text-sm font-medium"><FileCode2 size={16}/> Export CSV</button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <section className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Lightbulb className="text-amber-500" /> Content Opportunity</h3>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100 rounded-lg mb-4">
                  <span className="font-bold">Unique Angle:</span> {context?.contentOpportunity?.uniqueAngle || 'N/A'}
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2"><span className="font-semibold text-neutral-900 dark:text-neutral-100">Content Gap:</span> {context?.contentGap || 'N/A'}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400"><span className="font-semibold text-neutral-900 dark:text-neutral-100">Format:</span> {context?.contentOpportunity?.recommendedFormat || 'N/A'}</p>
              </section>
              
              <section className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <h3 className="text-lg font-bold mb-4 border-b pb-2">Content Brief</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-500 uppercase">The Hook</h4>
                    <p className="mt-1 font-medium italic">"{context?.contentBrief?.hook || 'N/A'}"</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-500 uppercase">Story Structure</h4>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      {(context?.contentBrief?.storyStructure || []).map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>

                </div>

              </section>

              <section className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <h3 className="text-lg font-bold mb-4 border-b pb-2">YouTube Description</h3>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg whitespace-pre-line text-sm text-neutral-700 dark:text-neutral-300">
                  {context?.contentBrief?.youtubeDescription || "No description generated."}
                </div>
              </section>

              <section className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2">
                  <span className="text-purple-500">✨</span> Pre-Production & Retention
                </h3>
                {context?.preProduction ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 uppercase">Retention Predictor</h4>
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 rounded-lg text-sm">
                        <span className="font-bold">Drop-off Risk ({context?.preProduction?.retentionPredictor?.riskScore || 0}%):</span> {context?.preProduction?.retentionPredictor?.dropOffWarning || 'N/A'}
                      </div>
                      <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100 rounded-lg text-sm">
                        <span className="font-bold">Pacing Fix:</span> {context?.preProduction?.retentionPredictor?.pacingSuggestion || 'N/A'}
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <h4 className="text-sm font-semibold text-neutral-500 uppercase mb-2">Thumbnail Prompts (Midjourney/DALL-E)</h4>
                      <div className="space-y-2">
                        {(context?.preProduction?.thumbnailPrompts || []).map((prompt: string, i: number) => (
                          <div key={i} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs font-mono text-neutral-700 dark:text-neutral-300 relative group pr-10">
                            {prompt}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500 italic">No pre-production data generated for this brief.</p>
                )}

              </section>

              {fullScript && (
                <section className="p-6 bg-white dark:bg-neutral-900 border border-pink-200 dark:border-pink-900 rounded-xl">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-pink-600"><FileText size={20} /> Generated Full Script</h3>
                  <div className="space-y-4">
                    {fullScript.map((s: any, idx: number) => (
                      <div key={idx} className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <span className="text-xs font-bold uppercase text-neutral-500">{s.section}</span>
                        <p className="mt-2 text-sm font-mono text-purple-600 dark:text-purple-400">[{s.visual}]</p>
                        <p className="mt-2 text-sm text-neutral-800 dark:text-neutral-200">🗣️ {s.voiceOver}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {fullSEO && (
                <section className="p-6 bg-white dark:bg-neutral-900 border border-orange-200 dark:border-orange-900 rounded-xl">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-orange-600"><Search size={20} /> Optimized SEO Metadata</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 uppercase">Title Ideas</h4>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-sm font-medium">
                        {(fullSEO.titleIdeas || []).map((t: string, i: number) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 uppercase">Description</h4>
                      <p className="mt-2 text-sm p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg whitespace-pre-line">{fullSEO.description}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 uppercase">Tags</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(fullSEO.tags || []).map((tag: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-neutral-200 dark:bg-neutral-700 text-xs rounded-md">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
            
            <div className="space-y-6">
              <section className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <h3 className="text-lg font-bold mb-4 border-b pb-2">Trend Context</h3>
                <div className="space-y-3 text-sm">
                  <p><span className="font-semibold">Topic:</span> {context?.trend?.topic || 'N/A'}</p>
                  <p><span className="font-semibold">Score:</span> {context?.trend?.trendScore || 0}/100</p>
                  <p><span className="font-semibold">Status:</span> {context?.trend?.trendStatus || 'N/A'}</p>
                  <p className="text-neutral-500">{context?.trend?.whyTrending || 'N/A'}</p>
                </div>
              </section>
              
              <section className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <h3 className="text-lg font-bold mb-4 border-b pb-2">Audience</h3>
                <div className="space-y-3 text-sm">
                  <p><span className="font-semibold">Target:</span> {context?.audience?.primaryAudience || 'N/A'}</p>
                  <div>
                    <span className="font-semibold">Pain Points:</span>
                    <ul className="list-disc list-inside mt-1 text-neutral-500">
                      {(context?.audience?.audiencePainPoints || []).map((p: string, i: number) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                </div>
              </section>

              {videoId && (
                <section className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl mt-6">
                  <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <span className="text-blue-500">💬</span> Audience Voice (Comment Scraper)
                    </h3>
                    <button 
                      onClick={handleScrapeComments} 
                      disabled={scraping}
                      className="text-xs bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 px-3 py-1.5 rounded-md font-bold transition-colors"
                    >
                      {scraping ? "Scraping 100 Comments..." : "Scrape Comments for Ideas"}
                    </button>
                  </div>

                  {!commentData && !scraping && (
                    <p className="text-sm text-neutral-500 italic">Click the button above to extract hidden content ideas directly from viewer comments.</p>
                  )}

                  {commentData && (
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex-1">
                          <h4 className="text-xs font-bold text-neutral-500 uppercase mb-1">Sentiment</h4>
                          <p className="font-semibold">{commentData.sentiment}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-neutral-500 uppercase mb-2">Top Viewer Questions</h4>
                          <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                            {commentData.topQuestions.map((q: string, i: number) => <li key={i}>{q}</li>)}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-neutral-500 uppercase mb-2">Common Complaints</h4>
                          <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                            {commentData.commonComplaints.map((c: string, i: number) => <li key={i}>{c}</li>)}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 mt-4">
                        <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                          <Lightbulb size={16} className="text-amber-500" /> Next Video Ideas (From Comments)
                        </h4>
                        <div className="space-y-3">
                          {commentData.nextVideoIdeas.map((idea: any, i: number) => (
                            <div key={i} className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                              <h5 className="font-bold text-sm mb-1">{idea.title}</h5>
                              <p className="text-xs text-neutral-500">{idea.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyzerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnalyzerContent />
    </Suspense>
  );
}
