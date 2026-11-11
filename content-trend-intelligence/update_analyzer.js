const fs = require('fs');
const path = 'src/app/dashboard/analyzer/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const newImportsAndState = `
  const [commentData, setCommentData] = useState<any>(null);
  const [scraping, setScraping] = useState(false);

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
`;

code = code.replace(
  'const [loading, setLoading] = useState(false);',
  'const [loading, setLoading] = useState(false);\n' + newImportsAndState
);

const commentSection = `
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
`;

code = code.replace(
  '</section>\n            </div>',
  '</section>\n' + commentSection + '\n            </div>'
);

fs.writeFileSync(path, code);
