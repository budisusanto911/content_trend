require('dotenv').config({path: '.env.local'});
if (!process.env.GROQ_API_KEY) require('dotenv').config({path: '.env'});

const { OpenAI } = require("openai");
const ai = new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: process.env.GROQ_API_KEY });

async function run() {
  try {
    const res = await ai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{role: "user", content: "Say hello"}],
    });
    console.log("Success:", res.choices[0].message.content);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
run();
