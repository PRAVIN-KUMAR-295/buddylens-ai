import React from "react";
import { 
  BarChart2, HelpCircle, CheckCircle2, AlertTriangle, 
  FileText, TrendingUp, BookOpen 
} from "lucide-react";

export function InsightsView({ insights, onSelectDoc, onNavigateToQuiz }) {
  const weakTopics = insights?.weak_topics || [];
  const recentDocs = insights?.recent_documents || [];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>
          Study Insights & Analytics
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Verifiable metrics generated from your actual study notes and quiz performances.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid-4">
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)", fontWeight: 600 }}>DOCUMENTS</span>
            <FileText size={16} color="#818cf8" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{insights?.total_documents || 0}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Processed note files</div>
        </div>

        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)", fontWeight: 600 }}>QUESTIONS ASKED</span>
            <HelpCircle size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{insights?.questions_asked || 0}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Grounded queries</div>
        </div>

        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)", fontWeight: 600 }}>QUIZZES TAKEN</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{insights?.quizzes_completed || 0}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Active recall checks</div>
        </div>

        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)", fontWeight: 600 }}>AVG SCORE</span>
            <TrendingUp size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{insights?.average_quiz_score || 0}%</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Across all submissions</div>
        </div>
      </div>

      {/* Grid: Weak Topics & Recent Documents */}
      <div className="grid-2">
        {/* Identified Weak Topics */}
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={16} color="#f43f5e" /> Identified Weak Topics
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>Based on quiz mistakes</span>
          </div>

          {weakTopics.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No missed topics recorded yet. Take practice quizzes to detect areas needing reinforcement.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {weakTopics.map((item, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.7rem 0.9rem",
                    borderRadius: "6px",
                    background: "rgba(244,63,94,0.06)",
                    border: "1px solid rgba(244,63,94,0.15)"
                  }}
                >
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fca5a5" }}>{item.topic}</span>
                  <span style={{ fontSize: "0.75rem", color: "#f87171", fontWeight: 700 }}>
                    {item.mistake_count} {item.mistake_count === 1 ? "miss" : "misses"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Study Materials */}
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <BookOpen size={16} color="#818cf8" /> Recent Documents
            </h3>
          </div>

          {recentDocs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No documents processed yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {recentDocs.map((doc) => (
                <div 
                  key={doc.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.7rem 0.9rem",
                    borderRadius: "6px",
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border-color)",
                    cursor: "pointer"
                  }}
                  onClick={() => onSelectDoc(doc)}
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "0.5rem" }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-main)" }}>{doc.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>{doc.word_count} words</div>
                  </div>
                  <span className="badge-tag">{doc.source_type.toUpperCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
