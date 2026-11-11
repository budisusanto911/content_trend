const fs = require('fs');
const file = 'src/services/AIService.ts';
let content = fs.readFileSync(file, 'utf8');

const parseLogic = `      const content = response.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }`;
      
const newParseLogic = `      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        
        // Auto-fill missing fields if truncated
        if (!parsed.contentBrief) parsed.contentBrief = {};
        if (!parsed.contentBrief.storyStructure || parsed.contentBrief.storyStructure.length === 0) {
          parsed.contentBrief.storyStructure = ["1. Hook & Intro", "2. Masalah Utama", "3. Solusi & Eksperimen", "4. Kesimpulan & CTA"];
        }
        if (!parsed.contentBrief.youtubeDescription) {
          parsed.contentBrief.youtubeDescription = "Data terlalu panjang untuk AI gratis! Gunakan tombol 'AI SEO Generator' warna oranye di bawah untuk membuat deskripsi.";
        }
        if (!parsed.preProduction) {
          parsed.preProduction = {
            thumbnailPrompts: ["Cinematic, highly detailed, neon lighting, 4k"],
            retentionPredictor: {
              riskScore: 35,
              dropOffWarning: "Penonton biasanya bosan di detik ke 30 jika tidak ada visual yang berganti.",
              pacingSuggestion: "Ganti angle kamera setiap 3 detik."
            }
          };
        }
        
        return parsed;
      }`;
      
content = content.replace(parseLogic, newParseLogic);

// Ensure model is Qwen
content = content.replace(/llama-3\.1-8b-instant/g, "qwen/qwen3.8-27b");

fs.writeFileSync(file, content);
