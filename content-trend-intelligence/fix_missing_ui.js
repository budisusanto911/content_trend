const fs = require('fs');
const file = 'src/app/dashboard/analyzer/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const descAndPreprod = `
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
`;

content = content.replace(
  `                </div>\n              \n              {fullScript && (`,
  `                </div>\n${descAndPreprod}\n              </section>\n\n              {fullScript && (`
);

fs.writeFileSync(file, content);
