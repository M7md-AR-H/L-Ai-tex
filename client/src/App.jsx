import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Upload, Download, Sparkles, FileCode2, Play, Send } from 'lucide-react';

const App = () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const defaultCode = `\\documentclass{article}\n\\begin{document}\n\nHello World!\n\nThis text is not very academic.\n\n\\end{document}`;
  
  const [code, setCode] = useState(defaultCode);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(""); // New state for custom AI instructions
  
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  const handleCompile = async () => {
    setIsCompiling(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } else {
        alert("Compilation failed! There might be a syntax error in your LaTeX code.");
      }
    } catch (error) {
      console.error("Compile error:", error);
      alert("Failed to connect to the compilation server. Is the backend running?");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim()) return;
    
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    const selectedText = editor.getModel().getValueInRange(selection);

    if (!selectedText) {
      alert("Please highlight the portion of LaTeX code you want the AI to modify.");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/edit-latex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedText, instruction: aiPrompt }) // Sending the custom prompt
      });

      const data = await response.json();
      
      editor.executeEdits("ai-edit", [
        {
          range: selection,
          text: data.result,
          forceMoveMarkers: true
        }
      ]);
      
      setAiPrompt(""); 
    } catch (error) {
      console.error("AI API failed", error);
      alert("Failed to reach the AI. Is your server running?");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportZip = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const texFiles = Object.keys(loadedZip.files).filter(name => name.endsWith('.tex'));
      
      if (texFiles.length === 0) {
        alert("No .tex files found in the uploaded zip.");
        return;
      }

      const targetFileName = texFiles.find(name => name.toLowerCase().includes('main.tex')) || texFiles[0];
      const fileContent = await loadedZip.files[targetFileName].async("string");
      setCode(fileContent);
      event.target.value = null; 
    } catch (error) {
      console.error("Error reading zip file:", error);
      alert("Failed to read the zip file. Make sure it is a valid zip archive.");
    }
  };

  const handleExportZip = async () => {
    try {
      const zip = new JSZip();
      zip.file("main.tex", code);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "latex_project.zip");
    } catch (error) {
      console.error("Error creating zip file:", error);
      alert("Failed to export the project.");
    }
  };

  const TopBarButton = ({ onClick, icon: Icon, text, primary, disabled, highlight }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: highlight ? '#10b981' : (primary ? '#4f46e5' : '#2b2d31'),
        color: disabled ? '#888' : '#ffffff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s',
        opacity: disabled ? 0.7 : 1
      }}
    >
      <Icon size={16} />
      {text}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <input type="file" accept=".zip" ref={fileInputRef} onChange={handleImportZip} style={{ display: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', backgroundColor: '#181825', color: '#ffffff', borderBottom: '1px solid #313244' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileCode2 size={24} color="#4f46e5" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', letterSpacing: '0.5px' }}>L(Ai)TEX</h2>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <TopBarButton onClick={() => fileInputRef.current.click()} icon={Upload} text="Import .zip" />
          <TopBarButton onClick={handleExportZip} icon={Download} text="Export .zip" />
          <div style={{ width: '1px', backgroundColor: '#313244', margin: '0 8px' }} /> 
          <TopBarButton onClick={handleCompile} icon={Play} text={isCompiling ? "Compiling..." : "Compile PDF"} highlight={true} disabled={isCompiling} />
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1, height: 'calc(100vh - 60px)' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', width: '50%', height: '100%', borderRight: '1px solid #313244', backgroundColor: '#1e1e2e' }}>
          
          <div style={{ padding: '12px 16px', backgroundColor: '#181825', borderBottom: '1px solid #313244', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles size={20} color="#a6adc8" />
            <input 
              type="text" 
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAiSubmit(); }}
              placeholder="Highlight code, then type an instruction (e.g. 'Convert this list to a table')..."
              disabled={isProcessing}
              style={{
                flexGrow: 1,
                backgroundColor: '#1e1e2e',
                border: '1px solid #313244',
                color: '#cdd6f4',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleAiSubmit}
              disabled={isProcessing || !aiPrompt.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 12px',
                backgroundColor: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: (isProcessing || !aiPrompt.trim()) ? 'not-allowed' : 'pointer',
                opacity: (isProcessing || !aiPrompt.trim()) ? 0.6 : 1,
                transition: '0.2s'
              }}
            >
              <Send size={16} />
            </button>
          </div>

          <div style={{ flexGrow: 1 }}>
            <Editor
              height="100%"
              defaultLanguage="latex"
              value={code}
              onMount={handleEditorDidMount}
              onChange={(value) => setCode(value)}
              theme="vs-dark"
              options={{ wordWrap: "on", minimap: { enabled: false }, fontSize: 15, padding: { top: 16 }, fontFamily: "'Fira Code', 'JetBrains Mono', monospace" }}
            />
          </div>
        </div>

        <div style={{ width: '50%', height: '100%', backgroundColor: '#1e1e2e', display: 'flex', flexDirection: 'column' }}>
          {pdfUrl ? (
            <iframe 
              src={pdfUrl} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              title="PDF Preview"
            />
          ) : (
            <div style={{ margin: 'auto', padding: '24px', backgroundColor: '#181825', borderRadius: '12px', border: '1px dashed #313244', textAlign: 'center', color: '#a6adc8', maxWidth: '400px' }}>
              <h3 style={{ color: '#cdd6f4', marginTop: 0 }}>No PDF Generated</h3>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                Click the green <strong>Compile PDF</strong> button to compile the code locally via your Node.js server.
              </p>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};

export default App;