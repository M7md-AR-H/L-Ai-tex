import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/edit-latex', async (req, res) => {
  const { selectedText, instruction } = req.body;

  if (!selectedText) {
    return res.status(400).json({ error: "No text provided" });
  }

  const prompt = `
    You are an expert LaTeX assistant.
    The user's instruction is: "${instruction}"
    
    Here is the LaTeX code to modify:
    ${selectedText}
    
    CRITICAL: Return ONLY the raw, modified LaTeX code. Do not wrap it in markdown blocks (no \`\`\`latex). Do not include any explanations or conversational text.
  `;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    let outputText = result.response.text();

    outputText = outputText.replace(/^```latex\n/i, '').replace(/\n```$/i, '');
    res.json({ result: outputText.trim() });
  } catch (error) {
    console.error("AI API failed", error);
    res.status(500).json({ error: "Failed to generate AI response" });
  }
});

app.post('/api/compile', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "No code provided" });

  const uniqueId = Date.now().toString();
  const tempDir = path.join(__dirname, 'temp', uniqueId);

  try {
    await fs.mkdir(tempDir, { recursive: true });
    
    const texPath = path.join(tempDir, 'main.tex');
    await fs.writeFile(texPath, code);

    exec(`pdflatex -interaction=nonstopmode main.tex`, { cwd: tempDir }, async (error, stdout, stderr) => {
      const pdfPath = path.join(tempDir, 'main.pdf');
      
      try {
        await fs.access(pdfPath);
        const pdfBuffer = await fs.readFile(pdfPath);

        res.contentType("application/pdf");
        res.send(pdfBuffer);
      } catch (pdfError) {
        console.error("PDF generation failed:", stdout);
        res.status(500).json({ error: "Compilation failed. Check your LaTeX syntax.", details: stdout });
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  } catch (err) {
    console.error("Server error during compilation:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});