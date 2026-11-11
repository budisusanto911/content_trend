const fs = require('fs');
const file = 'src/app/dashboard/analyzer/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove story structure div from UI
const oldStory = `                  <div>
                    <h4 className="text-sm font-semibold text-neutral-500 uppercase">Story Structure</h4>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      {(context?.contentBrief?.storyStructure || []).map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>`;
content = content.replace(oldStory, '');

// Since the hook was sometimes missing due to truncation, maybe it'll be fine now. But let's check if the hook is still there.

fs.writeFileSync(file, content);
