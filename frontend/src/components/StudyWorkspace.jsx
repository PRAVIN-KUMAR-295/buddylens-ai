import React, { useState } from "react";
import { 
  Send, Sparkles, BookOpen, Layers, CheckCircle2, 
  HelpCircle, Lightbulb, FileText, Bookmark, Info,
  Calendar, Target, Clock
} from "lucide-react";
import { sendChatMessage, summarizeDocument } from "../api";

export function StudyWorkspace({ document, onNavigateToQuiz, onNavigateToPlan }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hello! I'm your BuddyLens AI revision assistant for "${document?.title || "your study notes"}". Ask me any question, request a plain-language explanation, or test your understanding.`,
      citations: []
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(document?.summary || "");
  const [summarizing, setSummarizing] = useState(false);

  if (!document) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>No document selected.</p>
      </div>
    );
  }

  const handleSend = async (queryText = null) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const newHistory = [...messages, { role: "user", content: textToSend }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(document.id, textToSend);
      setMessages([
        ...newHistory,
        {
          role: "assistant",
          content: res.answer,
          citations: res.citations || [],
          model_used: res.model_used
        }
      ]);
    } catch (err) {
      setMessages([
        ...newHistory,
        {
          role: "assistant",
          content: "Sorry, I encountered an issue retrieving an answer. Please verify the backend connection.",
          citations: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const res = await summarizeDocument(document.id);
      setSummary(res.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setSummarizing(false);
    }
  };

  const quickPrompts = [
    "Explain this in simple words",
    "What are the most important concepts?",
    "Give me an example",
    "What should I revise first?"
  ];

  const getBadgeColor = (type) => {
    switch ((type || "").toLowerCase()) {
      case "review": return { bg: "rgba(99,102,241,0.15)", text: "#818cf8" };
      case "practice": return { bg: "rgba(6,182,212,0.15)", text: "#22d3ee" };
      case "quiz": return { bg: "rgba(16,185,129,0.15)", text: "#34d399" };
      default: return { bg: "rgba(245,158,11,0.15)", text: "#fbbf24" };
    }
  };

  const renderMessageContent = (content) => {
    if (!content || typeof content !== "string") {
      return <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>;
    }

    const trimmed = content.trim();
    // Check if message content contains a JSON revision plan object
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && (parsed.title || parsed.overview || Array.isArray(parsed.tasks))) {
          const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {parsed.title && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <Calendar size={17} color="#818cf8" />
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
                    {parsed.title}
                  </h3>
                </div>
              )}

              {parsed.overview && (
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                  {parsed.overview}
                </p>
              )}

              {tasks.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.25rem" }}>
                  {tasks.map((task, idx) => {
                    const badge = getBadgeColor(task.task_type);
                    const stepNum = task.step_number || (idx + 1);

                    return (
                      <div 
                        key={idx}
                        className="plan-task-item"
                        style={{
                          margin: 0,
                          padding: "0.75rem 0.9rem",
                          background: "rgba(15, 23, 42, 0.6)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "8px"
                        }}
                      >
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "var(--bg-subtle)",
                          border: "1px solid var(--border-color)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#818cf8",
                          flexShrink: 0,
                          marginTop: "0.1rem"
                        }}>
                          {stepNum}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                            {task.task_type && (
                              <span className="task-badge" style={{ background: badge.bg, color: badge.text }}>
                                {task.task_type}
                              </span>
                            )}
                            <strong style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                              {task.topic || "Core Concept"}
                            </strong>
                            {task.estimated_minutes !== undefined && (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: "0.2rem", marginLeft: "auto" }}>
                                <Clock size={12} /> {task.estimated_minutes}m
                              </span>
                            )}
                          </div>

                          {task.action_detail && (
                            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
                              {task.action_detail}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
      } catch (e) {
        // Not JSON or parse error -> falls through to standard plain text
      }
    }

    return <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>;
  };

  return (
    <div className="workspace-grid">
      {/* LEFT COLUMN: Document Information & Topics */}
      <div className="glass-card column-panel">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
          <FileText size={18} color="#818cf8" />
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {document.title}
          </h3>
        </div>

        <div className="scroll-panel">
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-subtle)", fontWeight: 600, marginBottom: "0.4rem" }}>
              Metrics
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span className="badge-tag">{document.source_type.toUpperCase()}</span>
              <span className="badge-tag">{document.word_count} words</span>
              <span className="badge-tag">{document.chunk_count} passages</span>
            </div>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-subtle)", fontWeight: 600, marginBottom: "0.4rem" }}>
              Key Concepts & Sections
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {(document.topics || []).map((t, i) => (
                <div 
                  key={i} 
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    background: "var(--bg-subtle)",
                    fontSize: "0.825rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem"
                  }}
                  onClick={() => handleSend(`Explain "${t}" simply and what I need to know for the exam.`)}
                  title="Click to ask about this concept"
                >
                  <Bookmark size={12} color="#38bdf8" />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-subtle)", fontWeight: 600 }}>
                High-Yield Summary
              </span>
              <button 
                className="btn-ghost" 
                style={{ fontSize: "0.7rem", padding: "0.2rem 0.4rem" }} 
                onClick={handleSummarize} 
                disabled={summarizing}
              >
                {summarizing ? "Generating..." : summary ? "Regenerate" : "+ Generate"}
              </button>
            </div>
            {summary ? (
              <div style={{ fontSize: "0.825rem", color: "var(--text-muted)", background: "rgba(0,0,0,0.25)", padding: "0.75rem", borderRadius: "8px", lineHeight: "1.5", whiteSpace: "pre-line" }}>
                {summary}
              </div>
            ) : (
              <div style={{ fontSize: "0.78rem", color: "var(--text-subtle)", fontStyle: "italic", padding: "0.5rem" }}>
                Click "+ Generate" to create a condensed exam revision summary.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CENTER COLUMN: AI Grounded Conversation */}
      <div className="glass-card column-panel" style={{ padding: 0 }}>
        <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sparkles size={16} color="#818cf8" />
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Study Conversation</span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>Grounded with note citations</span>
        </div>

        {/* Chat Messages */}
        <div className="chat-messages">
          {messages.map((m, idx) => (
            <div key={idx} className={`message-bubble ${m.role}`}>
              {renderMessageContent(m.content)}

              {/* Citations Box */}
              {m.citations && m.citations.length > 0 && (
                <div className="citation-box">
                  <div style={{ fontWeight: 600, color: "#38bdf8", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Info size={12} /> Citations from your notes:
                  </div>
                  {m.citations.map((c, cIdx) => (
                    <div key={cIdx} style={{ marginBottom: "0.2rem" }}>
                      • <em>Page {c.page_number || "1"}:</em> "{c.snippet}"
                    </div>
                  ))}
                </div>
              )}

              {m.model_used && (
                <div style={{ fontSize: "0.7rem", color: "var(--text-subtle)", marginTop: "0.4rem", textAlign: "right" }}>
                  Engine: {m.model_used}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="message-bubble assistant">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={14} className="skeleton" style={{ width: 14, height: 14, borderRadius: "50%" }} />
                <span>Searching your notes & generating explanation...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Prompts Bar */}
        <div style={{ display: "flex", gap: "0.4rem", padding: "0.5rem 1rem", borderTop: "1px solid var(--border-color)", overflowX: "auto" }}>
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              className="btn-ghost"
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "9999px", background: "var(--bg-subtle)", border: "1px solid var(--border-color)", whiteSpace: "nowrap" }}
              onClick={() => handleSend(p)}
              disabled={loading}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chat Input */}
        <div className="chat-input-bar">
          <input 
            type="text" 
            className="chat-input"
            placeholder="Ask a question about your study material..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={loading}
          />
          <button className="btn-primary" onClick={() => handleSend()} disabled={loading || !input.trim()}>
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Quick Actions & Study Insights */}
      <div className="glass-card column-panel">
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
          Study Next Steps
        </h3>

        <div className="scroll-panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Action 1: Quiz */}
          <div style={{ padding: "0.9rem", borderRadius: "8px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem", color: "#34d399", fontWeight: 600, fontSize: "0.875rem" }}>
              <CheckCircle2 size={16} /> Active Recall Quiz
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
              Test your retention right now with a 4-question MCQ quiz created directly from these notes.
            </p>
            <button className="btn-primary" style={{ width: "100%", fontSize: "0.8rem", padding: "0.4rem" }} onClick={onNavigateToQuiz}>
              Start Quiz on Notes
            </button>
          </div>

          {/* Action 2: Revision Plan */}
          <div style={{ padding: "0.9rem", borderRadius: "8px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem", color: "#fbbf24", fontWeight: 600, fontSize: "0.875rem" }}>
              <Lightbulb size={16} /> Revision Schedule
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
              Create a step-by-step revision breakdown for today's study session.
            </p>
            <button className="btn-secondary" style={{ width: "100%", fontSize: "0.8rem", padding: "0.4rem" }} onClick={onNavigateToPlan}>
              Create Revision Plan
            </button>
          </div>

          {/* Study Advice Box */}
          <div style={{ padding: "0.85rem", borderRadius: "8px", background: "var(--bg-subtle)", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.3rem" }}>
              Revision Strategy
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
              Studies show passive reading only achieves 20% recall. Test yourself using the Quiz Mode to quickly reveal your knowledge gaps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
