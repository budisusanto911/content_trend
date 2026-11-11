const fs = require('fs');
const file = 'src/app/dashboard/analyzer/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add states
content = content.replace('const [commentData, setCommentData] = useState<any>(null);', 
`const [commentData, setCommentData] = useState<any>(null);
  const [fullScript, setFullScript] = useState<any>(null);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [fullSEO, setFullSEO] = useState<any>(null);
  const [generatingSEO, setGeneratingSEO] = useState(false);`);

// Add handlers
const handlers = `
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
`;

content = content.replace('const handleScrapeComments = async () => {', handlers + '\n  const handleScrapeComments = async () => {');

// Add UI buttons in the action bar
const buttons = `
            <button onClick={handleGenerateScript} disabled={generatingScript} className="flex items-center gap-2 px-4 py-2 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/40 rounded-md text-sm font-bold border border-pink-200 dark:border-pink-800">
              <FileText size={16}/> {generatingScript ? "Writing..." : "AI Script Writer"}
            </button>
            <button onClick={handleGenerateSEO} disabled={generatingSEO} className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-md text-sm font-bold border border-orange-200 dark:border-orange-800">
              <Search size={16}/> {generatingSEO ? "Optimizing..." : "AI SEO Generator"}
            </button>
`;
content = content.replace('<button onClick={handleSaveToPipeline}', buttons + '\n            <button onClick={handleSaveToPipeline}');

// Import Search icon
content = content.replace('Copy, FileText, FileJson, FileCode2, Play, Mic, Video', 'Copy, FileText, FileJson, FileCode2, Play, Mic, Video, Search');

// Add UI render blocks below Content Brief
const renderBlocks = `
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
`;

content = content.replace('</section>\n              \n              <section className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">\n                <h3 className="text-lg font-bold mb-4 border-b pb-2">YouTube Description</h3>', renderBlocks + '\n              </section>\n              \n              <section className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">\n                <h3 className="text-lg font-bold mb-4 border-b pb-2">YouTube Description</h3>');

fs.writeFileSync(file, content);
