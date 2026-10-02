import React from "react";
import { 
  BookOpen, Sparkles, HelpCircle, Target, ArrowRight, 
  FileText, CheckCircle2, AlertTriangle, Clock, Layers 
} from "lucide-react";

export function Dashboard({ 
  documents, 
  insights, 
  onSelectDoc, 
  onNavigate, 
  onLoadDemo, 
  loadingDemo 
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Hero Header */}
      <div className="hero-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.75rem", borderRadius: "9999px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              <Sparkles size={14} /> Open-Weight AI Revision Companion
            </div>
            <h1 className="hero-title">Turn your notes into a smarter revision session.</h1>
            <p className="hero-subtitle">
              Upload dense PDFs or paste lecture notes. Ask questions grounded in your material, test your recall with instant quizzes, and generate prioritized revision plans for weak topics.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button 
              className="btn-secondary" 
              onClick={onLoadDemo} 
              disabled={loadingDemo}
              title="Loads high-yield OS Memory Management notes immediately"
            >
              <Sparkles size={16} color="#38bdf8" /> {loadingDemo ? "Loading Demo..." : "Try Demo Dataset"}
            </button>
            <button className="btn-primary" onClick={() => onNavigate("upload")}>
              <BookOpen size={16} /> Upload Notes
            </button>
          </div>
        </div>

        {/* Quick Action Cards */}
        <div style={{ marginTop: "1.75rem" }}>
          <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-subtle)", marginBottom: "0.75rem", fontWeight: 600 }}>
            Quick Actions
          </h3>
          <div className="grid-4">
            <div className="action-card" onClick={() => onNavigate("workspace")}>
              <div className="action-icon-wrapper" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>
                <Sparkles size={20} />
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Summarize Notes</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Condense chapters into high-yield exam takeaways.</div>
            </div>

            <div className="action-card" onClick={() => onNavigate("workspace")}>
              <div className="action-icon-wrapper" style={{ background: "rgba(6,182,212,0.15)", color: "#22d3ee" }}>
                <HelpCircle size={20} />
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Explain a Topic</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Get grounded, plain-English answers with citations.</div>
            </div>

            <div className="action-card" onClick={() => onNavigate("quiz")}>
              <div className="action-icon-wrapper" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
                <CheckCircle2 size={20} />
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Generate Quiz</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Practice active recall with automated 4-option MCQs.</div>
            </div>

            <div className="action-card" onClick={() => onNavigate("plan")}>
              <div className="action-icon-wrapper" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
                <Target size={20} />
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Revision Plan</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Target your weakest concepts before test day.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Study Sessions & Weak Topics */}
      <div className="grid-2">
        {/* Recent Study Sessions */}
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Clock size={18} color="#818cf8" /> Recent Study Sessions
            </h2>
            <button className="btn-ghost" onClick={() => onNavigate("upload")} style={{ fontSize: "0.8rem" }}>
              + Add Notes
            </button>
          </div>

          {documents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
              <FileText size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
              <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>No study materials uploaded yet.</p>
              <button className="btn-secondary" style={{ fontSize: "0.8rem" }} onClick={onLoadDemo}>
                Load Demo OS Notes
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {documents.slice(0, 5).map((doc) => (
                <div 
                  key={doc.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.85rem 1rem",
                    borderRadius: "8px",
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onClick={() => onSelectDoc(doc)}
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "0.5rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-main)", marginBottom: "0.2rem" }}>
                      {doc.title}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span className="badge-tag">{doc.source_type.toUpperCase()}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                        {doc.word_count} words • {doc.chunk_count} chunks
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "#818cf8", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.2rem" }}>
                      Open <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weak Topics & Exam Readiness */}
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={18} color="#f43f5e" /> Weak Topics & Focus Areas
            </h2>
            <button className="btn-ghost" onClick={() => onNavigate("quiz")} style={{ fontSize: "0.8rem" }}>
              Take Quiz
            </button>
          </div>

          {!insights.weak_topics || insights.weak_topics.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: "0 auto 0.75rem", opacity: 0.8 }} />
              <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.25rem" }}>No Missed Topics Logged</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-subtle)", maxWidth: "300px", margin: "0 auto 1rem" }}>
                Complete a quiz on your uploaded notes to automatically detect and track your revision blindspots.
              </p>
              <button className="btn-secondary" style={{ fontSize: "0.8rem" }} onClick={() => onNavigate("quiz")}>
                Generate a Quiz
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Topics where quiz questions were missed. Prioritized for your next revision session:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {insights.weak_topics.map((item, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      background: "rgba(244,63,94,0.06)",
                      border: "1px solid rgba(244,63,94,0.2)"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#fca5a5" }}>{item.topic}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>Needs active recall review</div>
                    </div>
                    <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem", borderRadius: "9999px", background: "rgba(244,63,94,0.2)", color: "#f87171", fontWeight: 700 }}>
                      {item.mistake_count} {item.mistake_count === 1 ? "miss" : "misses"}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "1rem", textAlign: "right" }}>
                <button className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }} onClick={() => onNavigate("plan")}>
                  Build Revision Plan for These
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
