const fs = require('fs');
const path = './content-trend-intelligence/src/app/dashboard/clipper/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add processLogs state
const statePattern = /const \[outputFile, setOutputFile\] = useState<string \| null>\(null\);/;
const stateReplace = `const [outputFile, setOutputFile] = useState<string | null>(null);\n  const [processLogs, setProcessLogs] = useState<string>("");`;
content = content.replace(statePattern, stateReplace);

// Add useEffect for polling
const useEffectPattern = /const fetchProfiles = async \(\) => {/;
const useEffectReplace = `useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("/api/logs");
          const data = await res.json();
          if (data.logs) {
             setProcessLogs(data.logs);
          }
        } catch(e) {}
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const fetchProfiles = async () => {`;
content = content.replace(useEffectPattern, useEffectReplace);

// Add Terminal UI
const buttonPattern = /{status === "success" && outputFile && \(/;
const terminalReplace = `
            {isProcessing && (
              <div className="mt-6 bg-gray-900 rounded-xl p-4 overflow-hidden border border-gray-800">
                <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-400 ml-2 font-mono">Terminal Output</span>
                </div>
                <div className="h-48 overflow-y-auto font-mono text-xs text-green-400 whitespace-pre-wrap flex flex-col-reverse">
                  {processLogs ? processLogs : "Memulai pipeline..."}
                </div>
              </div>
            )}
            
            {status === "success" && outputFile && (`;
content = content.replace(buttonPattern, terminalReplace);

// Clear logs on click
const handleClipPattern = /setOutputFile\(null\);/;
const handleClipReplace = `setOutputFile(null);\n    setProcessLogs("");\n    fetch("/api/logs", { method: "DELETE" }).catch(()=>console.log("no log to delete"));`;
content = content.replace(handleClipPattern, handleClipReplace);

fs.writeFileSync(path, content);
console.log("Updated frontend to show logs!");
