// client/src/App.jsx
import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
// import './App.css'; // You can delete the default App.css or keep it for custom styles

const App = () => {
  // We start with a basic LaTeX document
  const defaultCode = `\\documentclass{article}\n\\begin{document}\n\nHello World!\n\nThis text is not very academic.\n\n\\end{document}`;
  
  const [code, setCode] = useState(defaultCode);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // The editorRef allows us to grab the highlighted text
  const editorRef = useRef(null);

  // This function is called the moment the editor loads on the screen
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  // The core AI function
  const handleAiEdit = async (instruction) => {
    const editor = editorRef.current;
    if (!editor) return;

    // 1. Get the highlighted text from the editor
    const selection = editor.getSelection();
    const selectedText = editor.getModel().getValueInRange(selection);

    if (!selectedText) {
      alert("Please highlight some text first!");
      return;
    }

    setIsProcessing(true);

    // 2. Send the highlighted text to our new backend
    try {
      const response = await fetch('http://localhost:5000/api/edit-latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedText, instruction })
      });

      const data = await response.json();
      const aiGeneratedLatex = data.result;

      // 3. Replace the highlighted text with the AI's output
      editor.executeEdits("ai-edit", [
        {
          range: selection,
          text: aiGeneratedLatex,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* Top Toolbar */}
      <div style={{ padding: '10px 20px', backgroundColor: '#343ef5', borderBottom: '1px solid #ccc', display: 'flex', gap: '10px' }}>
        <h2>L(Ai)TEX</h2>
        
        {/* Our AI Trigger Buttons */}
        <button 
          onClick={() => handleAiEdit("Rewrite this to sound more academic and professional.")}
          disabled={isProcessing}
          style={{ padding: '5px 15px', cursor: 'pointer', marginLeft: 'auto' }}
        >
          {isProcessing ? "Processing..." : "Make Academic ✨"}
        </button>
        
        <button 
          onClick={() => handleAiEdit("Fix any LaTeX compilation errors in this code.")}
          disabled={isProcessing}
          style={{ padding: '5px 15px', cursor: 'pointer' }}
        >
          Fix Errors 🛠️
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexGrow: 1 }}>
        
        {/* Editor Half */}
        <div style={{ width: '50%', borderRight: '1px solid #ccc' }}>
          <Editor
            height="100%"
            defaultLanguage="latex"
            value={code}
            onMount={handleEditorDidMount}
            onChange={(value) => setCode(value)}
            theme="vs-dark" // Looks cooler
            options={{
              wordWrap: "on", // Wrap long lines of text
              minimap: { enabled: false }, // Hide the mini-map on the right to save space
            }}
          />
        </div>

        {/* Preview Half */}
        <div style={{ width: '50%', padding: '20px', backgroundColor: '#fafafa' }}>
          <h3>PDF Preview (Coming Soon)</h3>
          <p>For now, highlight text in the editor on the left and click one of the AI buttons in the top right to see it modify the code!</p>
        </div>
      </div>
      
    </div>
  );
};

export default App;