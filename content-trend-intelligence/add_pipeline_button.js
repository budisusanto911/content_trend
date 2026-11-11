const fs = require('fs');
const path = 'src/app/dashboard/analyzer/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const saveToPipelineFunc = `
  const handleSaveToPipeline = () => {
    if (!context) return;
    
    const saved = localStorage.getItem("content_pipeline");
    let items = saved ? JSON.parse(saved) : [];
    
    const newItem = {
      id: Date.now().toString(),
      topic: context.contentBrief.mainTopic || context.trend.topic || "Untitled Idea",
      status: "Idea",
      score: context.trend.trendScore || context.contentOpportunity.potentialScore || 0,
      date: new Date().toLocaleDateString()
    };
    
    items.push(newItem);
    localStorage.setItem("content_pipeline", JSON.stringify(items));
    alert("Saved to Content Pipeline! Check the Library tab.");
  };
`;

code = code.replace(
  'const copyPrompt = () => {',
  saveToPipelineFunc + '\n  const copyPrompt = () => {'
);

const pipelineButton = `
            <button onClick={handleSaveToPipeline} className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md text-sm font-bold border border-blue-200 dark:border-blue-800"><Library size={16}/> Save to Pipeline</button>
`;

code = code.replace(
  '<button onClick={copyPrompt}',
  pipelineButton + '\n            <button onClick={copyPrompt}'
);

// We need to make sure Library icon is imported
if (!code.includes('Library,')) {
  code = code.replace('Download, FileText, Lightbulb, Sparkles, Copy, FileJson, FileCode2', 'Download, FileText, Lightbulb, Sparkles, Copy, FileJson, FileCode2, Library');
}

fs.writeFileSync(path, code);
