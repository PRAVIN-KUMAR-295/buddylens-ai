import React, { useState, useEffect } from "react";
import { Target, CheckCircle2, Clock, Calendar, Sparkles, BookOpen, RotateCcw } from "lucide-react";
import { generateRevisionPlan } from "../api";

export function RevisionPlan({ document, weakTopics = [], onNavigateToWorkspace }) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({});
  const [error, setError] = useState("");

  const handleGeneratePlan = async () => {
    if (!document) return;
    setLoading(true);
    setError("");
    try {
      const res = await generateRevisionPlan(document.id, weakTopics);
      setPlan(res);
    } catch (err) {
      setError(err.message || "Failed to generate revision plan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (document && !plan && !loading) {
      handleGeneratePlan();
    }
  }, [document?.id]);

  const toggleStep = (stepNumber) => {
    setCompletedSteps({
      ...completedSteps,
      [stepNumber]: !completedSteps[stepNumber]
    });
  };

  const getBadgeColor = (type) => {
    switch (type.toLowerCase()) {
      case "review": return { bg: "rgba(99,102,241,0.15)", text: "#818cf8" };
      case "practice": return { bg: "rgba(6,182,212,0.15)", text: "#22d3ee" };
      case "quiz": return { bg: "rgba(16,185,129,0.15)", text: "#34d399" };
      default: return { bg: "rgba(245,158,11,0.15)", text: "#fbbf24" };
    }
  };

  if (!document) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <p style={{ color: "var(--text-muted)" }}>Please upload or select notes first to build a revision schedule.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            Focused Revision Plan
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Tailored for notes: <strong style={{ color: "var(--text-main)" }}>{document.title}</strong>
          </p>
        </div>
        <button 
          className="btn-secondary" 
          onClick={handleGeneratePlan} 
          disabled={loading}
          style={{ fontSize: "0.85rem" }}
        >
          <RotateCcw size={15} /> Regenerate Plan
        </button>
      </div>

      {loading && (
        <div className="glass-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <Sparkles size={36} color="#818cf8" style={{ margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Structuring Your Revision Steps...
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Prioritizing detected weak topics into manageable, timed tasks.
          </p>
        </div>
      )}

      {error && (
        <div style={{ padding: "1rem", borderRadius: "8px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#fb7185", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {plan && !loading && (
        <div>
          {/* Plan Overview Card */}
          <div className="glass-card" style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Calendar size={18} color="#818cf8" />
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>{plan.plan_title}</h2>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              {plan.overview}
            </p>

            <div style={{ display: "flex", gap: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem", fontSize: "0.825rem", color: "var(--text-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Clock size={14} /> Total time: ~{plan.tasks.reduce((acc, t) => acc + (t.estimated_minutes || 15), 0)} mins
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Target size={14} /> Tasks: {plan.tasks.length}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <CheckCircle2 size={14} /> Completed: {Object.values(completedSteps).filter(Boolean).length} / {plan.tasks.length}
              </div>
            </div>
          </div>

          {/* Schedule Tasks */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-subtle)", fontWeight: 700, marginBottom: "0.75rem" }}>
              Today's Revision Agenda
            </h3>

            {plan.tasks.map((task) => {
              const isDone = !!completedSteps[task.step_number];
              const badge = getBadgeColor(task.task_type);

              return (
                <div 
                  key={task.step_number} 
                  className="plan-task-item"
                  style={{
                    opacity: isDone ? 0.6 : 1,
                    textDecoration: isDone ? "line-through" : "none",
                    borderColor: isDone ? "rgba(16,185,129,0.3)" : "var(--border-color)",
                    transition: "all 0.2s"
                  }}
                >
                  <input 
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggleStep(task.step_number)}
                    style={{ width: 18, height: 18, marginTop: "0.25rem", cursor: "pointer", accentColor: "#6366f1" }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                      <span className="task-badge" style={{ background: badge.bg, color: badge.text }}>
                        {task.task_type}
                      </span>
                      <strong style={{ fontSize: "0.95rem", color: "var(--text-main)" }}>
                        {task.topic}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: "0.2rem", marginLeft: "auto" }}>
                        <Clock size={12} /> {task.estimated_minutes}m
                      </span>
                    </div>

                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, textDecoration: "none" }}>
                      {task.action_detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center" }}>
            <button className="btn-secondary" onClick={onNavigateToWorkspace}>
              <BookOpen size={16} /> Open Notes in Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
