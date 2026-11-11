const fs = require('fs');
const file = 'src/app/dashboard/analyzer/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove old YouTube Description section
content = content.replace(/<section className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">\s*<h3 className="text-lg font-bold mb-4 border-b pb-2">YouTube Description<\/h3>\s*<div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg whitespace-pre-line text-sm text-neutral-700 dark:text-neutral-300">\s*\{context\?\.contentBrief\?\.youtubeDescription \|\| "No description generated\."\}\s*<\/div>\s*<\/section>/g, '');

// Remove old Pre-Production section
content = content.replace(/<section className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">\s*<h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2">\s*<span className="text-purple-500">✨<\/span> Pre-Production & Retention\s*<\/h3>[\s\S]*?<\/section>/g, '');

fs.writeFileSync(file, content);
