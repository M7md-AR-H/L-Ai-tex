// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/edit-latex', async (req, res) => {
  const { selectedText, instruction } = req.body;

  if (!selectedText) {
    return res.status(400).json({ error: "No text provided" });
  }

  // The Prompt: We explicitly tell the AI to ONLY return code
  const prompt = `
    You are an expert LaTeX assistant.
    The user's instruction is: "${instruction}"
    
    Here is the LaTeX code to modify:
    ${selectedText}
    
    CRITICAL: Return ONLY the raw, modified LaTeX code. Do not wrap it in markdown blocks (no \`\`\`latex). Do not include any explanations or conversational text.
  `;

  try {
    // Using the fast flash model for quick edits
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    let outputText = result.response.text();

    // Safety cleanup: Sometimes models ignore instructions and add markdown anyway
    outputText = outputText.replace(/^```latex\n/i, '').replace(/\n```$/i, '');

    res.json({ result: outputText.trim() });
  } catch (error) {
    console.error("AI API failed", error);
    res.status(500).json({ error: "Failed to generate AI response" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});