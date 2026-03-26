// client/src/App.jsx
import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Upload, Download, Sparkles, Wrench, FileCode2, Play } from 'lucide-react';

const App = () => {
  const defaultCode = `\\documentclass{article}\n\\begin{document}\n\nHello World!\n\nThis text is not very academic.\n\n\\end{document}`;
  
  const [code, setCode] = useState(defaultCode);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // States for PDF compilation
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  // --- LOCAL PDF COMPILATION LOGIC ---
  const handleCompile = async () => {
    setIsCompiling(true);
    try {
      const response = await fetch('http://localhost:5000/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }) // Send code to our local backend
      });

      if (response.ok) {
        // The backend sends back a raw PDF file, so we read it as a "blob"
        const blob = await response.blob();
        
        // Create a temporary local URL for the iframe to display
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

  // --- AI LOGIC ---
  const handleAiEdit = async (instruction) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    const selectedText = editor.getModel().getValueInRange(selection);

    if (!selectedText) {
      alert("Please highlight some text in the editor first!");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('http://localhost:5000/api/edit-latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedText, instruction })
      });

      const data = await response.json();
      
      editor.executeEdits("ai-edit", [
        {
          range: selection,
          text: data.result,
          forceMoveMarkers: true
        }
      ]);
    } catch (error) {
      console.error("AI API failed", error);
      alert("Failed to reach the AI. Is your server running?");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- ZIP IMPORT LOGIC ---
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

  // --- ZIP EXPORT LOGIC ---
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

  // --- UI COMPONENTS ---
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

      {/* Top Navbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', backgroundColor: '#181825', color: '#ffffff', borderBottom: '1px solid #313244' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileCode2 size={24} color="#4f46e5" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', letterSpacing: '0.5px' }}>L(Ai)TEX</h2>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <TopBarButton onClick={() => fileInputRef.current.click()} icon={Upload} text="Import .zip" />
          <TopBarButton onClick={handleExportZip} icon={Download} text="Export .zip" />
          
          <div style={{ width: '1px', backgroundColor: '#313244', margin: '0 8px' }} /> 

          {/* New Local Compile Button */}
          <TopBarButton 
            onClick={handleCompile} 
            icon={Play} 
            text={isCompiling ? "Compiling..." : "Compile PDF"} 
            highlight={true}
            disabled={isCompiling}
          />

          <div style={{ width: '1px', backgroundColor: '#313244', margin: '0 8px' }} /> 

          <TopBarButton onClick={() => handleAiEdit("Rewrite this to sound more academic and professional.")} icon={Sparkles} text={isProcessing ? "Processing..." : "Make Academic"} primary={true} disabled={isProcessing} />
          <TopBarButton onClick={() => handleAiEdit("Fix any LaTeX compilation errors in this code.")} icon={Wrench} text="Fix Errors" primary={true} disabled={isProcessing} />
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexGrow: 1, height: 'calc(100vh - 60px)' }}>
        
        {/* Editor Pane */}
        <div style={{ width: '50%', height: '100%', borderRight: '1px solid #313244' }}>
          <Editor
            height="100%"
            defaultLanguage="latex"
            value={code}
            onMount={handleEditorDidMount}
            onChange={(value) => setCode(value)}
            theme="vs-dark"
            options={{ wordWrap: "on", minimap: { enabled: false }, fontSize: 15, padding: { top: 20 }, fontFamily: "'Fira Code', 'JetBrains Mono', monospace" }}
          />
        </div>

        {/* Preview Pane */}
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