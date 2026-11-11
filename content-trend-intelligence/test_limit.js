require('dotenv').config();
const { OpenAI } = require('openai');

const ai = new OpenAI({ 
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY
});

async function run() {
  try {
    const response = await ai.chat.completions.create({
      model: "qwen/qwen3.8-27b",
      messages: [{ role: "user", content: "Test" }],
      max_tokens: 1500
    });
    console.log("Success with 1500");
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
run();
