const fs = require('fs');
const path = 'src/app/dashboard/analyzer/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add state for Voice Over
const voiceState = `
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
    const script = \`Here is the hook: \${context.contentBrief.hook}. \n\nAnd here is the story structure. \${context.contentBrief.storyStructure.join(". ")}.\`;
    
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
    const query = context.contentBrief.keywords[0] || context.trend.topic || "technology";
    window.open(\`https://www.pexels.com/search/videos/\${encodeURIComponent(query)}/\`, "_blank");
  };
`;

code = code.replace(
  'const [scraping, setScraping] = useState(false);',
  'const [scraping, setScraping] = useState(false);\n' + voiceState
);

// We need to import useEffect
if (!code.includes('useEffect')) {
  code = code.replace('useState, Suspense', 'useState, useEffect, Suspense');
}

// Add Mic and Video icons to import
code = code.replace('Library }', 'Library, Mic, Video }');

const generateButtons = `
            <button onClick={playVoiceOver} disabled={!speechSynthesisAvailable} className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-md text-sm font-bold border border-purple-200 dark:border-purple-800">
              <Mic size={16}/> {isPlaying ? "Stop Voice Over" : "AI Voice Over"}
            </button>
            <button onClick={generateBRoll} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-md text-sm font-bold border border-emerald-200 dark:border-emerald-800">
              <Video size={16}/> Get B-Roll Videos
            </button>
`;

code = code.replace(
  '<button onClick={handleSaveToPipeline}',
  generateButtons + '\n            <button onClick={handleSaveToPipeline}'
);

fs.writeFileSync(path, code);
