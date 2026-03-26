// client/src/App.jsx
import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Upload, Download, Sparkles, Wrench, FileCode2 } from 'lucide-react';

const App = () => {
  const defaultCode = `\\documentclass{article}\n\\begin{document}\n\nHello World!\n\nThis text is not very academic.\n\n\\end{document}`;
  
  const [code, setCode] = useState(defaultCode);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
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
      
      // Find all .tex files in the zip
      const texFiles = Object.keys(loadedZip.files).filter(name => name.endsWith('.tex'));
      
      if (texFiles.length === 0) {
        alert("No .tex files found in the uploaded zip.");
        return;
      }

      // Prioritize 'main.tex' if it exists, otherwise take the first .tex file found
      const targetFileName = texFiles.find(name => name.toLowerCase().includes('main.tex')) || texFiles[0];
      
      // Extract the text content
      const fileContent = await loadedZip.files[targetFileName].async("string");
      setCode(fileContent);
      
      // Clear the input so the same file can be uploaded again if needed
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
      // Add our current editor code to the zip as main.tex
      zip.file("main.tex", code);
      
      // Generate the zip file and trigger download
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "latex_project.zip");
    } catch (error) {
      console.error("Error creating zip file:", error);
      alert("Failed to export the project.");
    }
  };

  // --- UI COMPONENTS ---
  // A helper component for our professional buttons
  const TopBarButton = ({ onClick, icon: Icon, text, primary, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: primary ? '#4f46e5' : '#2b2d31',
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
      
      {/* Hidden file input for ZIP upload */}
      <input 
        type="file" 
        accept=".zip" 
        ref={fileInputRef} 
        onChange={handleImportZip} 
        style={{ display: 'none' }} 
      />

      {/* Top Navbar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '12px 24px', 
        backgroundColor: '#181825', // Dark IDE header
        color: '#ffffff',
        borderBottom: '1px solid #313244'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileCode2 size={24} color="#4f46e5" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', letterSpacing: '0.5px' }}>L(Ai)TEX</h2>
        </div>
        
        {/* Right side controls */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* File Operations */}
          <TopBarButton 
            onClick={() => fileInputRef.current.click()} 
            icon={Upload} 
            text="Import .zip" 
          />
          <TopBarButton 
            onClick={handleExportZip} 
            icon={Download} 
            text="Export .zip" 
          />
          
          <div style={{ width: '1px', backgroundColor: '#313244', margin: '0 8px' }} /> {/* Divider */}

          {/* AI Tools */}
          <TopBarButton 
            onClick={() => handleAiEdit("Rewrite this to sound more academic and professional.")} 
            icon={Sparkles} 
            text={isProcessing ? "Processing..." : "Make Academic"} 
            primary={true}
            disabled={isProcessing}
          />
          <TopBarButton 
            onClick={() => handleAiEdit("Fix any LaTeX compilation errors in this code.")} 
            icon={Wrench} 
            text="Fix Errors" 
            primary={true}
            disabled={isProcessing}
          />
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
            options={{
              wordWrap: "on",
              minimap: { enabled: false },
              fontSize: 15,
              padding: { top: 20 },
              fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
            }}
          />
        </div>

        {/* Preview Pane */}
        <div style={{ 
          width: '50%', 
          height: '100%', 
          backgroundColor: '#1e1e2e', 
          color: '#a6adc8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ padding: '24px', backgroundColor: '#181825', borderRadius: '12px', border: '1px dashed #313244' }}>
            <h3 style={{ color: '#cdd6f4', marginTop: 0 }}>PDF Preview Not Connected</h3>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
              The editor logic and AI integration are active.<br/>
              Highlight text on the left to test the AI formatting, or try importing/exporting a `.zip` file from the top menu.
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default App;