const fs = require('fs');
const path = 'src/app/dashboard/analyzer/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// The UI has a grid system for context sections.
// I will add a new section for Pre-Production & Retention.

const newSection = `
              <section className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2">
                  <span className="text-purple-500">✨</span> Pre-Production & Retention
                </h3>
                {context.preProduction && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-500 uppercase">Retention Predictor</h4>
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 rounded-lg text-sm">
                        <span className="font-bold">Drop-off Risk ({context.preProduction.retentionPredictor.riskScore}%):</span> {context.preProduction.retentionPredictor.dropOffWarning}
                      </div>
                      <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100 rounded-lg text-sm">
                        <span className="font-bold">Pacing Fix:</span> {context.preProduction.retentionPredictor.pacingSuggestion}
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <h4 className="text-sm font-semibold text-neutral-500 uppercase mb-2">Thumbnail Prompts (Midjourney/DALL-E)</h4>
                      <div className="space-y-2">
                        {context.preProduction.thumbnailPrompts.map((prompt: string, i: number) => (
                          <div key={i} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs font-mono text-neutral-700 dark:text-neutral-300 relative group pr-10">
                            {prompt}
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(prompt);
                                alert('Thumbnail prompt copied!');
                              }}
                              className="absolute right-2 top-2 p-1.5 bg-white dark:bg-neutral-700 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Copy Prompt"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {!context.preProduction && (
                  <p className="text-sm text-neutral-500 italic">No pre-production data generated for this brief.</p>
                )}
              </section>
`;

// Insert the new section just after the YouTube Description section
code = code.replace(
  /<\/section>\s*<\/div>\s*<div className="space-y-6">/,
  `</section>\n${newSection}\n            </div>\n            \n            <div className="space-y-6">`
);

fs.writeFileSync(path, code);
