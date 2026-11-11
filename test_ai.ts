import { AIService } from "./src/services/AIService";
require('dotenv').config({path: '.env.local'});
if (!process.env.GROQ_API_KEY) {
  require('dotenv').config({path: '.env'});
}

async function run() {
  try {
    const data = await AIService.generateContentContext([
      { title: "Test video", creator: "MrBeast", metrics: { views: 1000000, likes: 10000, comments: 1000 } }
    ]);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
