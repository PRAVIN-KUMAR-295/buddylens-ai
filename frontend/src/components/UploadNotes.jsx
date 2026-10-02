import React, { useState } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, ArrowRight } from "lucide-react";
import { uploadPdf, pasteNotes } from "../api";

export function UploadNotes({ onDocumentReady, onLoadDemo, loadingDemo }) {
  const [activeTab, setActiveTab] = useState("pdf"); // "pdf" or "paste"
  
  // PDF state
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(null);

  // Paste state
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pasteError, setPasteError] = useState("");

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please select a valid PDF file. For other notes, switch to the 'Paste Notes' tab.");
      setFile(null);
      return;
    }
    setUploadError("");
    setFile(selectedFile);
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const doc = await uploadPdf(file);
      setUploadSuccess(doc);
      onDocumentReady(doc);
    } catch (err) {
      setUploadError(err.message || "Failed to process PDF.");
    } finally {
      setUploading(false);
    }
  };

  const handlePasteSubmit = async (e) => {
    e.preventDefault();
    if (!pasteContent.trim()) {
      setPasteError("Please enter some notes content.");
      return;
    }
    setPasting(true);
    setPasteError("");
    try {
      const doc = await pasteNotes(pasteTitle || "Pasted Notes", pasteContent);
      onDocumentReady(doc);
    } catch (err) {
      setPasteError(err.message || "Failed to save notes.");
    } finally {
      setPasting(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Add Study Material
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Upload your lecture slides or syllabus PDF, or paste text directly.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", justifyContent: "center" }}>
        <button 
          className={`nav-tab ${activeTab === "pdf" ? "active" : ""}`}
          onClick={() => setActiveTab("pdf")}
        >
          <UploadCloud size={16} /> PDF Upload
        </button>
        <button 
          className={`nav-tab ${activeTab === "paste" ? "active" : ""}`}
          onClick={() => setActiveTab("paste")}
        >
          <FileText size={16} /> Paste Notes
        </button>
      </div>

      {/* PDF Upload Tab */}
      {activeTab === "pdf" && (
        <div className="glass-card">
          <div 
            className={`dropzone ${dragActive ? "drag-active" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("pdf-file-input").click()}
          >
            <input 
              id="pdf-file-input" 
              type="file" 
              accept=".pdf" 
              style={{ display: "none" }} 
              onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
            />
            <UploadCloud size={48} color="#818cf8" style={{ margin: "0 auto 1rem" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.25rem" }}>
              {file ? file.name : "Drag & drop your lecture PDF here"}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze` : "or click to browse from your device (Max 15MB)"}
            </p>
          </div>

          {uploadError && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", borderRadius: "8px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#fb7185", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
              <AlertCircle size={18} /> {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", borderRadius: "8px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
              <CheckCircle2 size={18} /> Processed {uploadSuccess.chunk_count} study passages successfully!
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
            <button className="btn-ghost" onClick={onLoadDemo} disabled={loadingDemo} style={{ fontSize: "0.85rem" }}>
              <Sparkles size={15} color="#38bdf8" /> {loadingDemo ? "Loading Demo..." : "Don't have a PDF? Load Demo Notes"}
            </button>
            <button 
              className="btn-primary" 
              disabled={!file || uploading} 
              onClick={handleUploadSubmit}
            >
              {uploading ? "Extracting & Chunking..." : "Process PDF Notes"}
            </button>
          </div>
        </div>
      )}

      {/* Paste Notes Tab */}
      {activeTab === "paste" && (
        <form className="glass-card" onSubmit={handlePasteSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              Document Title
            </label>
            <input 
              type="text" 
              className="chat-input" 
              style={{ width: "100%" }}
              placeholder="e.g. Distributed Systems Lecture 4" 
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              Paste Lecture Text / Exam Notes
            </label>
            <textarea 
              rows={12} 
              className="chat-input"
              style={{ width: "100%", resize: "vertical", fontFamily: "inherit" }}
              placeholder="Paste notes, definitions, formulas, or transcript excerpts here..."
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
            />
          </div>

          {pasteError && (
            <div style={{ marginBottom: "1rem", padding: "0.75rem", borderRadius: "8px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#fb7185", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
              <AlertCircle size={18} /> {pasteError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button type="button" className="btn-ghost" onClick={onLoadDemo} disabled={loadingDemo} style={{ fontSize: "0.85rem" }}>
              <Sparkles size={15} color="#38bdf8" /> Load Sample Dataset
            </button>
            <button type="submit" className="btn-primary" disabled={pasting || !pasteContent.trim()}>
              {pasting ? "Processing..." : "Save & Open Workspace"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
